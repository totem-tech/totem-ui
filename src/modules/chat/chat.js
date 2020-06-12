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
// read/write to module settings
const rw = value => storage.settings.module(MODULE_KEY, value) || {}
// notifies when a specific inbox view requires update
export const inboxBonds = {}
// notifies when new conversation is created, hidden or unhidden
export const newInboxBond = new Bond()
export const newMsgBond = new Bond()
export const openInboxBond = new Bond().defaultTo(rw().openInboxKey)
export const pendingMessages = {}
export const unreadCountBond = new Bond().defaultTo(getUnreadCount())
export const visibleBond = new Bond().defaultTo(!!rw().visible)
openInboxBond.tie(key => rw({ openInboxKey: key })) // remember last open inbox key
visibleBond.tie(visible => rw({ visible }))

const generateInboxBonds = (onload = false) => {
    const allKeys = Array.from(chatHistory.getAll())
        .map(([key]) => key)
    const s = inboxSettings(EVERYONE)
    const showTrollbox = !s.hide && !s.deleted
    if (onload && !allKeys.includes(EVERYONE) && showTrollbox) {
        allKeys.push(EVERYONE)
        createInbox([EVERYONE])
    }

    allKeys.forEach(inboxKey => {
        pendingMessages[inboxKey] = pendingMessages[inboxKey] || []
        if (inboxSettings(inboxKey).hide) {
            delete inboxBonds[inboxKey]
            return
        }
        if (inboxBonds[inboxKey]) return
        inboxBonds[inboxKey] = new Bond()
    })
}
setTimeout(() => generateInboxBonds(true))

// unique user ids from all messages in chat history
export const getChatUserIds = (includeTrollbox = true) => arrUnique(Object.keys(inboxBonds)
    .filter(key => key !== EVERYONE)
    .map(key => key.split(','))
    .flat()
    .concat(includeTrollbox ? getTrollboxUserIds() : []))

// returns inbox storage key
export const getInboxKey = receiverIds => {
    receiverIds = arrUnique(receiverIds)
    const { id: userId } = getUser() || {}
    const index = receiverIds.indexOf(userId)
    if (index >= 0) receiverIds.splice(index, 1)
    // Trollbox
    if (receiverIds.includes(EVERYONE)) return EVERYONE
    // Trollbox
    if (receiverIds.includes('trollbox')) return EVERYONE
    // Private chat
    if (receiverIds.length === 1) return receiverIds[0]
    // Group chat
    return arrUnique([...receiverIds, userId])
        .filter(Boolean)
        .sort()
        .join()
}

export const getMessages = inboxKey => {
    const { id: userId } = getUser() || {}
    if (!userId) return []
    const messages = chatHistory.get(inboxKey) || []
    return [...messages, ...(pendingMessages[inboxKey] || [])]
}

// unique user ids from Trollbox chat history
export const getTrollboxUserIds = () => {
    const messages = chatHistory.get(EVERYONE) || []
    return arrUnique(messages.map(x => x.senderId))
}

export function getUnreadCount() {
    return Object.keys(inboxBonds)
        .filter(k => !visibleBond._value || k !== openInboxBond._value)
        .reduce((count, key) => {
            const { unread } = inboxSettings(key)
            return count + (unread || 0)
        }, 0)
}

// get/set hidden inbox keys list
export const hiddenInboxKeys = () => {
    const allKeys = Array.from(chatHistory.getAll()).map(x => x[0])
    const settings = rw().inbox || {}
    return allKeys.filter(key => settings[key] && settings[key].hide)
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
    let settings = rw().inbox || {}
    if (value === null) delete settings[inboxKey]
    if (!isObj(value)) return settings[inboxKey] || {}

    settings[inboxKey] = { ...settings[inboxKey], ...value }
    settings = rw({ inbox: settings }).inbox

    generateInboxBonds()
    inboxBonds[inboxKey] && inboxBonds[inboxKey].changed(uuid.v1())
    //update unread count bond
    if (triggerReload) {
        unreadCountBond.changed(getUnreadCount())
        newInboxBond.changed(uuid.v1())
    }
    return settings[inboxKey] || {}
}

// all inbox settings
export const inboxesSettings = () => rw().inbox || {}

// create/get inbox key
export const createInbox = (receiverIds = [], name, reload = false) => {
    const inboxKey = getInboxKey(receiverIds)
    let settings = {
        ...inboxSettings(inboxKey),
        deleted: false, // force undelete
        hide: false, // force unarchive
    }
    settings.name = name || settings.name
    !chatHistory.get(inboxKey) && chatHistory.set(inboxKey, [])
    inboxSettings(inboxKey, settings, reload)
    return inboxKey
}

export const removeInbox = inboxKey => {
    chatHistory.delete(inboxKey)
    delete inboxBonds[inboxKey]
    inboxSettings(inboxKey, { deleted: true })
    newInboxBond.changed(uuid.v1())
    openInboxBond.changed(null)
}

export const removeInboxMessages = inboxKey => chatHistory.set(inboxKey, []) | inboxBonds[inboxKey].changed(uuid.v1())

export const removeMessage = (inboxKey, id) => {
    const messages = chatHistory.get(inboxKey)
    const index = messages.findIndex(msg => msg.id === id)
    if (index === -1) return
    messages.splice(index, 1)
    chatHistory.set(inboxKey, messages)
    inboxBonds[inboxKey].changed(uuid.v1())
}

const saveMessage = msg => {
    let { action, message, senderId, receiverIds, encrypted, timestamp, status = 'success', id, errorMessage } = msg
    receiverIds = receiverIds.sort()
    const inboxKey = getInboxKey(receiverIds)
    const messages = chatHistory.get(inboxKey) || []
    const limit = historyLimit()
    let msgItem = messages.find(x => x.id === id)
    const { id: userId } = getUser() || {}
    const settings = inboxSettings(inboxKey)
    const newSettings = {}
    if (id && msgItem) {
        // update existing item
        msgItem.status = status
        msgItem.timestamp = timestamp
    } else {
        msgItem = messages.find(x => x.senderId === senderId && x.timestamp === timestamp && x.status === status)
        if (!msgItem) {
            msgItem = {
                action,
                encrypted,
                errorMessage,
                id: id || uuid.v1(),
                message,
                receiverIds,
                senderId,
                status,
                timestamp,
            }
            messages.push(msgItem)
        }
    }

    if (isObj(action)) switch (action.type) {
        case 'message-group-name':
            const [name] = action.data || []
            const { name: oldName } = settings
            if (!name || name === oldName) break
            newSettings.name = name
    }

    chatHistory.set(inboxKey, messages.slice(-limit))
    // new mesage received
    const isVisible = visibleBond._value && openInboxBond._value === inboxKey
    if (senderId !== userId && !isVisible) {
        newSettings.unread = (settings.unread || 0) + 1
    }
    if (timestamp) rw({ lastMessageTS: timestamp })
    generateInboxBonds()
    inboxBonds[inboxKey].changed(uuid.v1())
    if (Object.keys(newSettings).length) inboxSettings(inboxKey, newSettings, true)
    return msgItem
}

// send message
export const send = (receiverIds, message, encrypted = false) => {
    const { id: senderId } = getUser() || {}
    if (!senderId) return
    const tempId = uuid.v1()
    const inboxKey = getInboxKey(receiverIds)
    const saveMsg = (id, status, timestamp, errorMessage) => {
        const msg = {
            message,
            senderId,
            receiverIds,
            encrypted,
            timestamp,
            status,
            id,
            errorMessage,
        }
        if (status === 'error') return saveMessage(msg)
        const removePending = status === 'success'
        let msgs = pendingMessages[inboxKey] || []
        if (removePending) {
            msgs = msgs.filter(m => m.id === id)
        } else {
            msgs.push(msg)
        }
        pendingMessages[inboxKey] = msgs
        inboxBonds[inboxKey].changed(uuid.v1())
    }

    saveMsg(tempId, 'loading')

    addToQueue({
        args: [
            receiverIds,
            message,
            false,
            (err, timestamp, id) => saveMsg(id, err ? 'error' : 'success', timestamp, err),
        ],
        func: 'message',
        silent: true,
        type: QUEUE_TYPES.CHATCLIENT,
    })
}

// retrieve unread messages on re/connect
client.onConnect(() => {
    // retrieve any unread recent messages  // // check & retrieve any unread mesages
    const { lastMessageTS } = rw()
    client.messageGetRecent(lastMessageTS, (err, messages = []) => {
        if (err) return console.log('Failed to retrieve recent inbox messages', err)
        messages.forEach(saveMessage)
    })
})

// handle message received
client.onMessage((m, s, r, e, t, id, action) => {
    const inboxKey = getInboxKey(r)
    // prevent saving trollbox messages if hidden
    if (inboxKey === EVERYONE && inboxSettings(inboxKey).hide) return
    createInbox(r, null, true)
    saveMessage({
        action,
        id,
        encrypted: e,
        message: m,
        receiverIds: r,
        senderId: s,
        status: 'success',
        timestamp: t,
    })
    newMsgBond.changed(id)
})

export default {
    inboxBonds,
    newInboxBond,
    newMsgBond,
    openInboxBond,
    pendingMessages,
    visibleBond,
    unreadCountBond,
    getMessages,
    getChatUserIds,
    getInboxKey,
    getTrollboxUserIds,
    historyLimit,
    inboxSettings,
    newInbox: createInbox,
    send,
    removeInbox,
    removeInboxMessages,
}