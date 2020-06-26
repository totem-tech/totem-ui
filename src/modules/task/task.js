import { generateHash } from "../../utils/utils"

const { addressToStr, hashToStr } = require("../../utils/convert")

export const PRODUCT_HASH_LABOUR = generateHash('labour')
const TX_STORAGE = 'tx_storage'
const DEADLINE_MIN_BLOCKS = 11520

// Create a new task | queue item
//
// Params:
// @addrOrigin
export const createTaskOrder = (
    addrOrigin,
    addrApprover = addrOrigin,
    addrFulfiller = addrOrigin,
    isSell = 0, // 0 = buy, 1 = open
    amountXTX = 0,
    isClosed = 1, // 0 = open, 1 = closed
    orderType = 0, // 0: service order, 1: inventory order, 2: asset order extensible
    deadline, // must be equal or higher than 11520 blocks
    dueDate = deadline, // must be equal or higher than deadline
    orderItems = [], // 2D array of order items: [[productHash, unitRate, qty]]
    queueProps,
) => {
    deadline = deadline >= DEADLINE_MIN_BLOCKS ? deadline : DEADLINE_MIN_BLOCKS
    dueDate = dueDate >= deadline ? dueDate : deadline
    return {
        ...queueProps,
        address: addrOrigin,
        amountXTX,
        func: 'api.tx.orders.createSpfso',
        type: TX_STORAGE,
        args: [
            addressToStr(addrApprover),
            addressToStr(addrFulfiller),
            isSell,
            amountXTX,
            isClosed,
            orderType,
            deadline,
            dueDate,
            orderItems,
        ],
    }
}

// Update existing task | queue item
//
// Params:
// @addrOrigin
export const updateTaskOrder = (
    addrOrigin,
    addrApprover = addrOrigin,
    addrFulfiller = addrOrigin,
    isSell = 0, // 0 = buy, 1 = open
    amountXTX = 0,
    isClosed = 1, // 0 = open, 1 = closed
    orderType = 0, // 0: service order, 1: inventory order, 2: asset order extensible
    deadline = 11520, // must be equal or higher than 11520 blocks
    dueDate = deadline, // must be equal or higher than deadline
    orderItems = [], // 2D array of order items: [[productHash, unitRate, qty]]
    hash,
    queueProps,
) => ({
    ...queueProps,
    address: addrOrigin,
    func: 'api.tx.orders.changeSpfso',
    type: TX_STORAGE,
    args: [
        addressToStr(addrOrigin),
        addressToStr(addrApprover),
        addressToStr(addrFulfiller),
        isSell,
        amountXTX,
        isClosed,
        orderType,
        deadline,
        dueDate,
        orderItems,
        hashToStr(hash),
    ],
})

export default {
    createTaskOrder,
    updateTaskOrder,
}