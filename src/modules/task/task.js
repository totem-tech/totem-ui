import uuid from 'uuid'
import { generateHash, isArr, isDefined } from "../../utils/utils"
import { bytesToHex, strToU8a } from '../../utils/convert'
import { query as queryHelper, randomHex } from '../../services/blockchain'
import client from '../../services/chatClient'
import { translated } from '../../services/language'
import storage from '../../services/storage'

export const PRODUCT_HASH_LABOUR = generateHash('labour')
const MODULE_KEY = 'task'
// read and write to cached storage
const TX_STORAGE = 'tx_storage'
const textsCap = translated({
    inaccessible: 'inaccessible',
    accepted: 'accepted',
    approved: 'approved',
    blocked: 'blocked',
    completed: 'completed',
    disputed: 'disputed',
    invoiced: 'invoiced',
    pendingApproval: 'pending approval',
    rejected: 'rejected',
    submitted: 'submitted',
}, true)[1]
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
export const statusNames = {
    // used for tasks that are no longer available in the Blockchain storage
    '-1': textsCap.inaccessible,
    0: textsCap.submitted,
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
     * @name    orders
     * @summary retrieve a list of orders by Task IDs
     * 
     * @param {String|Array}    address user identity
     * @param {String|Array}    taskId
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
}
export const queueables = {
    /**
     * @name accept
     * @summary accept/reject task assignment
     * 
     * @param {String} address fulfiller address
     * @
     */
    accept: (address, taskId, accept = true, queueProps) => {
        const txId = randomHex(address)
        return {
            ...queueProps,
            address,
            args: [
                taskId,
                accept ? statuses.accepted : statuses.rejected,
                txId,
            ],
            func: 'api.tx.orders.handleSpfso',
            txId,
            type: TX_STORAGE,
        }
    },
    approve: (address, taskId, approve = true, queueProps) => {
        const txId = randomHex(address)
        return {
            ...queueProps,
            address,
            args: [
                taskId,
                approve ? approvalStatuses.approved : approvalStatuses.rejected,
                txId,
            ],
            func: 'api.tx.orders.changeApproval',
            txId,
            type: TX_STORAGE,
        }
    },
    createPo: (
        owner,
        approver,
        fulfiller,
        isSell, // 0 = buy, 1 = open
        amountXTX,
        isClosed, // false = open, true = closed
        orderType = 0, // 0: service order, 1: inventory order, 2: asset order extensible
        deadline, // must be equal or higher than `currentBlockNumber + 11520` blocks. 
        dueDate, // must be equal or higher than deadline
        taskId, // (optional) determines whether to create or update a record
        token, // BONSAI token hash
        queueProps,
    ) => {
        const func = 'api.tx.orders.createPo'
        const orderItem = {
            Product: PRODUCT_HASH_LABOUR,
            UnitPrice: amountXTX,
            Quantity: 1,
            UnitOfMeasure: 1,
        }
        const txId = randomHex(owner)
        const args = !taskId ? [
            approver,
            fulfiller,
            isSell,
            amountXTX,
            isClosed,
            orderType,
            deadline,
            dueDate,
            [orderItem],
            token,
            txId,
        ] : [
                approver,
                fulfiller,
                amountXTX,
                deadline,
                dueDate,
                [orderItem],
                taskId,
                token,
                txId,
            ]

        return {
            ...queueProps,
            address: owner,
            amountXTX,
            func,
            type: TX_STORAGE,
            args,
            txId,
        }
    },
    save: (
        owner,
        approver,
        fulfiller,
        isSell, // 0 = buy, 1 = open
        amountXTX,
        isClosed, // false = open, true = closed
        orderType = 0, // 0: service order, 1: inventory order, 2: asset order extensible
        deadline, // must be equal or higher than `currentBlockNumber + 11520` blocks. 
        dueDate, // must be equal or higher than deadline
        taskId, // (optional) determines whether to create or update a record
        token, // BONSAI token hash
        queueProps,
    ) => {
        const func = !!taskId ? 'api.tx.orders.changeSpfso' : 'api.tx.orders.createSpfso'
        const orderItem = {
            Product: PRODUCT_HASH_LABOUR,
            UnitPrice: amountXTX,
            Quantity: 1,
            UnitOfMeasure: 1,
        }
        const txId = randomHex(owner)
        const args = !taskId ? [
            approver,
            fulfiller,
            isSell,
            amountXTX,
            isClosed,
            orderType,
            deadline,
            dueDate,
            orderItem,
            token,
            txId,
        ] : [
                approver,
                fulfiller,
                amountXTX,
                deadline,
                dueDate,
                orderItem,
                taskId,
                token,
                txId,
            ]

        return {
            ...queueProps,
            address: owner,
            amountXTX,
            func,
            type: TX_STORAGE,
            args,
            txId,
        }
    },
}

export default {
    query,
    queueables,
}