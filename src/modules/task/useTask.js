import { useEffect } from 'react'
import { rxIsLoggedIn, rxIsRegistered } from '../../utils/chatClient'
import { translated } from '../../utils/languageHelper'
import {
    useRxState,
    subjectAsPromise,
    unsubscribe,
} from '../../utils/reactjs'
import { isObj } from '../../utils/utils'
import { query } from './task'
import { addDetailsToTask, processOrder } from './useTasks'

let textsCap = {
    task404: 'task not found'
}
textsCap = translated(textsCap, true)[1]

export default function useTask(taskId, updateTrigger) {
    const [state, setState] = useRxState({
        children: null,
        error: null,
        task: null,
    })

    useEffect(() => {
        if (!taskId) return () => { }

        let mounted = true
        const handleResult = async (order, orderOrg) => {
            const gotOrder = isObj(order)
            order = order || {}

            let error
            try {
                order = processOrder(order, taskId, orderOrg || {})

                // wait until user is logged in
                rxIsRegistered.value &&
                    await subjectAsPromise(rxIsLoggedIn, true)[0]
                // fetch off-chain details
                const detailsMap = await query
                    .getDetailsByTaskIds([taskId])
                let task = detailsMap.get(taskId)

                if (!gotOrder && !task) return setState({ error: textsCap.task404 })

                task.children = (
                    task.isMarket && await query
                        .getDetailsByParentId(taskId)
                        .catch(() => { })
                ) || new Map()
                order = addDetailsToTask(order, task)
            } catch (err) {
                error = err
            } finally {
                mounted && setState({
                    error: `${error || ''}`
                        .replace('Error: ', ''),
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

    useEffect(() => {
        // subscribe to retrieve latest data about children
    }, [state.children])

    return state
}