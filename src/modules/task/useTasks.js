import { useState, useEffect } from 'react'
import { Subject } from 'rxjs'
import {
    arrUnique,
    isAddress,
    isArr,
    isFn,
    isMap,
    isStr,
} from '../../utils/utils'
// services
import { translated } from '../../utils/languageHelper'
import { get as getIdentity } from '../identity/identity'
import { rxNewNotification } from '../notification/notification'
import {
    applicationStatus,
    approvalStatuses,
    approvalStatusNames,
    query,
    rwCache,
    statuses,
    statusNames,
} from './task'
import PromisE from '../../utils/PromisE'
import { rxBlockNumber } from '../../services/blockchain'
import { subjectAsPromise } from '../../utils/reactjs'
import { rxIsLoggedIn, rxIsRegistered } from '../../utils/chatClient'
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
                        const task = processOrder(order, taskId, ordersOrg[index])
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
                newTasks = addDetailsToTasks(
                    address,
                    newTasks,
                    detailsMap,
                    uniqueTaskIds,
                )
                done = true
                setMessage(null)
                setTasks(newTasks)
            } catch (err) {
                done = true
                setError(err)
            }
        }
        let loaded = false
        const handleTaskIds = async (taskIds2d) => {
            if (!mounted) return

            // delay update to make sure off-chain detials are stored and can be retrieved
            if (loaded) {
                subs.tasks && subs.tasks()
                await PromisE.delay(300)
            }
            loaded = true

            try {
                // unsubscribe from existing subscriptions
                subs.tasks && subs.tasks()
                // create single list of unique Task IDs
                const uniqueTaskIds = arrUnique(taskIds2d.flat())

                // wait until user is logged in
                rxIsRegistered.value &&
                    await subjectAsPromise(rxIsLoggedIn, true)[0]
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
                done = true
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
                newTasks = addDetailsToTasks(address, tasks, detailsMap, taskIds)
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

const addDetailsToTasks = (address, tasks, detailsMap, uniqueTaskIds, save = true) => {
    if (!isMap(tasks)) return new Map()
    // no off-chain details to attach
    if (!detailsMap.size) return tasks

    const newTasks = new Map()
    const cacheableAr = Array.from(tasks)
        .map(([type, typeTasks = new Map()]) => {
            uniqueTaskIds.forEach(id => {
                let task = typeTasks.get(id)
                if (!task) return

                typeTasks.set(
                    id,
                    addDetailsToTask(
                        task,
                        detailsMap.get(id),
                    )
                )
            })
            newTasks.set(type, typeTasks)
            return [type, Array.from(typeTasks)]
        })
    save && setCache(address, cacheableAr)
    return newTasks
}

export const addDetailsToTask = (task = {}, details = {}) => {
    const _task = { ...task, ...details }
    const {
        applications = [],
        deadline = 0,
        isClosed = false,
        isMarket,
        proposalRequired = isMarket,
        tags = '',
    } = _task

    _task.amountXTX = isMarket
        && details.amountXTX
        || task.amountXTX
    _task.isClosed = isClosed || deadline < rxBlockNumber.value
    _task.proposalRequired = proposalRequired
    _task.tags = (
        isStr(tags)
            ? tags.split(',')
            : tags || []
    ).filter(Boolean)

    // add application status text
    applications.forEach(application => {
        application._status = applicationStatus[application.status]
            || applicationStatus[0]
    })

    return _task
}

/**
 * @name    processOrder
 * @summary add status text, partner name etc to order
 * 
 * @param   {Object}    order   task order
 * @param   {String}    id      task ID 
 * @param   {String}    address user identity (owner, fulfiller, viewer...)
 * 
 * @returns {Object}    order
 */
export const processOrder = (order, id, orderOrg = order) => {
    try {
        let amountXTX = 0
        let {
            amountXTX: amountHex,
            approvalStatus,
            approver,
            deadline,
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
                    : orderOrg.value
                        && isFn(orderOrg.value.get)
                        ? orderOrg
                            .value
                            .get('amountXTX')
                            .toNumber()
                        : 0
        } catch (err) {
            // ignore error. should only happen when amountXTX is messed up due to blockchain storage reset
            console.log('amountXTX parse error', err)
        }
        const isOwner = !!getIdentity(owner)
        const isEditableStatus = [
            statuses.created,
            statuses.rejected,
        ].includes(orderStatus)
        const allowEdit = isOwner
            && isEditableStatus
            && deadline > rxBlockNumber.value
        order = {
            ...order,
            amountXTX,
            allowEdit,
            isOwner,
            // pre-process values for use with DataTable
            _approvalStatus: approvalStatusNames[approvalStatus],
            _fulfiller: fulfiller === owner
                ? null
                : fulfiller,
            _orderStatus: statusNames[orderStatus],
            _taskId: id, // list search
        }
        return order
    } catch (err) {
        console.log(err)
        return order
    }
}

// automatically update task details whenever a new notification is recieved about a task
rxNewNotification.subscribe(([id, notification]) => {
    const { data: { taskId } = {}, type } = notification || {}
    if (type !== 'tasks' || !taskId) return

    rxUpdater.next([taskId])
})