import React, { useCallback, useEffect } from 'react'
import { iUseReducer, useRxSubject } from '../../utils/reactHelper'
import { isArr } from '../../utils/utils'
import DataTable from '../../components/DataTable'
import { statuses } from '../../components/Message'
import { translated } from '../../services/language'
import { unsubscribe } from '../../services/react'
import { rxSelected } from '../identity/identity'
import {
    blocksToDuration,
    durationPreferences,
    getProjects,
    query,
    rxDurtionPreference,
} from './timekeeping'

const textsCap = translated({
    activity: 'activity',
    loading: 'loading...',
    percentage: 'percentage',
    noTimeRecords: 'you have not yet booked time on an activity',
    totalBlocks: 'total time in blocks',
    totalHours: 'total time in hours',
    yourContribution: 'how your time is divided',
    unnamed: 'unnamed',
}, true)[1]

const TimekeepingSummaryList = () => {
    const [state, setState] = iUseReducer(null, {
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
            }
        ],
        emptyMessage: {
            content: textsCap.loading,
            icon: true,
            status: statuses.LOADING,
        },
        searchable: false,
    })
    const [address] = useRxSubject(rxSelected)
    const [preference] = useRxSubject(rxDurtionPreference, p => 
        durationPreferences.blocks === p
            ? durationPreferences.hhmmss
            : p
    )
    const { arrTotalBlocks } = state

    useEffect(() => {
        let mounted = true
        const subs = {}
        const doSubscribe = async () => {
            const activities = await getProjects()
            const activityIds = Array
                .from(activities)
                .map(([id]) => id)
            // unsubscribe from existing subscription
            subs.totalBlocks = query.worker.totalBlocksByProject(
                activityIds.map(() => address),
                activityIds, // for multi query needs to be a 2D array of arguments
                arrTotalBlocks => {
                    setState({arrTotalBlocks})
                },
                true,
            )
        }
        !!address && doSubscribe()

        return () => {
            mounted = false
            unsubscribe(subs)
        } 
    }, [address])

    useEffect(() => {
        isArr(arrTotalBlocks) && getProjects()
            .then(activities => {
                const activityIds = Array
                    .from(activities)
                    .map(([id]) => id)
                const sumTotalBlocks = arrTotalBlocks
                    .reduce((sum, next) => sum + next, 0)
                const data = arrTotalBlocks.map((totalBlocks, i) => ({
                    name: activities
                        .get(activityIds[i])
                        .name
                        || textsCap.unnamed,
                    totalBlocks,
                    totalHours: blocksToDuration(
                        totalBlocks,
                        preference,
                    ),
                    percentage: totalBlocks === 0
                        ? '0%'
                        : (totalBlocks * 100 / sumTotalBlocks)
                            .toFixed(0) + '%',
                }))
                setState({
                    arrTotalBlocks,
                    data,
                    emptyMessage: {
                        content: textsCap.noTimeRecords,
                        status: 'warning',
                    },
                })
            })
        
    }, [arrTotalBlocks, preference])

    return <DataTable {...state} />
}

export default React.memo(TimekeepingSummaryList)