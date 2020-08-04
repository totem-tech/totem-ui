import { generateHash, isArr } from "../../utils/utils"
import storage from '../../services/storage'

export const PRODUCT_HASH_LABOUR = generateHash('labour')
const MODULE_KEY = 'task'
// read and write to cached storage
const rwCache = (key, value) => storage.cache(MODULE_KEY, key, value)
const TX_STORAGE = 'tx_storage'
const DEADLINE_MIN_BLOCKS = 111520

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
        recordId, // (optional) determines whether to create or update a record
        token, // BONSAI token hash
        queueProps,
    ) => {
        const func = !!recordId ? 'api.tx.orders.changeSpfso' : 'api.tx.orders.createSpfso'
        const orderItem = orderItems.map(item => !isArr(item) ? item : {
            "Product": item[0],
            "UnitPrice": item[1],
            "Quantity": item[2],
            "UnitOfMeasure": item[3],
        })[0]

        const args = !recordId ? [
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
        ] : [
                addrApprover,
                addrFulfiller,
                amountXTX,
                deadline,
                dueDate,
                orderItem,
                token,
                recordId
            ]

        return {
            ...queueProps,
            address: addrOrigin,
            amountXTX,
            func,
            type: TX_STORAGE,
            args,
        }
    }
}

export default {
    queueables
}