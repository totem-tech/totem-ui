import React, { useState, useEffect } from 'react'
import { textEllipsis, isFn, arrUnique } from '../../utils/utils'
import Currency from '../../components/Currency'
import { query, getConnection } from '../../services/blockchain'
import { getAddressName } from '../../services/partner'
import PromisE from '../../utils/PromisE'

export const getKey = (address, type) => `${address}-${type}`
const messagingServicePlaceholder = () => new Promise(resolve => resolve(new Map()))

/**
 * @name useTasks
 * @summary a custom React hook to subscribe to list(s) of task orders
 * 
 * @param {Array} types array of types. A `type` must be the name of a valid PolkadotJS API function that returns a 
 * list of Task Order IDs. Type is valided using the following: `api.query.orders[type]`. Example types: 
 * @param {String} address SS58 string. The identity to retrieve list of tasks for.
 * @param {Number} timeout (optional) timeout delay in milliseconds. Default: 5000
 * 
 */
export default function useTasks(types, address, timeout = 5000) {
    const [tasks, setTasks] = useState(new Map())

    useEffect(() => {
        let mounted = true
        const unsubscribers = {}
        const tasksCb = (address, taskIds2d, uniqueTaskIds, types) => async (taskOrders) => {
            if (!mounted) return
            let uniqueTasks = new Map()
            // older orders can be invalid and have null value
            taskOrders.forEach((order = [], i) => {
                const [
                    owner, fulfiller, approver, isSell, bountyXTX,
                    isClosed, orderType, deadline, dueDate,
                ] = order || []
                const taskId = uniqueTaskIds[i]
                uniqueTasks.set(taskId, {
                    owner,
                    approver,
                    fulfiller,
                    isSell,
                    bountyXTX: eval(bountyXTX), // convert Hex string to int if needed
                    isClosed,
                    orderType,
                    deadline,
                    dueDate,
                    // pre-process values for use with DataTable
                    _amountXTX: <Currency value={eval(bountyXTX)} />,
                    _owner: getAddressName(owner) || textEllipsis(owner, 15),
                    _fulfiller: getAddressName(fulfiller) || textEllipsis(fulfiller, 15),
                })
            })

            const promise = PromisE.timeout(messagingServicePlaceholder(), timeout)
            // add title description etc retrieved from Messaging Service
            const addDetails = (detailsMap = new Map()) => {
                if (!mounted) return
                Array.from(uniqueTasks).forEach(([id, task]) => {
                    const { title, description, tags } = detailsMap.get(id) || {}
                    task.title = title || ''
                    task.description = description || ''
                    task.tags = tags || []
                })
                // construct separate lists for each type
                const allTasks = new Map()
                types.forEach((type, i) => {
                    const ids = taskIds2d[i]
                    const typeTasks = ids.map(id => [id, uniqueTasks.get(id)])

                    allTasks.set(getKey(address, type), new Map(typeTasks))
                })
                setTasks(allTasks)
            }

            // on receive update tasks lists
            promise.promise.then(addDetails)
            // if times out or fails update component without title, desc etc
            promise.catch(() => addDetails(new Map()))
        }

        getConnection().then(async ({ api }) => {
            // exclude any invalid type
            types = types.filter(x => !!api.query.orders[x])
            const args = types.map(x => [api.query.orders[x], address])

            // construct a single query to retrieve 3 different types of lists with a single subscription
            unsubscribers.taskIds2d = await query('api.queryMulti', [
                args,
                async (taskIds2d) => {
                    // create single list of unique Task IDs
                    const uniqueTaskIds = arrUnique(taskIds2d.flat())
                    // retrieve details of all unique tasks at with a signle subscription
                    unsubscribers.tasks = await query(
                        'api.query.orders.order',
                        [
                            uniqueTaskIds,
                            tasksCb(address, taskIds2d, uniqueTaskIds, types),
                        ],
                        true,
                    )
                }
            ])
        })

        return () => {
            mounted = false
            Object.values(unsubscribers).forEach(fn => isFn(fn) && fn())
        }
    }, [address]) // update subscriptions whenever address changes

    return [tasks]
}
