/*
 * Storage Service: to handle all interactions with browser's localStorage.
 * Typically this should be used by other services
 */
import { Bond } from 'oo7'
import { isArr, isObj, isObjMap, isStr, isValidNumber } from '../utils/utils'
// Local Storage item key prefix for all items
const PREFIX = 'totem_'
const storage = {}
const getItem = key => JSON.parse(localStorage.getItem(PREFIX + key))
const setItem = (key, value) => localStorage.setItem(PREFIX + key, JSON.stringify(value))

// addressbook get/set addressbook entries
storage.addressbook = entries => {
    const key = 'addressbook'
    return isArr(entries) ? setItem(key, entries) : getItem(key) || []
}

// chatHistory gets/sets chat history
//
// Params:
// @history  array: if not an array will return existing history
//
// Returns   undefined or array
storage.chatHistory = history => {
    const key = 'chat-history'
    return isArr(history) ? setItem(key, history) : getItem(key) || []
}

// chatUser gets/sets chat user details.
//
// Params:
// @id      string : if not string will return existing user details
// @secret  string : if not string will return existing user details
//
// Returns   undefined or object
storage.chatUser = (id, secret) => {
    const key = 'chat-user'
    return isStr(id) && isStr(secret) ? setItem(key, { id, secret }) : getItem(key)
}

// timeKeeping
storage.timeKeeping = formValues => {
    const key = 'time-keeping'
    if (!isObj(formValues)) return getItem(key) || {}
    setItem(key, formValues)
    storage.timeKeepingBond.changed(formValues)
}
storage.timeKeepingBond = new Bond()

// queue stores and retrieves queued task details from local storage
storage.queue = queueMap => {
    const key = 'queue-data'
    return !isObjMap(queueMap) ? new Map(getItem(key)) : setItem(key, Array.from(queueMap))

}

// walletIndex gets/sets selected wallet index number
//
// Params:
// @index   number: if not a valid number will return existing selected wallet index
//
// Returns  undefined or number
storage.walletIndex = index => {
    const key = 'wallet-index'
    if (isValidNumber(index)) {
        setItem(key, index)
        return storage.walletIndexBond.changed(index)
     }
     return parseInt(getItem(key) || 0)
}
// Bond to keep components updated 
storage.walletIndexBond = new Bond()
// Update immediately
storage.walletIndexBond.changed(storage.walletIndex())

export default storage