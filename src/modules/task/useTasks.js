import React, { useState, useEffect } from 'react'
import { Subject } from 'rxjs'
import { format } from '../../utils/time'
import { isFn, arrUnique, objCopy, isMap, isArr, isObj } from '../../utils/utils'
// services
import { translated } from '../../services/language'
import { getAddressName } from '../partner/partner'
import { approvalStatuses, approvalStatusNames, query, rwCache, statuses, statusNames } from './task'
import AddressName from '../partner/AddressName'
import { isAddress } from 'web3-utils'
import notification, { rxNewNotification } from '../notification/notification'

const textsCap = translated({
    errorHeader: 'failed to load tasks',
    loadingMsg: 'loading tasks',
}, true)[1]

// @rsUpdater is used to force update off-chain task data. Expected value is array of Task IDs.
// Use case: whenever off-chain task data (eg: title, description...) needs to be updated manually because PolkadotJS 
//      API the subscription mechanism used in the`useTasks` hook cannot automatically do it:
//      After creating and updating the task using the TaskForm
// Example usage: rxUpdater.next(['0x...'])
export const rxUpdater = new Subject()

/**
 * @name getCached
 * @summary read cached list of tasks
 * @param {String} address user identity
 * @param {Array} types task list types
 * 
 * @returns {Map}
 */
const getCached = (address, types) => {
    if (!isAddress(address) || !isArr(types)) return new Map()

    let cache = rwCache(address)
    if (!isArr(cache)) cache = []
    if (cache.length === 0) {
        cache = types.map(type => [type, []])
    }
    const arr2D = cache.map(([type, typeTasks]) =>
        [type, new Map(typeTasks)]
    )
    return new Map(arr2D)
}

/**
 * @name setCache
 * @summary save tasks in the cache storage
 * @param {String} address 
 * @param {Array} allTasksArr Array converted from 2D map of all tasks for all types
 */
const setCache = (address, allTasksArr) => rwCache(address, allTasksArr)

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
export default function useTasks(types = [], address, timeout = 5000) {
    const [tasks, setTasks] = useState(new Map())
    const [message, setMessage] = useState()

    useEffect(() => {
        if (!address) return () => { }

        let mounted = true
        let done = false
        const subs = {}
        const loadingMsg = {
            content: textsCap.loadingMsg,
            icon: true,
            status: 'loading',
        }
        const errorMsg = {
            header: textsCap.errorHeader,
            icon: true,
            status: 'error'
        }
        const setError = err => setMessage({
            ...errorMsg,
            content: `${err}`,
        })
        const handleOrdersCb = (taskIds2d, uniqueTaskIds, detailsMap, types) => async (orders, ordersOrg) => {
            if (!mounted) return
            try {
                let uniqueTasks = new Map()
                const invalidIds = new Map()
                orders
                    .forEach((order, index) => {
                        if (!order) {
                            invalidIds.set(uniqueTaskIds[index], true)
                            return
                        }
                        const taskId = uniqueTaskIds[index]
                        let amountXTX = 0
                        let {
                            amountXTX: amountHex,
                            approvalStatus,
                            approver,
                            fulfiller,
                            // order can be null if storage has changed, in that case, use inaccessible status
                            orderStatus = statuses.inaccessible,
                            owner,
                        } = order || {}
                        try {
                            amountXTX = !order
                                ? 0
                                : Number(amountHex) >= 0
                                    ? Number(amountHex)
                                    : ordersOrg[index].value
                                        && isFn(ordersOrg[index].value.get)
                                        ? ordersOrg[index]
                                            .value
                                            .get('amountXTX')
                                            .toNumber()
                                        : 0
                        } catch (err) {
                            // ignore error. should only happen when amountXTX is messed up due to blockchain storage reset
                            console.log('amountXTX parse error', err)
                        }
                        const isOwner = address === owner
                        const isSubmitted = orderStatus === statuses.submitted
                        const isPendingApproval = approvalStatus == approvalStatuses.pendingApproval
                        const isOwnerTheApprover = owner === approver
                        let allowEdit = isOwner && isSubmitted && (isPendingApproval || isOwnerTheApprover)
                        const task = {
                            ...order,
                            amountXTX,
                            allowEdit,
                            // pre-process values for use with DataTable
                            _approvalStatus: approvalStatusNames[approvalStatus],
                            _fulfiller: <AddressName {...{ address: fulfiller }} />,
                            _orderStatus: statusNames[orderStatus],
                            _taskId: taskId, // list search
                            _owner: <AddressName {...{ address: owner }} />,
                        }
                        uniqueTasks.set(taskId, task)
                    })

                let newTasks = new Map()
                types.map((type, i) => {
                    const typeTaskIds = taskIds2d[i]
                    const typeTasks = new Map(
                        typeTaskIds
                            .map(id => !invalidIds.get(id) && [id, uniqueTasks.get(id)])
                            .filter(Boolean)

                    )
                    newTasks.set(type, typeTasks)
                })
                newTasks = addDetails(address, newTasks, detailsMap, uniqueTaskIds)
                done = true
                setMessage(null)
                setTasks(newTasks)
            } catch (err) {
                setError(err)
            }
        }
        const handleTaskIds = async (taskIds2d) => {
            if (!mounted) return
            try {
                subs.tasks && subs.tasks()
                // create single list of unique Task IDs
                const uniqueTaskIds = arrUnique(taskIds2d.flat())
                const detailsMap = await query.getDetailsByTaskIds(uniqueTaskIds)
                subs.tasks = await query.orders(
                    uniqueTaskIds,
                    handleOrdersCb(
                        taskIds2d,
                        uniqueTaskIds,
                        detailsMap,
                        types,
                    ),
                    true,
                )
            } catch (err) {
                setError(err)
            }
        }

        // load cached items if items are not loaded within timeout duration
        setTimeout(() => {
            if (!mounted || done) return
            setMessage(null)
            const tasks = getCached(address, types)
            setTasks(tasks)
        }, timeout)

        setMessage(loadingMsg)

        query
            .getTaskIds(types, address, handleTaskIds)
            .then(
                unsub => subs.taskIds2d = unsub,
                setError,
            )

        return () => {
            mounted = false
            Object.values(subs)
                .forEach(fn => isFn(fn) && fn())
        }
    }, [address]) // update subscriptions whenever address changes


    useEffect(() => {
        if (!address) return () => { }

        // listend for changes in rxUpdated and update task details from messaging service
        const subscribed = rxUpdater.subscribe(async (taskIds) => {
            if (!taskIds || !taskIds.length) return

            let msg = null
            let newTasks = null
            try {
                const detailsMap = await query.getDetailsByTaskIds(taskIds)
                newTasks = addDetails(address, tasks, detailsMap, taskIds)
            } catch (err) {
                //ignore error
                console.error(err)
                msg = {
                    content: `${err}`,
                    icon: true,
                    status: 'error',
                }
            }
            setMessage(msg)
            newTasks && setTasks(newTasks)
        })

        return () => subscribed.unsubscribe()
    }, [address, tasks, setTasks])

    return [tasks, message]
}

const addDetails = (address, tasks, detailsMap, uniqueTaskIds, save = true) => {
    if (!isMap(tasks)) return new Map()
    // no off-chain details to attach
    if (!detailsMap.size) return tasks

    const newTasks = new Map()
    const cacheableAr = Array.from(tasks)
        .map(([type, typeTasks = new Map()]) => {
            uniqueTaskIds.forEach(id => {
                let task = typeTasks.get(id)
                if (!task) return

                task._fulfiller = (
                    <AddressName {...{
                        address: task.fulfiller,
                        userId: task.createdBy
                    }} />
                )
                task._owner = (
                    <AddressName {...{
                        address: task.owner,
                        userId: task.createdBy
                    }} />
                )
                task = objCopy(detailsMap.get(id) || {}, task)
                task = { ...task, ...detailsMap.get(id) }
                task._tsCreated = format(task.tsCreated, true)
                typeTasks.set(id, task || {})
            })
            // tasks.set(type, typeTasks)
            newTasks.set(type, typeTasks)
            return [type, Array.from(typeTasks)]
        })
    save && setCache(address, cacheableAr)
    return newTasks
}

// automatically update task details whenever a new notification is recieved about a task
rxNewNotification.subscribe(([id, notification]) => {
    const { data: { taskId } = {}, type } = notification || {}
    if (type !== 'tasks' || !taskId) return

    rxUpdater.next([taskId])
})