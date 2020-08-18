import React, { useState, useEffect } from 'react'
import { isFn, arrUnique, objCopy } from '../../utils/utils'
import PromisE from '../../utils/PromisE'
// services
import { translated } from '../../services/language'
import { getAddressName } from '../../services/partner'
import storage from '../../services/storage'
import { query } from './task'

const MODULE_KEY = 'task'
const textsCap = translated({
    errorHeader: 'failed to load tasks',
    loadingMsg: 'loading tasks',
    // status names
    inaccessible: 'inaccessible',
    accepted: 'accepted',
    blocked: 'blocked',
    completed: 'completed',
    disputed: 'disputed',
    invoiced: 'invoiced',
    pendingApproval: 'pending approval',
    rejected: 'rejected',
    submitted: 'submitted',
}, true)[1]
export const statusNames = {
    // / // used for tasks that are no longer available in the storage
    '-1': textsCap.inaccessible,
    '0': textsCap.submitted,
    '1': textsCap.accepted,
    '2': textsCap.rejected,
    '3': textsCap.disputed,
    '4': textsCap.blocked,
    '5': textsCap.invoiced,
    '6': textsCap.completed,
}
export const statuses = {
    inaccessible: -1,
    submitted: 0,
    accepted: 1,
    rejected: 2,
    disputed: 3,
    blocked: 4,
    invoiced: 5,
    completed: 6,
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

        const setError = err => setMessage({ ...errorMsg, content: `${err}` })
        const handleOrdersCb = (taskIds2d, uniqueTaskIds, types) => async (orders, ordersOrg) => {
            if (!mounted) return
            const arStatus = []
            const arApproved = []
            let uniqueTasks = new Map()
            // older orders can be invalid and have null value
            orders.forEach((order = [], index) => {
                let {
                    owner,
                    fulfiller,
                    approver,
                    isSell,
                    amountXTX = 0,//'0x0',
                    isClosed,
                    orderType,
                    deadline,
                    dueDate,
                } = order || {}
                const taskId = uniqueTaskIds[index]
                // order can be null if storage has changed
                const status = order === null ? -1 : arStatus[index]
                const approved = arApproved[index]
                uniqueTasks.set(taskId, {
                    approved,
                    approver,
                    amountXTX: eval(amountXTX),
                    deadline,
                    dueDate,
                    fulfiller,
                    isClosed,
                    isSell,
                    orderType,
                    status,
                    owner,
                    // pre-process values for use with DataTable
                    _approved: approvedCodeNames[approved],
                    _status: statusNames[status],
                    // ToDo: move to task list
                    _fulfiller: getAddressName(fulfiller),
                    _owner: getAddressName(owner),
                })
            })

            const promise = PromisE.timeout(query.getDetailsByTaskIds(uniqueTaskIds), timeout)
            // add title description etc retrieved from Messaging Service
            const addDetails = (detailsMap) => {
                if (!mounted) return
                Array.from(uniqueTasks).forEach(([id, task]) => {
                    const taskDetails = detailsMap.get(id) || {
                        description: '',
                        publish: 0,
                        title: '',
                        tags: [],
                    }
                    Object.keys(taskDetails).forEach(key => task[key] = taskDetails[key])
                })
                // construct separate lists for each type
                const allTasks = new Map()
                const cacheableAr = types.map((type, i) => {
                    const ids = taskIds2d[i]
                    const typeTasks = ids.map(id => [id, uniqueTasks.get(id)])
                    allTasks.set(type, new Map(typeTasks))
                    return [type, typeTasks]
                })
                rwCache(address, cacheableAr)
                setTasks(allTasks)
            }

            // on receive update tasks lists
            promise.promise.then(addDetails)
            // if times out or fails update component without title, desc etc
            promise.catch(() => addDetails(new Map()))
        }
        const handleTaskIds = async (taskIds2d) => {
            if (!mounted) return
            unsubscribers.tasks && unsubscribers.tasks()
            // create single list of unique Task IDs
            const uniqueTaskIds = arrUnique(taskIds2d.flat())
            query.orders(
                uniqueTaskIds,
                handleOrdersCb(taskIds2d, uniqueTaskIds, types),
                true,
            ).then(
                fn => unsubscribers.tasks = fn,
                setError
            )
        }

        setTasks(getCached(address, types))
        setMessage(loadingMsg)

        query.getTaskIds(types, address, handleTaskIds).then(
            fn => unsubscribers.taskIds2d = fn,
            setError,
        )

        return () => {
            mounted = false
            Object.values(unsubscribers).forEach(fn => isFn(fn) && fn())
        }
    }, [address]) // update subscriptions whenever address changes

    return [
        tasks,
        message,
        // function to update specific details from messaging service
        async (taskIds = []) => {
            if (!taskIds || !taskIds.length) return
            try {
                const detailsMap = await query.getDetailsByTaskIds(taskIds)
                if (!detailsMap.size) return
                const cacheableAr = Array.from(tasks).map(([type, typeTasks = new Map()]) => {
                    taskIds.forEach(id => {
                        const task = typeTasks.get(id)
                        if (!task) return
                        typeTasks.set(id, objCopy(task, detailsMap.get(id) || {}))
                    })
                    return [type, Array.from(typeTasks)]
                })
                rwCache(address, cacheableAr)
                setTasks(tasks)
                console.log({ tasks, taskIds, detailsMap })
            } catch (err) {
                console.log({ err })
            }//ignore error
        }
    ]
}