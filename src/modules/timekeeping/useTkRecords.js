import { useMemo } from 'react'
import { BehaviorSubject } from 'rxjs'
import { rxBlockNumber } from '../../services/blockchain'
import {
    subjectAsPromise,
    unsubscribe,
    useRxSubject,
    useUnsubscribe
} from '../../utils/reactjs'
import { blockToDate } from '../../utils/time'
import { deferred, isArr } from '../../utils/utils'
import { rxSelected } from '../identity/identity'
import {
    MODULE_KEY,
    blocksToDuration,
    query,
    rxDurtionPreference,
    statuses
} from './timekeeping'
import { subscribe as subscribeTkActivities } from './useTKActivities'

const subjects = {}
const subscriptions = {}

export const subscribe = ({
    manage = false,
    archive = false,
    activityId,
    identity = rxSelected.value,
    save = false,
}) => {
    if (!activityId && !identity) return
    // prevent saving cache if 
    if (isArr(identity) || isArr(activityId)) save = false

    const itemKey = [
        'records',
        `${manage ? 0 : 1}${archive ? 0 : 1}`,
        identity,
        activityId,
    ]
        .flat()
        .filter(Boolean)
        .join('_')

    const rwCache = value => storage.cache(
        MODULE_KEY,
        itemKey,
        value
    )
    subjects[itemKey] ??= new BehaviorSubject(
        new Map(
            // load cached items
            !save
                ? undefined
                : rwCache()
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

        unsubscribe(subscription)
        subscriptions[itemKey] = {}
    }
    const result = [subject, unsub]
    // another listener already activated subscription for this identity.
    // the returned subject will be automatically updated for all listeners of this identity.
    if (subscription.count > 1) return result

    const data = {}
    const handleRecords = async (newRecords) => {
        let {
            activities,
            recordIds,
            records
        } = data
        records = newRecords || records
        // ignore if already unsubscribed or not all data has been retrieved yet
        const ignore = unsubscribed
            || !records
            || !activities
            || !recordIds
        if (ignore) return false

        data.records = records
        const currentBlock = await subjectAsPromise(rxBlockNumber, x => x > 0)[0]
        // due to connection delay or some other reason block number received after subscriber unsubscribed
        if (unsubscribed) return

        const result = new Map(
            records.map((record, i) => {
                // records no longer available in the blockchain storage
                if (!record) return

                const {
                    end_block,
                    project_hash: activityId,
                    start_block,
                    submit_status,
                    total_blocks,
                    worker,
                } = record
                const recordId = recordIds[i]
                const activity = activities.get(activityId)
                const { name, ownerAddress } = activity || {}

                return [
                    recordId,
                    {
                        ...record,
                        // status
                        approved: submit_status === statuses.accept,
                        rejected: submit_status === statuses.reject,
                        draft: submit_status === statuses.draft,
                        // acitivity info
                        activityId,
                        activityName: name || '',
                        activityOwnerAddress: ownerAddress,
                        // extra info
                        duration: blocksToDuration(total_blocks),
                        hash: recordId, // unused????
                        workerAddress: worker || '',// redundant ??// && ss58Encode(worker) || '',
                        _end_block: blockToDate(end_block, currentBlock),
                        _start_block: blockToDate(start_block, currentBlock),
                    }
                ]
            }).filter(Boolean)
        )

        save && rwCache(result)
        result.loaded = true
        subject.next(result)
    }
    const handleRecordIds = (recordIds = []) => {
        if (unsubscribed) return

        // flatten the array, in case, records are being retrieved for multiple activities at the same time
        data.recordIds = recordIds.flat()
        unsubscribe(subscription.records)
        subscription.records = query.record.get(
            data.recordIds,
            handleRecords,
            true
        )
    }

    // listen for changes in the duration preferences and auto update record duration
    unsubscribe(subscription.pref)
    subscription.pref = rxDurtionPreference.subscribe(() => handleRecords())

    // subscribe and fetch recordIds based on preference
    const handleActivities = deferred((activities = new Map()) => {
        if (unsubscribed) return

        data.activities = activities
        const target = !manage
            ? identity
            : activityId || Array
                .from(activities)
                .map(([id, { isOwner }]) => isOwner && id)
                .filter(Boolean)
        const alreadySubscribed = JSON.stringify(data.target) === JSON.stringify(target)
        // prevent unsubscribing and resubscribing for the same target (activityIds/identities)
        if (alreadySubscribed) return

        data.target = target
        unsubscribe(subscription.recordIds)
        const qr = query.record
        const queryFn = archive
            ? manage
                ? qr.listByActivityArchive
                : qr.listArchive
            : manage
                ? qr.listByActivity
                : qr.list
        // window.query = {
        //     qr,
        //     queryFn,
        //     target,
        //     multi: isArr(target)
        // }
        // Retrieve list(s) of records either by identity or activity.
        // Target can be either a single idenity or activity, or an array of identities or activities.
        subscription.recordIds = queryFn(
            target, // either identity/activity
            handleRecordIds,
            isArr(target)
        )

        return result
    }, 100)

    // subscribe and fetch relevant activities
    unsubscribe(subscription.tkActivities)
    unsubscribe(subscription.unsubTkActivities)
    const [rxTkActivities, unsubTkActivities] = subscribeTkActivities(identity, true)
    subscription.unsubTkActivities = unsubTkActivities
    subscription.tkActivities = rxTkActivities.subscribe(handleActivities)

    return result
}

/**
 * @name    useTkRecords
 * @summary React hook to subscribe to and fetch timekeeping records
 * @param {*} param0 
 * @returns 
 */
const useTkRecords = ({
    activityId,
    archive,
    identity = useRxSubject(rxSelected)[0],
    manage,
    subjectOnly = false,
    valueModifier,
}) => {
    const rxRecords = useMemo(() => new BehaviorSubject(new Map()), [])
    const changeTriggers = [
        manage,
        archive,
        activityId,
        identity
    ]
    const [unsubscribe, subscription] = useMemo(() => {
        const [currentSubject, unsubscribe] = subscribe({
            manage,
            archive,
            activityId,
            identity,
        }) || []
        const subscription = currentSubject?.subscribe(
            value => rxRecords.next(value)
        )
        return [
            unsubscribe,
            subscription,
        ]
    }, changeTriggers)

    // unsubscribe from subscriptions
    useUnsubscribe([unsubscribe, subscription])

    if (subjectOnly) return rxRecords

    const [records] = useRxSubject(rxRecords, valueModifier)

    return [
        records,
        rxRecords,
        unsubscribe,
        identity
    ]
}
export default useTkRecords