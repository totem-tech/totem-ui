import DataStorage from '../../utils/DataStorage'
import uuid from 'uuid'
import { Bond } from 'oo7'
import { arrUnique, isObj, isValidNumber, isDefined } from '../../utils/utils'
import { addToQueue, QUEUE_TYPES } from '../../services/queue'
import client, { getUser } from '../../services/chatClient'
import storage from '../../services/storage'
import { getLayout, MOBILE } from '../../services/window'

const PREFIX = 'totem_'
const MODULE_KEY = 'chat-history'
export const TROLLBOX = 'everyone'
export const TROLLBOX_ALT = 'trollbox' // alternative ID for trollbox
export const SUPPORT = 'support'
// messages storage
const chatHistory = new DataStorage(PREFIX + MODULE_KEY, true)
// read/write to module settings
const rw = value => storage.settings.module(MODULE_KEY, value) || {}
// inbox expanded view
export const expandedBond = new Bond().defaultTo(false)
// notifies when new conversation is created, hidden or unhidden
export const inboxListBond = new Bond()
export const newMsgBond = new Bond() // value : [inboxkey, unique id]
export const openInboxBond = new Bond().defaultTo(rw().openInboxKey)
export const pendingMessages = {}
export const unreadCountBond = new Bond().defaultTo(getUnreadCount())
export const visibleBond = new Bond().defaultTo(!!rw().visible)

// create/get inbox key
export const createInbox = (receiverIds = [], name, reload = false, setOpen = false) => {
    const inboxKey = getInboxKey(receiverIds)
    let settings = inboxSettings(inboxKey)
    settings = {
        ...settings,
        createdTS: settings.createdTS || new Date(),
        deleted: false, // force undelete
        hide: false, // force unarchive
    }
    settings.name = name || settings.name
    !chatHistory.get(inboxKey) && chatHistory.set(inboxKey, [])
    inboxSettings(inboxKey, settings, reload)
    if (setOpen) {
        openInboxBond.changed(inboxKey)
        visibleBond.changed(true)
        getLayout() === MOBILE && expandedBond.changed(true)
    }
    return inboxKey
}

// unique user ids from all messages in chat history
export const getChatUserIds = (includeTrollbox = true) => arrUnique(Object.keys(inboxesSettings())
    .filter(key => key !== TROLLBOX)
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
    if (receiverIds.includes(TROLLBOX)) return TROLLBOX
    // Trollbox
    if (receiverIds.includes(TROLLBOX_ALT)) return TROLLBOX
    // Private chat
    if (!receiverIds.includes(SUPPORT) && receiverIds.length === 1) return receiverIds[0]
    // Group chat
    return arrUnique([...receiverIds, userId])
        .filter(Boolean)
        .sort()
        .join()
}

export const getMessages = inboxKey => [
    ...chatHistory.get(inboxKey) || [],
    ...(pendingMessages[inboxKey] || [])
]

// unique user ids from Trollbox chat history
export const getTrollboxUserIds = () => {
    const messages = chatHistory.get(TROLLBOX) || []
    return arrUnique(messages.map(x => x.senderId))
}

export function getUnreadCount() {
    const allSettings = rw().inbox || {}
    return Object.keys(allSettings)
        .reduce((count, key) => {
            const { deleted, hide, unread } = allSettings[key]
            return count + (!deleted && !hide && unread || 0)
        }, 0)
}

// get/set limit per inbox
export const historyLimit = limit => {
    limit = rw(
        !isValidNumber(limit) ? undefined : { historyLimit: limit }
    ).historyLimit
    return isDefined(limit) ? limit : 100
}

// get/set inbox specific settings
export function inboxSettings(inboxKey, value) {
    let settings = rw().inbox || {}
    let iSettings = settings[inboxKey] || {}
    if (value === null) delete settings[inboxKey]
    if (!isObj(value)) return iSettings || {}
    const { deleted, hide, name, unread } = iSettings
    settings[inboxKey] = { ...iSettings, ...value }
    settings = rw({ inbox: settings }).inbox
    iSettings = settings[inboxKey]

    // update unread count bond
    unread !== iSettings.unread && unreadCountBond.changed(getUnreadCount())
    inboxListBond.changed(uuid.v1())

    return iSettings || {}
}

// all inbox settings
export const inboxesSettings = () => rw().inbox || {}

export const removeInbox = inboxKey => {
    chatHistory.delete(inboxKey)
    inboxSettings(inboxKey, { deleted: true, unread: 0 })
    inboxListBond.changed(uuid.v1())
    openInboxBond.changed(null)
}

export const removeInboxMessages = inboxKey => chatHistory.set(inboxKey, []) | newMsgBond.changed([inboxKey, uuid.v1()])

export const removeMessage = (inboxKey, id) => {
    const messages = chatHistory.get(inboxKey)
    const index = messages.findIndex(msg => msg.id === id)
    if (index === -1) return
    messages.splice(index, 1)
    chatHistory.set(inboxKey, messages)
    newMsgBond.changed([inboxKey, id])
}

const saveMessage = msg => {
    let { action, message, senderId, receiverIds, encrypted, timestamp, status = 'success', id, errorMessage } = msg
    receiverIds = receiverIds.sort()
    const inboxKey = getInboxKey(receiverIds)
    const messages = chatHistory.get(inboxKey) || []
    let msgItem = messages.find(x => x.id === id)
    if (msgItem) return // prevent saving duplicate

    const limit = historyLimit()
    const { id: userId } = getUser() || {}
    let settings = {
        ...inboxSettings(inboxKey),
        lastMessageTS: timestamp,
    }
    const { name: oldName, unread } = settings

    messages.push({
        action,
        encrypted,
        errorMessage,
        id: id || ('local-' + uuid.v1()), // local only should be used when message failed to send
        message,
        receiverIds,
        senderId,
        status,
        timestamp,
    })

    // handle special messages
    if (isObj(action)) switch (action.type) {
        case 'message-group-name': // group name change
            const [name] = action.data || []
            if (!name || name === oldName) break
            settings.name = name
    }

    chatHistory.set(inboxKey, !limit ? messages : messages.slice(-limit))
    const resetCount = visibleBond._value && openInboxBond._value === inboxKey
        && getLayout() !== MOBILE || expandedBond._value
        && !!document.querySelector('.chat-container .inbox .scroll-to-bottom:not(.visible)')
    settings.unread = resetCount ? 0 : (senderId !== userId ? 1 : 0) + unread || 0

    // update settings
    inboxSettings(inboxKey, settings)

    // Store (global) last received (including own) message timestamp.
    // This is used to retrieve missed messages from server
    rw({ lastMessageTS: timestamp })
    // makes sure inbox bonds are generated
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
        if (status === 'error') saveMessage(msg)
        const removePending = ['error', 'success'].includes(status)
        let msgs = pendingMessages[inboxKey] || []
        if (removePending) {
            msgs = msgs.filter(m => m.id === id)
        } else {
            msgs.push(msg)
        }
        pendingMessages[inboxKey] = msgs
        newMsgBond.changed([inboxKey, id])
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
    if (!(getUser() || {}).id) return // ignore if not registered
    // check & retrieve any unread mesages
    client.messageGetRecent(rw().lastMessageTS, (err, messages = []) => {
        if (err) return console.log('Failed to retrieve recent inbox messages', err)
        messages.forEach(saveMessage)
    })
})

// handle message received
client.onMessage((m, s, r, e, t, id, action) => {
    const inboxKey = getInboxKey(r)
    // prevent saving trollbox messages if hidden
    if (inboxKey === TROLLBOX && inboxSettings(inboxKey).hide) return
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
    setTimeout(() => newMsgBond.changed([inboxKey, id]))
})

// initialize
[(() => {
    const allSettings = rw().inbox || {}
    if (!allSettings[getInboxKey([SUPPORT])]) createInbox([SUPPORT])
    if (!allSettings[getInboxKey([TROLLBOX])]) createInbox([TROLLBOX], false, true)

    // automatically mark inbox as read
    Bond.all([expandedBond, openInboxBond, visibleBond]).tie(([expanded, inboxKey, visible]) => {
        const doUpdate = visible && inboxKey && (getLayout() !== MOBILE || expanded) && inboxSettings(inboxKey).unread
        doUpdate && inboxSettings(inboxKey, { unread: 0 })
    })
    // add/remove 'inbox-expanded' class for styling purposes
    expandedBond.tie(expand => document.getElementById('app').classList[expand ? 'add' : 'remove']('inbox-expanded'))
    // remember last open inbox key
    openInboxBond.tie(key => rw({ openInboxKey: key }))
    // remember if chat is visible
    visibleBond.tie(visible => rw({ visible }))
})()]

export default {
    expandedBond,
    inboxListBond,
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