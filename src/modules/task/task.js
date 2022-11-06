import storage from '../../utils/storageHelper'
import { generateHash, isDefined } from "../../utils/utils"
import { query as queryHelper, randomHex } from '../../services/blockchain'
import { translated } from '../../services/language'
import client from '../chat/ChatClient'

export const PRODUCT_HASH_LABOUR = generateHash('labour')
const MODULE_KEY = 'task'
// read and write to cached storage
const TX_STORAGE = 'tx_storage'
let textsCap = {
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
}
textsCap = translated(textsCap, true)[1]
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
        window.isDbug && console.log('getTaskIds', { address, types, args })
        return await queryHelper('api.queryMulti', [args, callback].filter(isDefined))
    },
    /**
     * @name    query.orders
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

// list of PolkadotJS APIs used in the `queueables`
export const queueableApis = {
    changeApproval: 'api.tx.orders.changeApproval',
    changeSpfso: 'api.tx.orders.changeSpfso',
    createPo: 'api.tx.orders.createPo',
    createSpfso: 'api.tx.orders.createSpfso',
    handleSpfso: 'api.tx.orders.handleSpfso',
}
export const queueables = {
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
        const func = queueableApis.createPo
        const orderItem = {
            Product: PRODUCT_HASH_LABOUR,
            UnitPrice: amountXTX,
            Quantity: 1,
            UnitOfMeasure: 1,
        }
        const orderItems = new Array(10).fill(0).map(() => orderItem)
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
            orderItems,
            token,
            txId,
        ] : [
            approver,
            fulfiller,
            amountXTX,
            deadline,
            dueDate,
            orderItems,
            taskId,
            token,
            txId,
        ]

        return {
            ...queueProps,
            address: owner,
            amountXTX,
            args,
            func,
            recordId: taskId,
            txId,
            type: TX_STORAGE,
        }
    },
    save: (
        owner,
        approver,
        fulfiller,
        isSell,
        amountXTX,
        isMarket, //false
        orderType = 0, // 0: service order, 1: inventory order, 2: asset order extensible
        deadline, // must be equal or higher than `currentBlockNumber + 11520` blocks. 
        dueDate, // must be equal or higher than deadline
        taskId, // (optional) determines whether to create or update a record
        token, // BONSAI token hash
        queueProps,
    ) => {
        const func = !!taskId ? queueableApis.changeSpfso : queueableApis.createSpfso
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
            isMarket,
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
            args,
            func,
            recordId: taskId,
            txId,
            type: TX_STORAGE,
        }
    },
}

export default {
    query,
    queueables,
}