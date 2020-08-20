import uuid from 'uuid'
import { generateHash, isArr, isDefined } from "../../utils/utils"
import { bytesToHex, strToU8a } from '../../utils/convert'
import { query as queryHelper } from '../../services/blockchain'
import client from '../../services/chatClient'
import storage from '../../services/storage'

export const PRODUCT_HASH_LABOUR = generateHash('labour')
const MODULE_KEY = 'task'
// read and write to cached storage
const TX_STORAGE = 'tx_storage'
/**
 * @name    rwCache
 * @summary read/write to cache storage 
 * @param   {String} key 
 * @param   {*} value (optional) if undefined will only return existing cache.
 *                  If `null`, will clear cache.
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

// Create/update task order (queue-able object)
//
// Params:
// @addrOrigin
export const queueables = {
    save: (
        addrOrigin,
        addrApprover = addrOrigin,
        addrFulfiller = addrOrigin,
        isSell = 0, // 0 = buy, 1 = open
        amountXTX = 0,
        isClosed = 1, // 0 = open, 1 = closed
        orderType = 0, // 0: service order, 1: inventory order, 2: asset order extensible
        deadline, // must be equal or higher than `currentBlockNumber + 11520` blocks. 
        dueDate, // must be equal or higher than deadline
        // 2D array of order items (will be converted to objects): [[productHash, unitRate, qty, unitOfMeasure]]
        // Or, array of OrderItemStruct (see utils => polkadot types) objects 
        orderItems = [],
        taskId, // (optional) determines whether to create or update a record
        token, // BONSAI token hash
        queueProps,
    ) => {
        const func = !!taskId ? 'api.tx.orders.changeSpfso' : 'api.tx.orders.createSpfso'
        const orderItem = orderItems.map(item => !isArr(item) ? item : {
            "Product": item[0],
            "UnitPrice": item[1],
            "Quantity": item[2],
            "UnitOfMeasure": item[3],
        })[0]
        const txidStr = uuid.v1().replace(/\-/g, '')
        const txId = bytesToHex(strToU8a(txidStr))
        const args = !taskId ? [
            addrApprover,
            addrFulfiller,
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
                addrApprover,
                addrFulfiller,
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
            address: addrOrigin,
            amountXTX,
            func,
            type: TX_STORAGE,
            args,
            txId,
        }
    }
}

export default {
    query,
    queueables,
}