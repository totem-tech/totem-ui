import DataStorage from '../../utils/DataStorage'
import uuid from 'uuid'
import { Bond } from 'oo7'
import { arrUnique, isObj, isValidNumber, isDefined, objClean, deferredPromise } from '../../utils/utils'
import { addToQueue, QUEUE_TYPES } from '../../services/queue'
import client, { getUser, loginBond } from '../../services/chatClient'
import storage from '../../services/storage'
import { getLayout, MOBILE } from '../../services/window'

const PREFIX = 'totem_'
const MODULE_KEY = 'chat-history'
const INTERVAL_FREQUENCY_MS = 60000 // check online status every 60 seconds
const DEFAULT_LIMIT = 200
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
// stores and notifies of online status changes of chat User IDs.
export const userStatusBond = new Bond()
export const visibleBond = new Bond().defaultTo(!!rw().visible)

// checks and updates userStatusBond with online status of all inbox User IDs, excluding TROLLBOX and SUPPORT
export const checkOnlineStatus = () => {
    const { id: userId } = getUser() || {}
    // unregistered user
    if (!userId) return
    let keys = Object.keys(inboxesSettings() || {})
    const excludedIds = [userId, TROLLBOX]
    const inboxUserIds = keys.map(key => key.split(',').filter(id => !excludedIds.includes(id)))
    const userIds = arrUnique(inboxUserIds.flat())
    if (!userIds.length) {
        userStatusBond.changed()
        return
    }
    client.isUserOnline(userIds, (err, online = {}) => {
        if (err) console.log('Failed to check user online status. ', err)
        // current user is online
        online[userId] = true
        // check if value changed
        if (JSON.stringify(online) === JSON.stringify(userStatusBond._value)) return
        userStatusBond.changed(online)
    })
}

// create/get inbox key
export const createInbox = (receiverIds = [], name, setOpen = false) => {
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
    inboxSettings(inboxKey, settings)
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
    .concat(includeTrollbox ? getInboxUserIds(TROLLBOX) : []))

// returns inbox storage key
export const getInboxKey = receiverIds => {
    const { id: userId } = getUser() || {}
    receiverIds = arrUnique(receiverIds).filter(id => id !== userId)

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

export const getMessages = inboxKey => !inboxKey ? chatHistory.getAll() : [
    ...chatHistory.get(inboxKey) || [],
    ...(pendingMessages[inboxKey] || [])
]

// get list of User IDs by inbox key
export const getInboxUserIds = inboxKey => arrUnique((chatHistory.get(inboxKey) || []).map(x => x.senderId))

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
    return isDefined(limit) ? limit : DEFAULT_LIMIT
}

// get/set inbox specific settings
export function inboxSettings(inboxKey, value) {
    let settings = rw().inbox || {}
    let oldSettings = settings[inboxKey] || {}
    if (value === null) delete settings[inboxKey]
    if (!isObj(value)) return oldSettings || {}
    const newSettings = { ...oldSettings, ...value }
    settings[inboxKey] = newSettings
    // save settings
    rw({ inbox: settings })

    // update unread count bond
    newSettings.unread !== oldSettings.unread && unreadCountBond.changed(getUnreadCount())
    const keys = ['deleted', 'hide', 'name', 'unread', 'lastMessageTS']
    const changed = JSON.stringify(objClean(oldSettings, keys)) !== JSON.stringify(objClean(newSettings, keys))
    changed && inboxListBond.changed(uuid.v1())

    return oldSettings || {}
}

// all inbox settings
export const inboxesSettings = () => rw().inbox || {}

// Jump to a specific message within an inbox. will hightlight and blink the message
export const jumpToMessage = (inboxKey, msgId) => {
    const isMobile = getLayout() === MOBILE
    if (openInboxBond._value !== inboxKey) {
        // makes sure inbox is not deleted or archived
        createInbox(inboxKey.split(','))
        // open this inbox
        openInboxBond.changed(inboxKey)
    }
    isMobile && !expandedBond._value && expandedBond.changed(true)
    // scroll to highlighted message
    setTimeout(() => {
        const msgEl = document.getElementById(msgId)
        const msgsEl = document.querySelector('.chat-container .messages')
        if (!msgEl || !msgsEl) return
        msgEl.classList.add('blink')
        msgsEl.classList.add('animate-scroll')
        msgsEl.scrollTo(0, msgEl.offsetTop)
        setTimeout(() => {
            msgEl.classList.remove('blink')
            msgsEl.classList.remove('animate-scroll')
        }, 5000)
    }, 500)
}

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
    let settings = inboxSettings(inboxKey)
    const { name: oldName, unread = 0 } = settings
    if ((settings.lastMessageTS || '') < timestamp) settings.lastMessageTS = timestamp

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
    settings.unread = resetCount ? 0 : unread + (senderId !== userId ? 1 : 0)

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
    const userIds = inboxKey.split(',').filter(id => ![SUPPORT, TROLLBOX].includes(id))
    const online = { ...userStatusBond._value }
    userIds.forEach(id => online[id] = true)
    // set sender status as online
    if (JSON.stringify(online) !== JSON.stringify(userStatusBond._value)) userStatusBond.changed(online)

    // prevent saving trollbox messages if hidden
    if (inboxKey === TROLLBOX && inboxSettings(inboxKey).hide) return
    createInbox(r)
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
    const { id: userId } = getUser() || {}
    let intervalId = null

    const createSupportInbox = () => !allSettings[getInboxKey([SUPPORT])] && createInbox([SUPPORT])
    if (userId) {
        createSupportInbox()
    } else {
        // user hasn't registered yet
        const tieId = loginBond.tie(success => {
            if (!success) return
            // registration successful
            loginBond.untie(tieId)
            createSupportInbox()
        })
    }
    if (!allSettings[getInboxKey([TROLLBOX])]) createInbox([TROLLBOX])

    // automatically mark inbox as read
    Bond.all([expandedBond, openInboxBond, visibleBond]).tie(([expanded, inboxKey, visible]) => {
        const doUpdate = visible && inboxKey && (getLayout() !== MOBILE || expanded) && inboxSettings(inboxKey).unread
        doUpdate && inboxSettings(inboxKey, { unread: 0 })
    })
    // add/remove 'inbox-expanded' class for styling purposes
    expandedBond.tie(expand => document.getElementById('app').classList[expand ? 'add' : 'remove']('inbox-expanded'))
    // remember last open inbox key
    openInboxBond.tie(key => rw({ openInboxKey: key }))

    userId && checkOnlineStatus()
    visibleBond.tie(visible => {
        // remember if chat is visible
        rw({ visible })
        intervalId && clearInterval(intervalId)
        if (!userId || !visible) return
        // enable/disble status check of User IDs
        intervalId = setInterval(checkOnlineStatus, INTERVAL_FREQUENCY_MS)
    })
})()]

export default {
    expandedBond,
    inboxListBond,
    newMsgBond,
    openInboxBond,
    pendingMessages,
    visibleBond,
    unreadCountBond,
    createInbox,
    getMessages,
    getChatUserIds,
    getInboxKey,
    getInboxUserIds,
    historyLimit,
    inboxSettings,
    send,
    removeInbox,
    removeInboxMessages,
}