import React, { useMemo } from 'react'
import { BehaviorSubject } from 'rxjs'
import { showInfo } from '../../services/modal'
import { setToast } from '../../services/toast'
import chatClient from '../../utils/chatClient'
import {
    unsubscribe,
    useRxSubject,
    useUnmount
} from '../../utils/reactjs'
import {
    deferred,
    generateHash,
    getUrlParam,
    isAddress,
    isFn,
    isPositiveInteger,
    toArray
} from '../../utils/utils'
import { get as getIdentity, rxSelected } from '../identity/identity'
import { getAddressName } from '../partner/partner'
import { blocksToDuration, query as tkQuery } from '../timekeeping/timekeeping'
import { query, statusTexts } from './activity'

// todo: update cache storage whenever rxActivities changes
export const subjects = {}
export const rxForceUpdate = new BehaviorSubject() // identity
const s = {} // subscriptions
export const subscribe = (identity = rxSelected.value) => {
    if (!isAddress(identity)) return

    subjects[identity] ??= new BehaviorSubject()
    const countKey = `${identity}-count`
    s[countKey] ??= 0
    s[countKey]++
    let unsbuscribed = false
    const unsub = () => {
        unsbuscribed = true
        // no need to unsbuscrbe
        if (!isPositiveInteger(s[countKey])) return

        --s[countKey]
        // more listeners remains >> no ned to unsubscribe
        if (s[countKey] > 0) return

        // unsubscribe from 
        unsubscribe(s[identity])
        s[identity] = {}
    }
    const result = [subjects[identity], unsub]
    // another listener already activated subscriptions
    if (s[countKey] > 1) return result

    // first subscribe request >> subscribe to blockchain storage
    s[identity] ??= {}
    const isOwner = !!getIdentity(identity)
    const data = {
        activities: new Map(),
        activityIds: [],
        arrTotalBlocks: [],
        statusCodes: [],
    }
    const update = deferred(() => {
        if (unsbuscribed) return
        const {
            activities,
            activityIds,
            statusCodes,
            arrTotalBlocks,
        } = data
        const arrActivities = Array
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
                return [activityId, {
                    ...activity,
                    description: description || '',
                    ownerAddress: isOwner
                        ? identity
                        : ownerAddress,
                    isOwner: isOwner
                        || identity === ownerAddress
                        || getSelected().address === ownerAddress,
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
                }]
            })
        subjects[identity].next(new Map(arrActivities))
    }, 200)

    const handleActivityIds = async (activityIds = []) => {
        if (unsbuscribed) return
        if (!activityIds.length) return update()

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
        if (unsbuscribed) return
        data.activities = activities

        // Records that are not found in the off-chain database
        unknownIds.forEach(activityId =>
            activities.set(activityId, {})
        )

        // auto fetch status codes
        unsubscribe(s[identity].status)
        s[identity].status = query.status(
            activityIds,
            (statusCodes = []) => {
                data.statusCodes = statusCodes
                update()
            },
            true,
        )

        // auto fetch total blocks
        unsubscribe(s[identity].totalBlocks)
        s[identity].totalBlocks = tkQuery.project.totalBlocks(
            activityIds,
            (arrTotalBlocks = []) => {
                data.arrTotalBlocks = arrTotalBlocks
                update()
            },
            true,
        )

        // listen for and force update 
        unsubscribe(s[identity].forceUpdate)
        s[identity].forceUpdate = rxForceUpdate.subscribe(target => {
            if (target !== identity) return
            rxForceUpdate.next(null)
            // execute update of activity details from chat client after a slight delay
            setTimeout(
                () => handleActivityIds(data.activityIds, true),
                300
            )
        })
    }

    // first subscribe to retrieve list of activity IDs
    query
        .listByOwner(identity, handleActivityIds)
        .then(unsub => s[identity].listByOwner = unsub)

    return result
}

export default function useActivities(identity, subjectOnly = false) {
    identity ??= useRxSubject(rxSelected)[0]
    const [subject, unsubscribe] = useMemo(() => subscribe(identity) || [], [identity])
    // trigger unsubscribe onUnmount
    useUnmount(unsubscribe)
    if (subjectOnly) return subject

    const [activities] = useRxSubject(subject)


    return [activities, subject]
}

const DemoUseActivities = () => {
    const [activities] = useActivities()
    return (
        <div>
            {toArray(activities || new Map())
                .map((activity, i) => (
                    <div key={activity._id + i} style={{ whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(activity, null, 4)}
                        <br />
                    </div>
                ))}
            <div className='empty-message'>
                <center>No activities found</center>
            </div>
        </div>
    )
}

const showWIP = getUrlParam('wip') === 'yes'
showWIP && setTimeout(() => showInfo({
    content: <DemoUseActivities />,
    header: 'Demo Use Activities'
}))