import { useEffect, useState } from 'react'
import { rxIsLoggedIn, rxIsRegistered } from '../../utils/chatClient'
import { subjectAsPromise, unsubscribe } from '../../utils/reactHelper'
import { isObj } from '../../utils/utils'
import { query } from './task'
import { addDetailsToTask, processOrder } from './useTasks'

export default function useTask(taskId, updateTrigger) {
    const [data, setData] = useState({
        error: null,
        task: null,
    })

    useEffect(() => {
        if (!taskId) return () => { }
        let mounted = true
        const handleResult = async order => {
            if (!isObj(order)) return
            let error
            try {
                order = processOrder(order, taskId)

                // wait until user is logged in
                rxIsRegistered.value &&
                    await subjectAsPromise(rxIsLoggedIn, true)[0]
                // fetch off-chain details
                const detailsMap = await query.getDetailsByTaskIds([taskId])
                order = addDetailsToTask(
                    order,
                    detailsMap.get(taskId) || {},
                )
            } catch (err) {
                error = err
            } finally {
                mounted && setData({
                    error: `${error || ''}`.replace('Error: ', ''),
                    task: order,
                })
            }
        }
        const sub = query.orders(
            taskId,
            handleResult,
            false,
        )

        return () => {
            mounted = false
            unsubscribe(sub)
        }
    }, [taskId, updateTrigger])

    return data
}