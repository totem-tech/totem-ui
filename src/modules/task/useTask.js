import { useEffect, useState } from 'react'
import { unsubscribe } from '../../utils/reactHelper'
import { isObj } from '../../utils/utils'
import { query } from './task'
import { addDetailsToTask, processOrder } from './useTasks'

export default function useTask(taskId, updateTrigger) {
    const [{ error, task }, setData] = useState({})

    useEffect(() => {
        if (!taskId) return () => { }
        let mounted = true
        const handleResult = async order => {
            if (!isObj(order)) return
            try {
                order = processOrder(order, taskId)
                mounted && setData({ task: order })

                // // delay in case task is being updated
                // await PromisE.delay(500)

                // fetch off-chain details
                const detailsMap = await query.getDetailsByTaskIds([taskId])
                order = addDetailsToTask(
                    order,
                    detailsMap.get(taskId),
                )
                mounted && setData({ task: order })
            } catch (error) {
                mounted && setData({ error: `${error}`, task: order })
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

    return { error, task }
}