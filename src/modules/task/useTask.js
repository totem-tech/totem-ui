import { useEffect, useState } from 'react'
import PromisE from '../../utils/PromisE'
import { unsubscribe } from '../../utils/reactHelper'
import { isObj } from '../../utils/utils'
import { query } from './task'
import { addDetailsToTask, processOrder } from './useTasks'

export default function useTask(taskId) {
    const [{ error, task }, setData] = useState({})

    useEffect(() => {
        let mounted = true
        const handleResult = async task => {
            if (!isObj(task)) return
            try {
                // await PromisE.delay(500000)
                task = processOrder(task, taskId)
                setData({ task })

                // // delay in case task is being updated
                // await PromisE.delay(500)

                // fetch off-chain details
                const detailsMap = await query.getDetailsByTaskIds([taskId])
                task = addDetailsToTask(
                    task,
                    detailsMap.get(taskId),
                )
                setData({ task })
            } catch (error) {
                setData({ error, task })
            }
        }
        const sub = taskId && query.orders(
            taskId,
            handleResult,
            false,
        )

        return () => {
            mounted = false
            unsubscribe(sub)
        }
    }, [taskId])

    return { error, task }
}