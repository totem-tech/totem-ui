import uuid from 'uuid'
import { generateHash, isArr, isDefined } from "../../utils/utils"
import { bytesToHex, strToU8a } from '../../utils/convert'
import { query as queryHelper } from '../../services/blockchain'
import client from '../../services/chatClient'

export const PRODUCT_HASH_LABOUR = generateHash('labour')
// read and write to cached storage
const TX_STORAGE = 'tx_storage'

export const query = {
    getDetailsByTaskIds: async (taskIds = []) => await client.taskGetById.promise(taskIds),
    getTaskIds: async (types = [], address, callback) => {
        // const validTypes = ['owner', 'approver', 'beneficiary']
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