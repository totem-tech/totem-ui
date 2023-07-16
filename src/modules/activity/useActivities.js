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
    deferred,
    isArr,
    isFn,
    isStr,
} from '../../utils/utils'
import { get as getIdentity, rxSelected } from '../identity/identity'
import { getAddressName } from '../partner/partner'
import {
    blocksToDuration,
    rxDurtionPreference,
    query as tkQuery
} from '../timekeeping/timekeeping'
import { query, statusTexts } from './activity'
import { translated } from '../../utils/languageHelper'

const textsCap = {
    loading: 'loading...',
    unnamedActivity: 'unnamed activity',
}
translated(textsCap, true)
// RxJS BehaviorSubjects for each identity that is being requested
const subjects = {}
// RxJS subject to trigger update of activity details for both activities and timekeeping modules
// Expected value: identity
export const rxForceUpdate = new BehaviorSubject()
// unsubscribe functions and extra info relating to identities
const subscriptions = {}
export const types = {
    activities: 'projects',// for compatibility with legacy storage keys
    activityIds: 'activityIds',
    timekeeping: 'timekeeping',
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
 * @param   {String|String[]}   activityId
 * @param   {Function}          modifier    (optional)
 * 
 * @returns {Object|Map|*}  activity|activities|result from modifier
 */
export const fetchById = async (activityId, modifier) => {
    const [subject, unsubscribe] = subscribe(
        activityId,
        types.activityIds,
        false
    )
    const activities = await subjectAsPromise(
        subject,
        (activities = new Map()) => !!activities.loaded
    )[0]

    unsubscribe?.()

    if (isFn(modifier)) return modifier(activities, activityId)

    return !isArr(activityId)
        ? activities.get(activityId)
        : new Map(
            activityId.map(id => [
                id,
                activities.get(id)
            ])
        )
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
 * 
 * ToDo: listen to bonsai token changes and update off-chain activity data automatically. Remove onActivity????
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
    subjects[itemKey] ??= new BehaviorSubject(
        new Map(
            !save
                ? undefined
                : storage.cache(moduleKey, itemKey)
        )
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

    const data = {
        activities: null,
        activityIds: null,
        totalBlocks: null,
        statusCodes: null,
    }
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

        const loaded = !!activities || !activityIds.length
        // in case messaging service request takes longer or fails.
        activities = new Map(
            activityIds.map(id => [
                id,
                activities.get(id) || { name: textsCap.loading }
            ])
        )

        // merge off-chain and on-chain data of each activity
        const mergeData = ([activityId, activity]) => {
            const status = statusCodes.get(activityId)
            activity.status = status

            const {
                description,
                name,
                ownerAddress,
            } = activity
            // exclude deleted/legacy project
            if (status === null) return

            const blocks = totalBlocks.get(activityId) || 0
            return [
                activityId,
                {
                    ...activity,
                    description: description || '',
                    isOwner: !!getIdentity(ownerAddress),
                    name: name || textsCap.unnamedActivity,
                    ownerAddress,
                    ownerName: getAddressName(
                        ownerAddress,
                        false,
                        false
                    ),
                    totalBlocks: blocks,
                    _statusText: statusTexts[status] || statusTexts.unknown,
                    // convert to duration HH:MM:SS
                    _totalTime: blocksToDuration(blocks)
                }
            ]
        }
        const result = new Map(
            Array
                .from(activities)
                .map(mergeData)
        )
        result.loaded = loaded
        subject.next(result)

        // write to cached storage
        save && storage.cache(
            moduleKey,
            itemKey,
            result,
        )
    }, defer)

    const handleActivityReceived = (activityId, activity) => {
        if (unsubscribed || !data.activityIds?.includes(activityId)) return

        data.activities?.set(activityId, activity)
        updateSubject()
    }

    // fetch activities from messaging service
    const fetchOffChainData = deferred(async () => {
        const { activityIds } = data
        if (unsubscribed || !activityIds) return

        subscription.onActivity ??= chatClient.onActivity(handleActivityReceived)
        if (!activityIds.length) {
            // identity hasn't created any activities yet
            data.activities = new Map()
            data.statusCodes = new Map()
            data.totalBlocks = new Map()
            return updateSubject()
        }
        const activities = await chatClient
            .projectsByHashes(activityIds)
            .then(([activities = new Map(), unknownIds = []]) => {
                // Records that are not found in the off-chain database
                unknownIds.forEach(activityId =>
                    activities.set(
                        activityId,
                        { name: textsCap.unnamedActivity }
                    )
                )
                return activities
            })
            .catch(err => {
                const result = new Map()
                result.error = err
                return result
            })
        if (unsubscribed) return
        data.activities = activities

        updateSubject()
    }, 1000)

    // once activity IDs are received fetch off-chain information from messaging service 
    // and other information from blockchain
    const handleActivityIds = deferred((activityIds = []) => {
        if (unsubscribed) return

        activityIds = activityIds
            .flat()
            .filter(Boolean)
        data.activityIds = activityIds

        // listen for and udpate activity details from messaging service
        unsubscribe(subscription.forceUpdate)
        subscription.forceUpdate = rxForceUpdate.subscribe(value => {
            const ignore = unsubscribed
                || !value
                || identity !== value
                || isArr(identity) && !identity.includes(value)
            if (ignore) return

            rxForceUpdate.next(null)
            fetchOffChainData()
        })

        // listen for and update whenever duration display preferences changes
        unsubscribe(subscription.durationPreference)
        subscription.durationPreference = rxDurtionPreference.subscribe(updateSubject)

        // fetch title, description etc. from messaging service
        fetchOffChainData()

        if (!activityIds.length) return

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
    identity,
    subjectOnly = false,
    type,
    valueModifier,
} = {}) => {
    if (!activityIds) identity ??= useRxSubject(rxSelected)[0]
    const rxActivities = useMemo(() => new BehaviorSubject(new Map()), [])
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