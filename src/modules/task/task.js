import { generateHash, isArr } from "../../utils/utils"

const { addressToStr, hashToStr } = require("../../utils/convert")

export const PRODUCT_HASH_LABOUR = generateHash('labour')
const TX_STORAGE = 'tx_storage'
const DEADLINE_MIN_BLOCKS = 111520

// Create/update task order (queue-able object)
//
// Params:
// @addrOrigin
export const createOrUpdateTask = (
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
    hash, // (optional) determines whether to create or update
    queueProps,
) => {
    const func = !!hash ? 'api.tx.orders.changeSpfso' : 'api.tx.orders.createSpfso'
    const args = [
        addressToStr(addrApprover),
        addressToStr(addrFulfiller),
        isSell,
        amountXTX,
        isClosed,
        orderType,
        deadline,
        dueDate,
        orderItems.map(item => !isArr(item) ? item : {
            "ProductHash": item[0],
            "UnitPrice": item[1],
            "Quantity": item[2],
            "UnitOfMeasure": item[3],
        }),
    ]
    if (!!hash) args.push(hashToStr(hash))
    return {
        ...queueProps,
        address: addrOrigin,
        amountXTX,
        func,
        type: TX_STORAGE,
        args,
    }
}

export default { createOrUpdateTask }