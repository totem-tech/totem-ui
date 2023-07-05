import { useMemo } from 'react'
import { BehaviorSubject } from 'rxjs'
import { setToast } from '../../services/toast'
import chatClient from '../../utils/chatClient'
import {
    unsubscribe,
    useRxSubject,
    useUnmount
} from '../../utils/reactjs'
import storage from '../../utils/storageHelper'
import {
    deferred,
    isAddress,
    isFn,
} from '../../utils/utils'
import { get as getIdentity, rxSelected } from '../identity/identity'
import { getAddressName } from '../partner/partner'
import {
    blocksToDuration,
    rxDurtionPreference,
    query as tkQuery
} from '../timekeeping/timekeeping'
import { query, statusTexts } from './activity'

// RxJS BehaviorSubjects for each identity that is being requested
const subjects = {}
// RxJS subject to trigger update of activity details for both activities and timekeeping modules
// Expected value: identity
export const rxForceUpdate = new BehaviorSubject()
// unsubscribe functions and extra info relating to identities
const subscriptions = {}
export const types = {
    activities: 'projects',// for compatibility with legacy storage keys
    timekeeping: 'timekeeping',
}
const typesFuncs = {
    // function to subscribe & fetch list of activity IDs
    // args: identity, callback
    [types.activities]: query.listByOwner,
    [types.timekeeping]: tkQuery.worker.listWorkerProjects,
}

/**
 * @name    subscribe
 * @summary subscribe and fetch activities and details from both on-chain and off-chain
 * 
 * @param   {Sting} identity    (optional) user identity.
 *                              Default: selected identity from the identities module
 * @param   {Sting} type        (optional) type of activity (see `types`).
 *                              Default: `activities`
 * 
 * @returns {Array} [BehaviorSubject, Function (unsubscribe)]
 */
export const subscribe = (identity, type, save = false) => {
    identity ??= rxSelected.value
    const fetchActivityIds = typesFuncs[type] || typesFuncs[types.activities]
    if (!isAddress(identity) || !isFn(fetchActivityIds)) return

    const moduleKey = types[type] || types.activities
    const itemKey = `${moduleKey}-${identity}`
    const isOwner = !!getIdentity(identity)
    subjects[itemKey] ??= new BehaviorSubject(
        new Map(
            storage.cache(
                moduleKey,
                itemKey
            )
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
    if (subscription.count > 1) return result

    const data = {
        activities: null,
        activityIds: null,
        arrTotalBlocks: [],
        statusCodes: [],
    }
    // once all data has been retrieved process it and update the subject
    const updateSubject = deferred(() => {
        if (unsubscribed) return
        const {
            activities,
            activityIds,
            statusCodes,
            arrTotalBlocks,
        } = data
        if (!activities || !activityIds) return
        const arr2D = Array
            .from(activities)
            .map(([activityId, activity]) => {
                const index = activityIds.indexOf(activityId)
                activity.status = statusCodes[index]

                const {
                    description,
                    name,
                    ownerAddress,
                    status,
                } = activity
                // exclude deleted/legacy project
                if (status === null) return

                const totalBlocks = arrTotalBlocks[index] || 0
                return [
                    activityId,
                    {
                        ...activity,
                        description: description || '',
                        ownerAddress,
                        isOwner,
                        name: name || '',
                        ownerName: getAddressName(
                            ownerAddress,
                            false,
                            false
                        ),
                        totalBlocks,
                        _statusText: statusTexts[status] || statusTexts.unknown,
                        // convert to duration HH:MM:SS
                        _totalTime: blocksToDuration(totalBlocks)
                    }
                ]
            })
        subject.next(new Map(arr2D))

        // write to cached storage
        save && storage.cache(
            moduleKey,
            itemKey,
            arr2D,
        )
    }, 50)

    // once activity IDs are received fetch off-chain information from messaging service 
    // and other information from blockchain
    const handleActivityIds = async (activityIds = []) => {
        if (unsubscribed) return
        if (!activityIds.length) return updateSubject()

        data.activityIds = activityIds
        // fetch activities from messaging service
        const [activities = new Map(), unknownIds = []] = await chatClient
            .projectsByHashes(activityIds)
            .catch(err => {
                setToast({
                    content: err,
                    status: 'error',
                })
                return []
            })
        if (unsubscribed) return
        data.activities = activities

        // Records that are not found in the off-chain database
        unknownIds.forEach(activityId =>
            activities.set(activityId, {})
        )

        // auto fetch status codes
        unsubscribe(subscription.status)
        subscription.status = query.status(
            activityIds,
            (statusCodes = []) => {
                data.statusCodes = statusCodes
                updateSubject()
            },
            true,
        )

        // auto fetch total blocks
        unsubscribe(subscription.totalBlocks)
        subscription.totalBlocks = tkQuery.project.totalBlocks(
            activityIds,
            (arrTotalBlocks = []) => {
                data.arrTotalBlocks = arrTotalBlocks
                updateSubject()
            },
            true,
        )

        // listen for and force update
        unsubscribe(subscription.forceUpdate)
        subscription.forceUpdate = rxForceUpdate.subscribe(target => {
            if (unsubscribed || target !== identity) return
            rxForceUpdate.next(null)
            // execute update of activity details from chat client after a slight delay
            handleActivityIds(data.activityIds, true)
        })

        // listen for and update whenever duration display preferences changes
        unsubscribe(subscription.durationPreference)
        subscription.durationPreference = rxDurtionPreference.subscribe(updateSubject)
    }

    // first subscribe to retrieve list of activity IDs
    fetchActivityIds(identity, handleActivityIds)
        .then(unsub => subscription.listByOwner = unsub)

    return result
}

/**
 * 
 * @param   {Boolean}   subjectOnly     (optional) if truthy, will return the RxJS subject without subscribing to it.
 *                                      Default: `false`
 * @param   {Function}  valueModifier   (optional)
 * @param   {String}    identity        (optional) Default: selected identity from identities module
 * @param   {String}    type            (optional) Default: `'activities'` (See `types` for all available options)
 * 
 * @returns {BehaviorSubject|Array} if subjectOnly, `BehaviorSubject`. Otherwise, `[Map, BehaviorSubject, Function]`
 */
const useActivities = ({
    identity,
    subjectOnly = false,
    valueModifier,
} = {}) => {
    identity ??= useRxSubject(rxSelected)[0]
    const [subject, unsubscribe] = useMemo(
        () => subscribe(identity) || [],
        [identity]
    )
    // trigger unsubscribe onUnmount
    useUnmount(unsubscribe)
    if (subjectOnly) return subject

    const [activities] = useRxSubject(subject, valueModifier)

    return [activities, subject, unsubscribe]
}
export default useActivities