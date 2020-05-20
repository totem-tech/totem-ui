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
export let openInboxKeys = []
export const pendingMessages = {};
// on page lod remove any message with status 'loading' (unsent messages), as queue service will attempt to resend them
(() => {
    const allMsgs = chatHistory.getAll()
    Array.from(allMsgs)
        .forEach(([key, messages]) => chatHistory.set(
            key,
            messages.filter(x => x.status !== 'loading'))
        )
})()

const generateInboxBonds = () => {
    const allKeys = Array.from(chatHistory.getAll())
        .map(([key]) => key)
    if (!allKeys.includes(EVERYONE)) allKeys.push(EVERYONE)

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

export const getMessages = receiverIds => {
    const { id: userId } = getUser() || {}
    if (!userId) return []
    const inboxKey = getInboxKey(receiverIds)
    const messages = chatHistory.get(inboxKey) || []
    return [...messages, ...pendingMessages[inboxKey]]
}

// unique user ids from Trollbox chat history
export const getTrollboxUserIds = () => {
    const messages = chatHistory.get(EVERYONE) || []
    return arrUnique(messages.map(x => x.senderId))
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
    const remove = value === null
    if (!isObj(value) && !remove) return settings[inboxKey] || {}

    settings[inboxKey] = { ...settings[inboxKey], ...value }
    settings = rw({ inbox: settings }).inbox
    inboxBonds[inboxKey] && inboxBonds[inboxKey].changed(uuid.v1())
    generateInboxBonds()
    triggerReload && newInboxBond.changed(uuid.v1())
    return settings[inboxKey] || {}
}

// create/get inbox key
export const newInbox = (receiverIds = [], name, reload = false) => {
    const inboxKey = getInboxKey(receiverIds)
    let settings = inboxSettings(inboxKey)
    reload = reload || settings.hide
    !chatHistory.get(inboxKey) && chatHistory.set(inboxKey, [])
    inboxSettings(inboxKey, { ...settings, hide: false, name }, reload)
    return inboxBonds[inboxKey]
}

export const removeInbox = inboxKey => {
    chatHistory.delete(inboxKey)
    delete inboxBonds[inboxKey]
    newInboxBond.changed(uuid.v1)
}

export const removeInboxMessages = inboxKey => chatHistory.set(inboxKey, []) | inboxBonds[inboxKey].changed(uuid.v1())

export const removeMessage = (inboxKey, id) => {
    const messages = chatHistory.get(inboxKey)
    const index = messages.findIndex(msg => msg.id === id)
    if (index === -1) return
    messages.splice(index, 1)
    chatHistory.set(inboxKey, messages)
    // inboxBonds[inboxKey].changed(uuid.v1())
}

const saveMessage = msg => {
    let { action, message, senderId, receiverIds, encrypted, timestamp, status = 'success', id, errorMessage } = msg
    receiverIds = receiverIds.sort()
    const inboxKey = getInboxKey(receiverIds)
    const messages = chatHistory.get(inboxKey) || []
    const limit = historyLimit()
    let msgItem = messages.find(x => x.id === id)
    const { id: userId } = getUser() || {}
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

    if (isObj(action)) {
        switch (action.type) {
            case 'message-group-name':
                const [name] = action.data || []
                const { name: oldName } = inboxSettings(inboxKey)
                if (name && name !== oldName) newSettings.name = name
        }
    }
    chatHistory.set(inboxKey, messages.slice(messages.length - limit))
    // new mesage received
    if (senderId !== userId && !openInboxKeys.includes(inboxKey)) newSettings.unread = true
    if (timestamp) rw({ lastMessageTS: timestamp })
    // if (!inboxBonds[inboxKey]) {
    //     inboxBonds[inboxKey] = newInbox(receiverIds, null, true)
    // }
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
            // (err, timestamp) => err ? saveMsg('error', timestamp, err) : removeMessage(inboxKey, id),
        ],
        func: 'message',
        silent: true,
        type: QUEUE_TYPES.CHATCLIENT,
    })
}

export const setOpen = (inboxKey, open = true) => {
    if (open) {
        openInboxKeys = [...openInboxKeys, inboxKey]
        return
    }
    openInboxKeys = openInboxKeys.filter(k => k !== inboxKey)
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
    newInbox(r, null, true)
    saveMessage({
        action,
        id,
        encrypted: e,
        message: m,
        receiverIds: r,
        senderId: s,
        timestamp: t,
    })
})

// handle group name change
client.onMessageGroupName((receiverIds, groupName, senderId, timestamp, id) => {
    // const inboxKey = getInboxKey(receiverIds)
    // const history = chatHistory.get(inboxKey)
    // const settings = inboxSettings(inboxKey)
    // if (settings.name === groupName) return
    // const reload = history && !settings.hide
    // history && saveMessage({
    //     id,
    //     message: '',
    //     senderId,
    //     receiverIds,
    //     encrypted: false,
    //     timestamp,
    //     action: {
    //         data: [groupName],
    //         type: 'message-group-name',
    //     },
    // })
    // inboxSettings(inboxKey, { name: groupName }, reload)
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