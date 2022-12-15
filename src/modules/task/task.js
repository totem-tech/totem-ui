import { BehaviorSubject } from 'rxjs'
import client from '../../utils/chatClient'
import storage from '../../utils/storageHelper'
import { format } from '../../utils/time'
import {
    generateHash,
    isArr,
    isDefined,
    isStr,
} from '../../utils/utils'
import { query as queryHelper, randomHex } from '../../services/blockchain'
import { translated } from '../../services/language'
import { rxSelected } from '../identity/identity'
import { processOrder } from './useTasks'

export const PRODUCT_HASH_LABOUR = generateHash('labour')
export const rxInProgressIds = new BehaviorSubject(new Set())
const MODULE_KEY = 'task'
// read and write to cached storage
const TX_STORAGE = 'tx_storage'
let textsCap = {
    accepted: 'accepted',
    applied: 'applied',
    approved: 'approved',
    blocked: 'blocked',
    completed: 'completed',
    created: 'created',
    disputed: 'disputed',
    inaccessible: 'inaccessible',
    invoiced: 'invoiced',
    pendingApproval: 'pending approval',
    rejected: 'rejected',
}
textsCap = translated(textsCap, true)[1]
export const applicationStatus = [
    textsCap.applied,
    textsCap.accepted,
    textsCap.rejected,
]
export const approvalStatuses = {
    pendingApproval: 0,
    approved: 1,
    rejected: 2,
}
export const approvalStatusNames = {
    0: textsCap.pendingApproval,
    1: textsCap.approved,
    2: textsCap.rejected,
}
export const orderTypes = {
    service: 0,
    inventory: 1,
    asset: 2,
}
export const statuses = {
    inaccessible: -1,
    created: 0,
    accepted: 1,
    rejected: 2,
    disputed: 3,
    blocked: 4,
    invoiced: 5,
    completed: 6,
}
export const statusNames = {
    // used for tasks that are no longer available in the Blockchain storage
    '-1': textsCap.inaccessible,
    0: textsCap.created,
    1: textsCap.accepted,
    2: textsCap.rejected,
    3: textsCap.disputed,
    4: textsCap.blocked,
    5: textsCap.invoiced,
    6: textsCap.completed,
}

/**
 * @name    rwCache
 * @summary read/write to cache storage 
 * 
 * @param   {String}    key 
 * @param   {*}         value (optional) if undefined will only return existing cache.
 *                          If `null`, will clear cache for the suppiled @key.
 * @returns {Map}
 */
export const rwCache = (key, value) => storage.cache(MODULE_KEY, key, value)

/**
 * @name    rwSettings
 * @summary read/write to module settings storage (LocalStorage)
 * 
 * @param   {Object} value 
 * 
 * @returns {Object}
 */
export const rwSettings = (value = {}) => storage.settings.module(MODULE_KEY, value) || {}

export const query = {
    /**
     * @name    getDetailsByTaskIds
     * @summary get off-chain task data (eg: title, description, tags...) from messaging service.
     * 
     * @param   {Array} taskIds
     * 
     * @returns {Map}   list of tasks
     */
    getDetailsByTaskIds: async (taskIds = []) => await client.taskGetById.promise(taskIds),
    /**
     * @name    getTaskIds
     * @summary get lists of tasks for by types
     * 
     * @param {Array}       types one of more task list types. Valid types: ['owner', 'approver', 'beneficiary']
     * @param {String}      address user identity
     * @param {Function}    callback (optional) subcription callback. 
     * 
     * @returns {Array}     2D Arrary of Task IDs
     */
    getTaskIds: async (types = [], address, callback) => {
        const api = await queryHelper() // get API
        const args = types.map(type => [api.query.orders[type], address])
        return await queryHelper('api.queryMulti', [args, callback].filter(isDefined))
    },
    /**
     * @name    query.orders
     * @summary retrieve a list of orders by Task IDs
     * 
     * @param {String|Array}    address user identity
     * @param {String|Array}    taskId  single task ID or array of task IDs
     * @param {Function|null}   callback (optional) callback function to subscribe to changes.
     *                              If supplied, once result is retrieved function will be invoked with result.
     *                              Default: null
     * @param {Boolean}         multi (optional) indicates whether it is a multi query. Default: false.
     * 
     * @returns {*|Function}    if a @callback is a function, will return a function to unsubscribe. Otherwise, result.
     */
    orders: async (taskId, callback = null, multi = false) => await queryHelper(
        'api.query.orders.orders',
        [taskId, callback].filter(isDefined),
        multi,
    ),
    searchMarketplace: async (filter = {}) => {
        const dbResult = await client.taskMarketSearch.promise(filter)
        const ids = [...dbResult.keys()]
        const orders = await query.orders(ids, null, true)
        const address = rxSelected.value
        const tasks = orders
            .map((order, i) => {
                if (!order) return
                const taskId = ids[i]
                const taskDetails = dbResult.get(taskId)
                const task = {
                    taskId,
                    ...taskDetails,
                    ...processOrder(order, taskId, address),
                    _tsCreated: format(taskDetails.tsCreated, true),
                }
                if (isStr(task.tags)) task.tags = task
                    .tags
                    .split(',')
                    .filter(Boolean)
                return [taskId, task]
            })
            .filter(Boolean)
        return new Map(tasks)
    },
    searchMarketplace: (filter = {}) => client.taskMarketSearch.promise(filter),
}

// list of PolkadotJS APIs used in the `queueables`
export const queueableApis = {
    changeApproval: 'api.tx.orders.changeApproval',
    changeSpfso: 'api.tx.orders.changeSpfso',
    createPo: 'api.tx.orders.createOrder',
    createSpfso: 'api.tx.orders.createSpfso', // create SPFSO(Create Simple Prefunded Service Order)
    handleSpfso: 'api.tx.orders.handleSpfso', // update SPFSO
    marketApply: 'client.taskMarketApply',
    updateDetails: 'client.task',
}
export const queueables = {
    approve: (address, taskId, approve = true, queueProps) => {
        const txId = randomHex(address)
        return {
            ...queueProps,
            address,
            args: [
                taskId,
                approve
                    ? approvalStatuses.approved
                    : approvalStatuses.rejected,
                txId,
            ],
            func: queueableApis.changeApproval,
            recordId: taskId,
            txId,
            type: TX_STORAGE,
        }
    },
    /**
     * @name    changeStatus
     * @summary change status of a pre-funded task order
     * 
     * @param   {String} address fulfiller address
     * @param   {String} taskId
     * @param   {Number} statusCode order status code
     * @param   {Object} queueProps extra properties for the queue item
     * 
     * @returns {Object} to be used with queue service
     */
    changeStatus: (address, taskId, statusCode, queueProps) => {
        const txId = randomHex(address)
        const props = {
            ...queueProps,
            address,
            args: [
                taskId,
                statusCode,
                txId,
            ],
            func: queueableApis.handleSpfso,
            recordId: taskId,
            txId,
            type: TX_STORAGE,
        }
        return props
    },
    createOrder: (
        owner,
        approver,
        fulfiller,
        isSell, // 0 = buy, 1 = open
        amountXTX, // total amount
        isMarket,
        orderType = orderTypes.service,
        deadline, // must be equal or higher than `currentBlockNumber + 11520` blocks. 
        dueDate, // must be equal or higher than deadline
        orderId, // (optional) determines whether to create or update a record
        bonsaiToken, // BONSAI token hash
        queueProps,
        orderItems = [{
            Product: PRODUCT_HASH_LABOUR,
            UnitPrice: amountXTX,
            Quantity: 1,
            UnitOfMeasure: 1,
        }],
        parentId = orderId,
    ) => {
        if (!isArr(orderItems) || !orderItems.length) throw new Error('Missing order items')
        const func = queueableApis.createPo
        const txId = randomHex(owner)
        const txKeysL = [
            orderId,
            parentId,
            bonsaiToken,
            txId,
        ]
        const args = [
            approver,
            fulfiller,
            isSell,
            amountXTX,
            isMarket,
            orderType,
            deadline,
            dueDate,
            orderItems,
            txKeysL
        ]

        return {
            ...queueProps,
            address: owner,
            amountXTX,
            args,
            func,
            recordId: orderId,
            txId,
            type: TX_STORAGE,
        }
    },
    /**
     * @name    saveSpfso
     * @summary create/update SPFSO (Simple Pre-Funded Order)
     * 
     * @param   {String}  owner     identity of the owner/creator
     * @param   {String}  approver  idenitty of the assignee
     * @param   {String}  fulfiller identity of the assignee
     * @param   {Number}  isSell    indicates buy/sell order. 0 => buy, 1 => sell
     * @param   {String}  amountXTX amount in the native currency
     * @param   {Boolean} isMarket  (optional) indicates if the order is to be placed on the marketplace.
     *                              Should have no assignee (=> use owner) when creating.
     *                              Default: `false`
     * @param   {Number}  orderType (optional) indicates order type:
     *                              0 => service order (default)
     *                              1 => inventory order
     *                              2 => asset order extensible
     * @param   {Number}  deadline  block number of the deadline to accept the order.
     *                              must be equal or higher than `currentBlockNumber + 11520` blocks. 
     * @param   {Number}  dueDate   block number of when the order is expected to be fulfilled.
     *                              must be equal or higher than deadline
     * @param   {String}  orderId   (optional) leave empty when creating an order
     * @param   {String}  bonsaiToken
     * @param   {String}  queueProps (optional) extra properties to be supplied to the queue items (see queue service)
     * 
     * @returns {Object} 
     */
    saveSpfso: (
        owner,
        approver,
        fulfiller,
        isSell = 0,
        amountXTX,
        isMarket = false,
        orderType = orderTypes.service,
        deadline,
        dueDate,
        orderId,
        bonsaiToken,
        queueProps,
        productId = PRODUCT_HASH_LABOUR,
    ) => {
        const func = !!orderId
            ? queueableApis.changeSpfso
            : queueableApis.createSpfso
        const orderItem = {
            Product: productId,
            UnitPrice: amountXTX,
            Quantity: 1,
            UnitOfMeasure: 1,
        }
        const txId = randomHex(owner)
        const args = !orderId
            ? [
                approver,
                fulfiller,
                isSell,
                amountXTX,
                isMarket,
                orderType,
                deadline,
                dueDate,
                orderItem,
                bonsaiToken,
                txId,
            ] : [
                approver,
                fulfiller,
                amountXTX,
                deadline,
                dueDate,
                orderItem,
                orderId,
                bonsaiToken,
                txId,
            ]

        return {
            ...queueProps,
            address: owner,
            amountXTX,
            args,
            func,
            recordId: orderId,
            txId,
            type: TX_STORAGE,
        }
    },
}

export default {
    query,
    queueables,
}