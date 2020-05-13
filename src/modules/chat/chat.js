import DataStorage from '../../utils/DataStorage'
import uuid from 'uuid'
import { Bond } from 'oo7'
import { arrUnique, isObj, isValidNumber, isDefined, isArr } from '../../utils/utils'
import { addToQueue, QUEUE_TYPES } from '../../services/queue'
import client, { getUser } from '../../services/chatClient'
import storage from '../../services/storage'

const PREFIX = 'totem_'
const MODULE_KEY = 'chat-history'
const EVERYONE = 'everyone'
const chatHistory = new DataStorage(PREFIX + MODULE_KEY, true)
// notifies when new conversation is created, hidden or unhidden
export const newInboxBond = new Bond()
// notifies when a specific inbox view requires update
export const inboxBonds = {}
const generateInboxBonds = () => {
    const hiddenKeys = hiddenInboxKeys()
    const allKeys = Array.from(chatHistory.getAll())
        .map(([key]) => key)
        .filter(key => key !== EVERYONE)
        .concat(EVERYONE) // pushes to the end
    allKeys.forEach(key => {
        if (hiddenKeys.includes(key)) {
            delete inboxBonds[key]
            return
        }

        inboxBonds[key] = inboxBonds[key] || new Bond()
    })
}

// read/write to module settings
const rw = value => storage.settings.module(MODULE_KEY, value) || {}
const saveMessage = msg => {
    let { message, senderId, receiverIds, encrypted, timestamp, status = 'success', id, errorMessage } = msg
    receiverIds = receiverIds.sort()
    const key = getInboxKey(receiverIds)
    const messages = chatHistory.get(key) || []
    const limit = historyLimit()
    let msgItem = messages.find(x => x.id === id)
    if (id && msgItem) {
        // update existing item
        msgItem.status = status
        msgItem.timestamp = timestamp
    } else {
        msgItem = {
            senderId,
            receiverIds,
            message,
            encrypted,
            timestamp,
            status,
            id: id || uuid.v1(),
            errorMessage,
        }
        messages.push(msgItem)
    }
    chatHistory.set(
        key,
        messages.length > limit ? messages.slice(messages.length - limit) : messages
    )
    inboxBonds[key] = inboxBonds[key] || new Bond()
    inboxBonds[key].changed(uuid.v1())
    return msgItem
}

// unique user ids from all messages in chat history
export const getChatUserIds = (includeTrollbox = true) => arrUnique(Object.keys(inboxBonds)
    .filter(key => key !== EVERYONE)
    .map(key => key.split(','))
    .flat()
    .concat(includeTrollbox ? getTrollboxUserIds() : []))

// returns inbox storage key
export const getInboxKey = receiverIds => {
    receiverIds = arrUnique(receiverIds).sort()
    const { id: userId } = getUser() || {}
    const index = receiverIds.indexOf(userId)
    if (index >= 0) receiverIds.splice(index, 1)
    // Trollbox
    if (receiverIds.includes(EVERYONE)) return EVERYONE
    // Private chat
    if (receiverIds.length === 1) return receiverIds[0]
    // Group chat
    return arrUnique([...receiverIds, userId]).sort().join()
}

export const getMessages = receiverIds => {
    const { id: userId } = getUser() || {}
    if (!userId) return []
    const key = getInboxKey(receiverIds)
    const msgs = chatHistory.get(key) || []
    return msgs
}

// unique user ids from Trollbox chat history
export const getTrollboxUserIds = () => {
    const messages = chatHistory.get(EVERYONE) || []
    return arrUnique(messages.map(x => x.senderId))
}

// get/set hidden inbox keys list
export const hiddenInboxKeys = arr => {
    arr = isArr(arr) ? { hiddenInboxes: arrUnique(arr) } : undefined
    const generate = !!arr
    arr = rw(arr).hiddenInboxes || []
    if (generate) {
        generateInboxBonds()
        newInboxBond.changed(uuid.v1())
    }
    return arr
}

// get/set limit per inbox
export const historyLimit = limit => {
    limit = rw(
        !isValidNumber(limit) ? undefined : { historyLimit: limit }
    ).historyLimit
    return isDefined(limit) ? limit : 100
}

// get/set inbox specific settings
export const inboxSettings = (inboxKey, value, triggerReload = false) => {
    let settings = rw()
    if (!isObj(value) && value !== null) return settings[inboxKey] || {}
    settings[inboxKey] = { ...settings[inboxKey], ...value }
    setTimeout(() => {
        value !== null && inboxBonds[inboxKey].changed(uuid.v1())
        triggerReload && newInboxBond.changed(uuid.v1())
    })

    return rw(settings)[inboxKey] || {}
}

// create/get inbox key
export const newInbox = (receiverIds = [], name, notify = false) => {
    const key = getInboxKey(receiverIds)
    if (!inboxBonds[key]) {
        chatHistory.set(key, [])
        name && inboxSettings(key, { name, ignore: false }, notify)
    }
    hiddenInboxKeys(hiddenInboxKeys().filter(x => x !== key))
    generateInboxBonds()
    return inboxBonds[key]
}

// send message
export const send = (receiverIds, message, encrypted = false) => {
    const { id: senderId } = getUser() || {}
    if (!senderId) return
    const id = uuid.v1()
    let status = 'loading'
    const saveMsg = (status, timestamp, error) => saveMessage({
        message,
        senderId,
        receiverIds,
        encrypted,
        timestamp,
        status,
        id,
        error,
    })
    saveMsg(status, null)

    addToQueue({
        args: [
            receiverIds,
            message,
            false,
            (err, timestamp) => saveMsg(err ? 'error' : 'success', timestamp, err)
        ],
        func: 'message',
        silent: true,
        then: () => {

        },
        type: QUEUE_TYPES.CHATCLIENT,
    })
}

export const removeInbox = inboxKey => {
    chatHistory.delete(inboxKey)
    delete inboxBonds[inboxKey]
    generateInboxBonds()
    inboxSettings(inboxKey, null, true)
}
export const removeInboxMessages = inboxKey => chatHistory.set(inboxKey, []) | inboxBonds[inboxKey].changed(uuid.v1())

// handle message received
client.onMessage((m, s, r, e) => {
    newInbox(r, null, true)
    saveMessage({
        message: m,
        senderId: s,
        receiverIds: r,
        encrypted: e,
    })
})

generateInboxBonds()
export default {
    inboxBonds,
    newInboxBond,
    getMessages,
    getChatUserIds,
    getInboxKey,
    getTrollboxUserIds,
    historyLimit,
    inboxSettings,
    newInbox,
    send,
    removeInbox,
    removeInboxMessages,
}