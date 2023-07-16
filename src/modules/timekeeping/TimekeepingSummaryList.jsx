import React, { useEffect } from 'react'
import DataTable from '../../components/DataTable'
import { translated } from '../../utils/languageHelper'
import {
    statuses,
    unsubscribe,
    useRxState,
    useRxSubject,
} from '../../utils/reactjs'
import { isMap, isPositiveNumber } from '../../utils/utils'
import { rxSelected } from '../identity/identity'
import AddressName from '../partner/AddressName'
import {
    blocksToDuration,
    durationPreferences,
    query,
    rxDurtionPreference,
} from './timekeeping'
import useTkActivities from './useTKActivities'

const textsCap = {
    activity: 'activity',
    loading: 'loading...',
    owner: 'activity owner',
    percentage: 'percentage',
    noTimeRecords: 'you have not yet booked time on an activity',
    totalBlocks: 'total time in blocks',
    totalHours: 'total time in hours',
    unnamed: 'unnamed',
    yourContribution: 'how your time is divided',
}
translated(textsCap, true)

const TimekeepingSummaryList = React.memo(({
    identity = useRxSubject(rxSelected)[0],
    ...props
}) => {
    const [[
        activities = new Map(),
        activityIds
    ]] = useTkActivities({
        identity,
        includeOwned: false, // only fetch activities where user has accepted invitation
        valueModifier: (activities = new Map()) => [
            activities,
            Array
                .from(activities)
                .map(([id]) => id)
        ],
    })
    const [state, setState] = useRxState(() => ({
        columns: [
            {
                key: 'name',
                title: textsCap.activity,
                style: { minWidth: 125 }
            },
            {
                key: 'totalHours',
                textAlign: 'center',
                title: textsCap.totalHours,
            },
            // {
            //     key: 'totalBlocks',
            //     textAlign: 'center',
            //     title: textsCap.totalBlocks,
            // },
            {
                key: 'percentage',
                textAlign: 'center',
                title: textsCap.yourContribution,
            },
            {
                collapsing: true,
                content: x => <AddressName address={x?.ownerAddress} />,
                key: 'ownerAddress',
                style: { padding: '0 15px ' },
                title: textsCap.owner,
            }
        ],
        emptyMessage: {
            content: textsCap.loading,
            icon: true,
            status: statuses.LOADING,
        },
        searchable: false,
    }))
    const [preference] = useRxSubject(
        rxDurtionPreference,
        p => durationPreferences.blocks === p
            ? durationPreferences.hhmmss
            : p
    )
    const { totalBlocksMap } = state

    // subscribe and fetch the total number of blocks user submitted and were accepted
    useEffect(() => {
        let mounted = true
        const subs = {}
        const ids = [...activityIds || []]
        subs.totalBlocks = !!identity
            && !!ids.length
            && query
                .worker
                .totalBlocksByActivity(
                    ids.map(() => identity),
                    ids,
                    totalBlocksArr => setState({
                        totalBlocksMap: new Map(
                            totalBlocksArr
                                .map((totalBlocks, i) => [ids[i], totalBlocks])
                        )
                    }),
                    true,
                )

        return () => {
            mounted = false
            unsubscribe(subs)
        }
    }, [identity, activityIds])

    // calculate percentage etc and populate table data
    useEffect(() => {
        if (!isMap(totalBlocksMap)) return

        const sumTotalBlocks = Array
            .from(totalBlocksMap)
            .reduce((sum, [_, next]) => sum + next, 0)
        const data = Array
            .from(totalBlocksMap)
            .map(([activityId, totalBlocks]) => {
                const activity = activities.get(activityId)
                if (!activity) return

                const {
                    isOwner,
                    name = textsCap.unnamed,
                    ownerAddress
                } = activity
                const totalHours = blocksToDuration(totalBlocks, preference)
                const n = totalBlocks * 100 / sumTotalBlocks
                const percentage = `${(isPositiveNumber(n) ? n : 0).toFixed(1)}%`
                return {
                    activityId,
                    isOwner,
                    name: name || textsCap.unnamed,
                    ownerAddress,
                    percentage,
                    totalBlocks,
                    totalHours,
                }
            })
            .filter(Boolean)

        setState({
            arrTotalBlocks: totalBlocksMap,
            data,
            emptyMessage: {
                content: textsCap.noTimeRecords,
                status: 'warning',
            },
        })
    }, [totalBlocksMap, preference])

    return <DataTable {...{ ...props, ...state }} />
})
export default TimekeepingSummaryList