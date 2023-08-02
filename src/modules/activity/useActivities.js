import { useMemo } from 'react'
import { BehaviorSubject } from 'rxjs'
import chatClient from '../../utils/chatClient'
import {
    subjectAsPromise,
    unsubscribe,
    useRxSubject,
    useUnsubscribe
} from '../../utils/reactjs'
import storage from '../../utils/storageHelper'
import {
    arrUnique,
    deferred,
    isArr,
    isFn,
    isSubjectLike,
} from '../../utils/utils'
import { get as getIdentity, rxSelected } from '../identity/identity'
import { getAddressName } from '../partner/partner'
import {
    blocksToDuration,
    MODULE_KEY as tkCacheKey,
    query as tkQuery,
    rxDurtionPreference,
} from '../timekeeping/timekeeping'
import {
    MODULE_KEY as activityCacheKey,
    query,
    statusTexts
} from './activity'
import { translated } from '../../utils/languageHelper'
import { rxOnline } from '../../utils/window'

const textsCap = {
    loading: 'loading...',
    unnamedActivity: 'unnamed activity',
}
translated(textsCap, true)

// RxJS subject to trigger update of activity details for both activities and timekeeping modules
// Expected value: identity
export const rxForceUpdate = new BehaviorSubject()
// RxJS BehaviorSubjects for each identity that is being requested
const subjects = {}
// unsubscribe functions and extra info relating to identities
const subscriptions = {}
export const types = {
    activities: activityCacheKey,// 'projects' for compatibility with legacy storage keys
    activityIds: 'activityIds',
    timekeeping: tkCacheKey, //'timekeeping',
}
// function to subscribe & fetch list of activity IDs
// args: identity, callback
const typesFuncs = {
    // this type allows retrieving activities by given IDs (without subscribing to an a storage for list of IDs).
    [types.activityIds]: (activityIds = [], callback) => {
        callback(
            !isArr(activityIds)
                ? [activityIds].filter(Boolean)
                : activityIds
        )
    },
    [types.activities]: query.listByOwner,
    [types.timekeeping]: tkQuery.worker.listWorkerActivities,
}

/**
 * @name    fetchById
 * @summary fetch activity by ID(s)
 * 
 * @param   {String|String[]} activityId
 * @param   {Object}          options
 * @param   {Function}        options.modifier        (optional) args: Map/Object 
 * @param   {String}          options.ownerAddress    (optional)
 * @param   {String}          options.workerAddress   (optional)
 * 
 * @returns {Object|Map|*}  activity|activities|result from modifier
 */
export const fetchById = async (
    activityId,
    {
        modifier,
        ownerAddress,
        workerAddress
    } = {}
) => {
    const [rxActivities, unsubscribe] = subscribe(
        ownerAddress || workerAddress || activityId,
        ownerAddress
            ? types.activities
            : workerAddress
                ? types.timekeeping
                : types.activityIds,
        false
    )
    const activities = await subjectAsPromise(
        rxActivities,
        activities => !activities
            ? false
            : !rxOnline.value
                ? true // allow use of cache when off line
                : !!activities.loaded
    )[0]

    // prevent receiving updates
    unsubscribe?.()

    const result = !isArr(activityId)
        ? activities.get(activityId)
        : new Map(
            activityId.map(id => [
                id,
                activities.get(id)
            ])
        )

    return isFn(modifier)
        ? modifier(result)
        : result
}

/**
 * @name    subscribe
 * @summary subscribe and fetch activities and details from both on-chain and off-chain
 * 
 * @param   {Sting|Array} identity  (optional) identity or activityIds (if type is `types.activity`).
 *                                  Default: selected identity from the identities module
 * @param   {Sting}       type      (optional) type of activity (see `types`).
 *                                  Default: `activities`  (activities.loaded indicates all required data loaded)
 * 
 * @returns {Array} [BehaviorSubject, Function (unsubscribe)]
 */
export const subscribe = (
    identity,
    type = types.activities,
    save = false,
    defer = 300,
) => {
    identity ??= type !== types.activityIds && rxSelected.value
    const fetchActivityIds = typesFuncs[type] || typesFuncs[types.activities]
    // prevent saving result for this type of subscriptions
    if (type === types.activityIds || isArr(identity)) save = false
    if (!identity || !isFn(fetchActivityIds)) return

    const moduleKey = types[type] || types.activities
    const itemKey = `${moduleKey}-${identity}`
    const data = {
        activities: !save
            ? null
            : new Map(
                storage.cache(moduleKey, itemKey)
            ),
        activityIds: null,
        totalBlocks: null,
        statusCodes: null,
    }
    subjects[itemKey] ??= new BehaviorSubject(
        data.activities || new Map()
    )
    subscriptions[itemKey] ??= {}
    const subject = subjects[itemKey]
    const subscription = subscriptions[itemKey]
    subscription.count ??= 0
    subscription.count++
    let unsubscribed = false
    const unsub = () => {
        // already unsubscribed
        if (unsubscribed) return

        unsubscribed = true
        --subscription.count
        // other subscribers still listensing >> no need to unsubscribe
        if (subscription.count > 0) return

        // unsubscribe from 
        unsubscribe(subscription)
        subscriptions[itemKey] = {}
    }
    const result = [subject, unsub]
    // another listener already activated subscription for this identity.
    // the returned subject will be automatically updated for all listeners of this identity.
    if (subscription.count > 1) result

    // once all data has been retrieved process it and update the subject
    const updateSubject = deferred(async () => {
        let {
            activities,
            activityIds,
            statusCodes,
            totalBlocks,
        } = data
        const ignore = unsubscribed
            || !activityIds
            || !statusCodes
            || !totalBlocks
            || !activities
        if (ignore) return

        const loaded = !!activities
        let resultArr = []
        const ownerAddr = types.activities === type
            && !isArr(identity)
            && identity
        for (const activityId of activityIds) {
            // in case messaging service request takes longer or fails.
            const activity = activities.get(activityId) || {
                name: !loaded
                    ? textsCap.loading
                    : textsCap.unnamedActivity,
                // fetch owner address when type is `types.activityIds` or off-chain data not available
                ownerAddress: ownerAddr || await query.getOwner(activityId) || ''
            }
            const status = statusCodes.get(activityId)
            activity.status = status

            const {
                description,
                name,
                ownerAddress = '',
            } = activity
            // exclude deleted/legacy project
            if (status === null) return

            const blocks = totalBlocks.get(activityId) || 0
            resultArr.push([
                activityId,
                {
                    ...activity,
                    description: description || '',
                    isOwner: !!ownerAddr || !!getIdentity(ownerAddress),
                    name: name || textsCap.unnamedActivity,
                    ownerAddress,
                    ownerName: !ownerAddress
                        ? ''
                        : getAddressName(
                            ownerAddress,
                            false,
                            false
                        ),
                    totalBlocks: blocks,
                    _statusText: statusTexts[status] || statusTexts.unknown,
                    // convert to duration HH:MM:SS
                    _totalTime: blocksToDuration(blocks)
                }
            ])
        }
        const result = new Map(resultArr)
        result.loaded = loaded
        subject.next(result)

        // write to cached storage
        save && storage.cache(
            moduleKey,
            itemKey,
            result,
        )
    }, defer)

    // fetch activities from messaging service
    const fetchOffChainData = deferred(async () => {
        const { activityIds } = data
        if (unsubscribed || !activityIds) return

        if (!activityIds.length) {
            // identity hasn't created any activities yet
            data.activities = new Map()
            data.statusCodes = new Map()
            data.totalBlocks = new Map()
            return updateSubject()
        }
        const activities = await chatClient
            .projectsByHashes(activityIds)
            .catch(err => {
                const result = new Map()
                result.error = err
                return result
            })
        const arr = Array
            .from(activities)
            .map(([id, activity]) => [
                id,
                {
                    // merge with cached/previous data
                    ...data.activities?.get?.(id),
                    ...activity
                }
            ])
        data.activities = new Map(arr)

        updateSubject()
    }, 1000)

    // once activity IDs are received fetch off-chain information from messaging service 
    // and other information from blockchain
    const handleActivityIds = deferred((activityIds = []) => {
        if (unsubscribed) return

        activityIds = activityIds
            .flat()
            .filter(Boolean)
        const activityIdsOld = data.activityIds
        data.activityIds = activityIds


        // listen for and udpate activity details from messaging service
        subscription.forceUpdate ??= rxForceUpdate.subscribe(value => {
            const ignore = unsubscribed
                || !value
                || identity !== value
                || isArr(identity) && !identity.includes(value)
            if (ignore) return

            rxForceUpdate.next(null)
            fetchOffChainData()
        })

        // listen for and update whenever duration display preferences changes
        subscription.durationPreference ??= rxDurtionPreference.subscribe(updateSubject)

        // fetch title, description etc. from messaging service
        fetchOffChainData()

        // prevent re-subscribing for the same IDs
        const toStr = (arr = []) => arrUnique(arr)
            .sort()
            .join('')
        const changed = toStr(activityIdsOld) != toStr(activityIds)
        if (!changed) return

        // subscription.bonsai ??= queryBlockchain('api.query.bonsai.isValidRecord', [activityIds, result => console.warn({ activityIds, result })], true,)

        // auto fetch status codes
        unsubscribe(subscription.status)
        subscription.status = query.status(
            activityIds,
            (statusCodes = []) => {
                data.statusCodes = new Map(
                    statusCodes.map((code, i) =>
                        [activityIds[i], code]
                    )
                )
                updateSubject()
            },
            true,
        )

        // auto fetch total blocks
        unsubscribe(subscription.totalBlocks)
        subscription.totalBlocks = tkQuery.activity.totalBlocks(
            activityIds,
            (arrTotalBlocks = []) => {
                data.totalBlocks = new Map(
                    arrTotalBlocks.map((totalBlocks, i) =>
                        [activityIds[i], totalBlocks]
                    )
                )
                updateSubject()
            },
            true,
        )
    }, defer)

    // first subscribe to retrieve list of activity IDs
    fetchActivityIds(
        identity,
        handleActivityIds,
        isArr(identity)
    )?.then?.(unsub => subscription.listByOwner = unsub)

    // listen for changes in activity details and update UI accordingly
    subscription.onCRUD ??= chatClient.onCRUD(async ({ data: activity, id, type } = {}) => {
        const ignore = unsubscribed
            || type !== 'project'
            || !data.activityIds?.includes(id)
            || !data.activities
        if (ignore) return

        // in-case activity is not  sent from backend
        activity ??= await chatClient.project(id)
        data.activities.set(id, activity)
        updateSubject()
    })

    return result
}

/**
 * @name    useActivities
 * @summary subscribe and fetch user owned activities
 * 
 * @param   {Object}    p               (optional) preferences
 * @param   {String}    p.identity      (optional) user identity
 *                                      Default: selected identity from identities module
 * @param   {Boolean}   p.subjectOnly   (optional) if truthy, will return the RxJS subject without subscribing to it.
 *                                      Default: `false`
 * @param   {Function}  p.valueModifier (optional)
 * @param   {String}    p.type          (optional) Default: `'activities'` (See `types` for all available options)
 * 
 * @returns {[
 *  Map<String, object>,
 *  BehaviorSubject,
 *  Function
 * ]|BehaviorSubject} if `subjectOnly` is truthy, rxActivities. 
 *                                      Otherwise, [activities, rxActivities, unsubscribe]
 */
const useActivities = ({
    activityIds,
    identity,// = !activityIds ? rxSelected : undefined,
    subject,
    subjectOnly = false,
    type,
    valueModifier,
} = {}) => {
    const rxActivities = useMemo(
        () => isSubjectLike(subject)
            ? subject
            : new BehaviorSubject(new Map()),
        [subject]
    )

    if (!activityIds) identity ??= useRxSubject(rxSelected)[0]
    const [unsubscribe, subscription] = useMemo(() => {
        const [currentSubject, unsubscribe1] = subscribe(
            activityIds || identity,
            type
        ) || []
        // currentSubject will change based on identity, activityIds and type.
        // copy values from the current subject to rxActivities
        const subscription = currentSubject?.subscribe(value =>
            rxActivities.next(value)
        )
        return [unsubscribe1, subscription]
    }, [activityIds, identity, type])
    // trigger unsubscribe onUnmount
    useUnsubscribe([unsubscribe, subscription])
    if (subjectOnly) return rxActivities

    const [activities] = useRxSubject(rxActivities, valueModifier)

    return [
        activities,
        rxActivities,
        unsubscribe,
    ]
}
export default useActivities