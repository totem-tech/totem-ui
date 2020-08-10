import React, { useState, useEffect } from 'react'
import { textEllipsis, isFn, arrUnique } from '../../utils/utils'
import PromisE from '../../utils/PromisE'
import Currency from '../../components/Currency'
// services
import { query, getConnection } from '../../services/blockchain'
import client from '../../services/chatClient'
import { translated } from '../../services/language'
import { getAddressName } from '../../services/partner'
import storage from '../../services/storage'

const MODULE_KEY = 'task'
const textsCap = translated({
    errorHeader: 'failed to load tasks',
    loadingMsg: 'loading tasks',
    // status names
    accepted: 'accepted',
    blocked: 'blocked',
    completed: 'completed',
    disputed: 'disputed',
    invoiced: 'invoiced',
    pendingApproval: 'pending approval',
    rejected: 'rejected',
    submitted: 'submitted',
}, true)[1]
export const statusCodes = {
    submitted: 0,
    accepted: 1,
    rejected: 2,
    disputed: 3,
    blocked: 4,
    invoiced: 5,
    completed: 6,
}
export const statusCodeNames = {
    submitted: textsCap.submitted,
    accepted: textsCap.accepted,
    rejected: textsCap.rejected,
    disputed: textsCap.disputed,
    blocked: textsCap.blocked,
    invoiced: textsCap.invoiced,
    completed: textsCap.completed,
}
export const approvedCodes = {
    pendingApproval: 0,
    approved: 1,
    rejected: 2,
}
export const approvedCodeNames = {
    pendingApproval: textsCap.pendingApproval,
    approved: textsCap.approved,
    rejected: textsCap.rejected,
}

/**
 * 
 * @param {String} address user identity
 * @param {Array} types task list types
 */
const getCached = (address, types) => {
    let cache = rwCache(address)
    if (cache.length === 0) {
        cache = types.map(type => [type, []])
    }
    return new Map(cache.map(([type, typeTasks]) => [type, new Map(typeTasks)]))
}
/**
 * @name    rwCache
 * @summary read/write to cache storage 
 * @param   {String} key 
 * @param   {*} value (optional) if undefined will only return existing cache.
 *                  If `null`, will clear cache.
 * @returns {Map}
 */
const rwCache = (key, value) => storage.cache(MODULE_KEY, key, value) || []

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
    const [message, setMessage] = useState()

    useEffect(() => {
        let mounted = true
        let loaded = false
        let error = false
        const unsubscribers = {}
        const loadingMsg = {
            content: textsCap.loadingMsg,
            showIcon: true,
            status: 'loading',
        }
        const errorMsg = {
            header: textsCap.errorHeader,
            showIcon: true,
            status: 'error'
        }

        const setError = err => {
            error = true
            setMessage({ ...errorMsg, content: `${err}` })
        }
        const tasksCb = (address, taskIds2d, uniqueTaskIds, types) => async (orders) => {
            if (!mounted) return
            const arStatus = []
            const arApproved = []

            let uniqueTasks = new Map()
            // older orders can be invalid and have null value
            orders.forEach((order = [], index) => {
                const [
                    owner, fulfiller, approver, isSell, bountyXTX,
                    isClosed, orderType, deadline, dueDate,
                ] = order || []
                const taskId = uniqueTaskIds[index]
                const status = arStatus[index]
                const approved = arApproved[index]
                uniqueTasks.set(taskId, {
                    approved,
                    approver,
                    bountyXTX: eval(bountyXTX), // convert Hex string to int if needed
                    deadline,
                    dueDate,
                    fulfiller,
                    isClosed,
                    isSell,
                    orderType,
                    status,
                    owner,
                    // pre-process values for use with DataTable
                    _amountXTX: <Currency value={eval(bountyXTX)} />,
                    _approved: approvedCodeNames[approved],
                    _fulfiller: getAddressName(fulfiller) || textEllipsis(fulfiller, 15),
                    _status: statusCodeNames[status],
                    _owner: getAddressName(owner) || textEllipsis(owner, 15),
                })
            })

            const promise = PromisE.timeout(client.taskGetById.promise(uniqueTaskIds), timeout)
            // add title description etc retrieved from Messaging Service
            const addDetails = (detailsMap) => {
                if (!mounted) return
                Array.from(uniqueTasks).forEach(([id, task]) => {
                    const { title, description, tags } = detailsMap.get(id) || {}
                    task.title = title || ''
                    task.description = description || ''
                    task.tags = tags || []
                })
                // construct separate lists for each type
                const allTasks = new Map()
                const cacheableAr = types.map((type, i) => {
                    const ids = taskIds2d[i]
                    const typeTasks = ids.map(id => [id, uniqueTasks.get(id)])
                    allTasks.set(type, new Map(typeTasks))
                    return [type, typeTasks]
                })
                loaded = true
                rwCache(address, cacheableAr)
                setTasks(allTasks)
            }

            // on receive update tasks lists
            promise.promise.then(addDetails)
            // if times out or fails update component without title, desc etc
            promise.catch(() => addDetails(new Map()))
        }

        setTasks(getCached(address, types))
        setMessage(loadingMsg)
        getConnection().then(async ({ api }) => {
            try {
                // exclude any invalid type
                types = types.filter(x => !!api.query.orders[x])
                const args = types.map(x => [api.query.orders[x], address])

                // construct a single query to retrieve 3 different types of lists with a single subscription
                unsubscribers.taskIds2d = await query('api.queryMulti', [
                    args,
                    async (taskIds2d) => {
                        unsubscribers.tasks && unsubscribers.tasks()
                        // create single list of unique Task IDs
                        const uniqueTaskIds = arrUnique(taskIds2d.flat())
                        const listsTypes = ['order', 'status', 'approved']
                        // retrieve details of all unique tasks at with a single subscription
                        unsubscribers.tasks = await query(
                            'api.queryMulti',
                            [
                                listsTypes.map(l => [l, uniqueTaskIds]),
                                tasksCb(address, taskIds2d, uniqueTaskIds, types),
                            ],
                            false,
                        )
                        // unsubscribers.tasks = await query(
                        //     'api.query.orders.order',
                        //     [
                        //         uniqueTaskIds,
                        //         tasksCb(address, taskIds2d, uniqueTaskIds, types),
                        //     ],
                        //     true,
                        // )

                    }
                ])
            } catch (err) { setError(err) }
        }, setError)

        return () => {
            mounted = false
            Object.values(unsubscribers).forEach(fn => isFn(fn) && fn())
        }
    }, [address]) // update subscriptions whenever address changes

    return [tasks, message]
}