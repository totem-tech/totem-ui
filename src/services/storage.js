/*
 * Storage Service: to handle all interactions with browser's localStorage.
 * Typically this should be used by other services
 */
import { Bond } from 'oo7'
import uuid from 'uuid'
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

// getting started module's current step index
storage.gettingStartedStepIndex = index => {
    const key = 'getting-started-step-index'
    return isValidNumber(index) ? setItem(key, index) : getItem(key) || 0
}

// timeKeeping form values and states for use with the TimeKeeping form
storage.timeKeeping = data => {
    const key = 'time-keeping'
    if (!isObj(data)) return getItem(key) || {}
    setItem(key, data)
    storage.timeKeepingBond.changed(uuid.v1())
}
storage.timeKeepingBond = new Bond()
storage.timeKeepingBond.changed(uuid.v1())

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