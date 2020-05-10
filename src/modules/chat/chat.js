import DataStorage from '../../utils/DataStorage'
import uuid from 'uuid'
import { Bond } from 'oo7'
import { arrUnique, isObj } from '../../utils/utils'
import { addToQueue, QUEUE_TYPES } from '../../services/queue'
import client, { getUser } from '../../services/chatClient'
import storage from '../../services/storage'

const PREFIX = 'totem_'
const MODULE_KEY = 'chat-history'
const EVERYONE = 'everyone'
const chatHistory = new DataStorage(PREFIX + MODULE_KEY, true)
// read/write to module settings
const rw = value => storage.settings.module(MODULE_KEY, value) || {}
const existingKeys = Array.from(chatHistory.getAll()).map(x => x[0])
// notifies when a specific inbox view requires update
export const inboxBonds = existingKeys.reduce((obj, key) => {
    obj[key] = new Bond()
    return obj
}, {})
if (!existingKeys.includes(EVERYONE)) existingKeys.push(EVERYONE)

export const newInboxBond = new Bond() // notifies on new conversation

const saveMessage = msg => {
    let { message, senderId, receiverIds, encrypted, timestamp, status = 'success', id, errorMessage } = msg
    receiverIds = receiverIds.sort()
    const key = getInboxKey(receiverIds)
    const messages = chatHistory.get(key) || []
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
    chatHistory.set(key, messages)
    inboxBonds[key] = inboxBonds[key] || new Bond()
    inboxBonds[key].changed(uuid.v1())
    return msgItem
}

// returns inbox storage key
export const getInboxKey = receiverIds => {
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

export const getChatUserIds = (includeTrollbox = true) => arrUnique(Object.keys(inboxBonds)
    .filter(key => key !== EVERYONE)
    .map(key => key.split(','))
    .flat()
    .concat(includeTrollbox ? getTrollboxUserIds() : []))

export const getMessages = receiverIds => {
    const { id: userId } = getUser() || {}
    if (!userId) return []
    const key = getInboxKey(receiverIds)
    const msgs = chatHistory.get(key) || []
    return msgs
}

// get/set inbox specific settings
export const inboxSettings = (inboxKey, value) => {
    let settings = rw()
    if (!isObj(value)) return settings[inboxKey] || {}
    settings[inboxKey] = { ...settings[inboxKey], ...value }
    return rw(settings)[inboxKey] || {}
}

export const getTrollboxUserIds = () => {
    const messages = chatHistory.get(EVERYONE) || []
    return arrUnique(messages.map(x => x.senderId))
}

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

// create/get inbox key
export const newInbox = (receiverIds = [], name, notify = false) => {
    const key = getInboxKey(receiverIds)
    if (!inboxBonds[key]) {
        inboxBonds[key] = new Bond()
        chatHistory.set(key, [])
        name && inboxSettings(key, { name, ignore: false })
        notify && setTimeout(() => newInboxBond.changed(uuid.v1()))
    }
    return inboxBonds[key]
}

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

export default {
    newInbox,
    send,
}