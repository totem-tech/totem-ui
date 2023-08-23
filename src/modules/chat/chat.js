import { BehaviorSubject, Subject } from 'rxjs'
import uuid from 'uuid'
import {
    addToQueue,
    QUEUE_TYPES,
    rxOnSave,
    statuses,
} from '../../services/queue'
import client, {
    getUser,
    rxIsLoggedIn,
    rxIsRegistered,
} from '../../utils/chatClient'
import DataStorage from '../../utils/DataStorage'
import storage from '../../utils/storageHelper'
import { subjectAsPromise } from '../../utils/reactjs'
import {
    arrUnique,
    deferred,
    isArr,
    isDefined,
    isObj,
    isPositiveInteger,
    isValidNumber,
} from '../../utils/utils'
import {
    getLayout,
    MOBILE,
    setClass,
} from '../../utils/window'

const PREFIX = 'totem_'
const MODULE_KEY = 'chat-history'
const INTERVAL_FREQUENCY_MS = 60000 // check online status every 60 seconds
const DEFAULT_LIMIT = 200
export const TROLLBOX = 'everyone'
export const TROLLBOX_ALT = 'trollbox' // alternative ID for trollbox
export const SUPPORT = 'support'
// messages storage
const chatHistory = new DataStorage(PREFIX + MODULE_KEY)
export const rxChatHistory = chatHistory.rxData
// read/write to module settings
const rw = value => storage.settings.module(MODULE_KEY, value) || {}
// inbox expanded view
// notifies when new conversation is created, hidden or unhidden
const initialSettings = rw()
export const rxInboxListChanged = new Subject()
// update inbox list with slight delay
rxInboxListChanged.deferred = deferred(() => {
    rxInboxListChanged.next(uuid.v1())
    const count = getUnreadCount()
    count !== rxUnreadCount.value && rxUnreadCount.next(count)
}, 100)
export const rxPendingMsgIds = new BehaviorSubject([])
// Triggered whenever new message is added/updated/deleted
export const rxMsg = new Subject() // value : [inboxkey: string, msg: object]
export const rxUnreadCount = new BehaviorSubject(getUnreadCount())
export const rxOpenInboxKey = new BehaviorSubject(initialSettings.openInboxKey)
export const rxExpanded = new BehaviorSubject(false)
// stores and notifies of online status changes of chat User IDs.
export const rxUsersOnline = new BehaviorSubject()
export const rxVisible = new BehaviorSubject(!!initialSettings.visible)

// checks and updates rxUsersOnline with online status of all inbox User IDs, excluding TROLLBOX and SUPPORT
export const checkOnlineStatus = () => {
    if (checkOnlineStatus.updatePromise) return
    const { id: userId } = getUser() || {}
    // unregistered user
    if (!userId) return
    let keys = Object.keys(inboxesSettings() || {})
    const excludedIds = [userId, TROLLBOX]
    const userIds = arrUnique(keys.map(key => key.split(',')).flat())
        .filter(id => id && !excludedIds.includes(id))
        .sort()
    if (!userIds.length) return rxUsersOnline.next(null)

    checkOnlineStatus.updatePromise = client.isUserOnline(userIds)

    checkOnlineStatus.updatePromise.then((online = {}) => {
        checkOnlineStatus.updatePromise = null
        // current user is online
        online[userId] = true
        // check if value changed
        if (JSON.stringify(online) === JSON.stringify(rxUsersOnline.value)) return
        rxUsersOnline.next(online)
    }, err => console.log('Failed to check user online status. ', err))
}

// create/get inbox key
export const createInbox = (receiverIds = [], name, setOpen = false) => {
    if (!isArr(receiverIds)) return

    receiverIds = receiverIds.filter(Boolean)
    if (!receiverIds.length) return

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
    if (rxIsRegistered.value && setOpen) {
        rxOpenInboxKey.next(inboxKey)
        rxVisible.next(true)
        getLayout() === MOBILE && rxExpanded.next(true)
    }
    return inboxKey
}

// unique user ids from all messages in chat history
export const getChatUserIds = (includeTrollbox = true) => arrUnique(
    Object.keys(inboxesSettings())
        .filter(key => key !== TROLLBOX)
        .map(key => key.split(','))
        .flat()
        .concat(includeTrollbox ? getInboxUserIds(TROLLBOX) : [])
)

// returns inbox storage key
export const getInboxKey = receiverIds => {
    receiverIds = isArr(receiverIds)
        ? receiverIds
        : [receiverIds]
    const { id: userId } = getUser() || {}
    receiverIds = arrUnique(receiverIds)
        .filter(id => id && id !== userId)

    // Trollbox
    if (receiverIds.includes(TROLLBOX) || !receiverIds.length) return TROLLBOX
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

export const getMessages = inboxKey => !inboxKey
    ? chatHistory.getAll()
    : [...chatHistory.get(inboxKey) || []]

// get list of User IDs by inbox key
export const getInboxUserIds = inboxKey => arrUnique(
    (chatHistory.get(inboxKey) || [])
        .map(x => x.senderId)
)

export function getUnreadCount() {
    const allSettings = rw().inbox || {}
    return Object.keys(allSettings)
        .reduce((count, key) => {
            const { deleted, hide, unread } = allSettings[key]
            return count + (!deleted && !hide && unread || 0)
        }, 0)
}

// get/set limit per inbox
export const historyLimit = (limit, applyNow) => {
    const update = isPositiveInteger(limit)
    limit = rw(
        !update
            ? undefined
            : { historyLimit: limit }
    ).historyLimit
    if (update && applyNow) {
        const newHistory = new Map()
        Array.from(chatHistory.getAll())
            .forEach(([inboxKey, messages = []]) =>
                newHistory.set(
                    inboxKey,
                    messages.slice(-limit)
                )
            )
        chatHistory.setAll(newHistory, true)
        rxInboxListChanged.deferred()
    }
    return isDefined(limit)
        ? limit
        : DEFAULT_LIMIT
}

// get/set inbox specific settings
export function inboxSettings(inboxKey, value) {
    if (!inboxKey) return {}
    let settings = rw().inbox || {}
    let oldSettings = settings[inboxKey] || {}
    if (value === null) delete settings[inboxKey]
    if (!isObj(value)) return oldSettings || {}

    const newSettings = { ...oldSettings, ...value }
    settings[inboxKey] = newSettings
    // save settings
    rw({ inbox: settings })

    rxInboxListChanged.deferred()

    return oldSettings || {}
}

// all inbox settings
export const inboxesSettings = () => rw().inbox || {}

// Jump to a specific message within an inbox. will hightlight and blink the message
export const jumpToMessage = (inboxKey, msgId) => {
    if (!inboxKey) return

    const isMobile = getLayout() === MOBILE
    if (rxOpenInboxKey.value !== inboxKey) {
        // makes sure inbox is not deleted or archived
        createInbox(inboxKey.split(','))
        // open this inbox
        rxOpenInboxKey.next(inboxKey)
    }
    isMobile && !rxExpanded.value && rxExpanded.next(true)
    // scroll to highlighted message
    setTimeout(() => {
        const msgEl = document.getElementById(msgId)
        const msgsEl = document.querySelector('.chat-container .messages')
        if (!msgEl || !msgsEl) return
        msgEl?.classList.add('blink')
        msgsEl?.classList.add('animate-scroll')
        msgsEl?.scrollTo(0, msgEl.offsetTop)
        setTimeout(() => {
            msgEl?.classList.remove('blink')
            msgsEl?.classList.remove('animate-scroll')
        }, 5000)
    }, 500)
}

export const removeInbox = (inboxKey, permanent = false, removeMessages = permanent) => {
    chatHistory.delete(inboxKey)
    inboxSettings(
        inboxKey,
        permanent
            ? null
            : { deleted: true, unread: 0 }
    )
    rxInboxListChanged.deferred()
    rxOpenInboxKey.next()
    removeMessages && removeInboxMessages(inboxKey, permanent)
}

export const removeInboxMessages = (inboxKey, permanent) => {
    !permanent
        ? chatHistory.set(inboxKey, [])
        : chatHistory.delete(inboxKey)
    rxInboxListChanged.deferred()
}

export const removeMessage = (inboxKey, id) => {
    const messages = chatHistory.get(inboxKey)
    const index = messages.findIndex(msg => msg.id === id)
    if (index === -1) return
    messages.splice(index, 1)
    chatHistory.set(inboxKey, messages)
    rxInboxListChanged.deferred()
}

const saveMessage = (msg, trigger = false) => {
    let {
        action,
        message,
        senderId,
        receiverIds,
        encrypted,
        timestamp,
        status = 'success',
        id,
        errorMessage,
    } = msg
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

    chatHistory.set(
        inboxKey,
        !limit
            ? messages
            : messages.slice(-limit)
    )
    const resetCount = rxVisible.value
        && rxOpenInboxKey.value === inboxKey
        && (getLayout() !== MOBILE || rxExpanded.value)
        && !!document.querySelector('.chat-container .inbox .scroll-to-bottom:not(.visible)')
    settings.unread = resetCount
        ? 0
        : unread + (senderId !== userId ? 1 : 0)

    // update settings
    inboxSettings(inboxKey, settings)

    // Store (global) last received (including own) message timestamp.
    // This is used to retrieve missed messages from server
    rw({ lastMessageTS: timestamp })

    trigger && rxMsg.next([inboxKey, msg])
}

// send message
export const send = (receiverIds, message, encrypted = false) => {
    const { id: senderId } = getUser() || {}
    if (!senderId) return // should not occur

    const tempId = uuid.v1()
    const msg = {
        message,
        senderId,
        receiverIds,
        encrypted,
        timestamp: new Date().toISOString(),
        status: statuses.LOADING,
        id: tempId,
        errorMessage: null,
    }

    // save as loading (sending in-progress)
    saveMessage(msg, true)

    // wait until user is logged in
    subjectAsPromise(rxIsLoggedIn, true)[0].then(() =>
        addToQueue({
            args: [
                receiverIds,
                message,
                false,
                // on success remove temporary/loading message
                // err => !err ? removeMessage(inboxKey, tempId) : saveMessage({ ...msg, status: statuses.ERROR }),
            ],
            func: 'message',
            silent: true,
            recordId: tempId,
            type: QUEUE_TYPES.CHATCLIENT,
        })
    )

    return tempId
}

// retrieve unread messages on re/connect
rxIsLoggedIn.subscribe(async loggedIn => {
    if (!loggedIn) return clearInterval(checkOnlineStatus.intervalId)
    const { lastMessageTS } = rw()
    // check & retrieve any unread mesages
    const messages = await client.messageGetRecent(lastMessageTS)
        .catch(err => console.log('Failed to retrieve recent inbox messages', err))
    messages.forEach(msg => saveMessage(msg, true))

    checkOnlineStatus()
    checkOnlineStatus.intervalId = setInterval(checkOnlineStatus, INTERVAL_FREQUENCY_MS)
})

// handle message received
client.onMessage((m, s, r, e, t, id, action) => {
    const inboxKey = getInboxKey(r)
    // const userIds = inboxKey
    //     .split(',')
    //     .filter(id =>
    //         ![SUPPORT, TROLLBOX]
    //             .includes(id)
    // )
    // userIds.forEach(id => online[id] = true)
    const online = { ...rxUsersOnline.value }
    // set sender status as online
    online[s] = true
    const onlineChanged = JSON.stringify(online) !== JSON.stringify(rxUsersOnline.value)
    onlineChanged && rxUsersOnline.next(online)

    // prevent saving trollbox messages if hidden
    if (inboxKey === TROLLBOX && inboxSettings(inboxKey).hide) return
    createInbox(r)
    const msg = {
        action,
        id,
        encrypted: e,
        message: m,
        receiverIds: r,
        senderId: s,
        status: 'success',
        timestamp: t,
    }
    saveMessage(msg, true)
    rxInboxListChanged.deferred()
})

// initialize
setTimeout(() => {
    // remove unwanted inbox created due to previous bug where an inbox would be created even though
    // `null` supplied to `createInbox` function
    removeInbox('null', true, true)
    removeInbox('undefined', true, true)

    const allSettings = rw().inbox || {}
    const { id: userId } = getUser() || {}
    const createSupportInbox = () => !allSettings[getInboxKey([SUPPORT])]
        && createInbox([SUPPORT])
    if (userId) {
        createSupportInbox()
    } else {
        // user hasn't registered yet
        const subscribed = rxIsLoggedIn.subscribe(success => {
            if (!success) return
            subscribed.unsubscribe()
            // registration successful
            createSupportInbox()
        })
    }
    if (!allSettings[getInboxKey([TROLLBOX])]) createInbox([TROLLBOX])

    // automatically mark inbox as read
    const handleChange = () => {
        const visible = rxVisible.value
        const inboxKey = rxOpenInboxKey.value
        const expanded = rxExpanded.value
        if (!inboxKey || !visible || !inboxKey) return

        if (getLayout() == MOBILE && !expanded) return
        inboxSettings(inboxKey).unread > 0
            && inboxSettings(inboxKey, { unread: 0 })
    }
    rxOpenInboxKey.subscribe(key => {
        setClass('body', { 'inbox-open': !!key })
        handleChange()
        if (!rxOpenInboxKey.ignoredFirst) {
            rxOpenInboxKey.ignoredFirst = true
            return
        }
        // remember last open inbox key
        rw({ openInboxKey: key })
    })
    rxVisible.subscribe(visible => {
        setClass('body', { 'chat-visible': visible })
        handleChange()

        if (!rxVisible.ignoredFirst) {
            rxVisible.ignoredFirst = true
            return
        }
        rw({ visible })
    })
    rxExpanded.subscribe(expand => {
        // add/remove 'inbox-expanded' class for styling purposes
        setClass('body', { 'inbox-expanded': expand })
        handleChange()
    })
    // remove if successful, otherwise, update status of queued chat message
    rxOnSave.subscribe(data => {
        if (!data) return
        const {
            task: {
                args,
                errorMessage,
                func,
                status,
                recordId: msgId,
                type,
            } = {}
        } = data
        const [receiverIds] = args || []
        // only handle outgoing chat messages
        if (func !== 'message' || type !== QUEUE_TYPES.CHATCLIENT) return

        const inboxKey = getInboxKey(receiverIds)
        let inboxMsgs = chatHistory.get(inboxKey) || []
        const msg = inboxMsgs.find(msg => msg.id === msgId)
        // not found |OR| already removed by user
        if (!msg) return

        // failed to send message
        switch (status) {
            case statuses.ERROR:
                msg.status = status
                msg.timestamp = new Date().toISOString()
                msg.errorMessage = errorMessage
                break
            case statuses.SUCCESS:
                // message sent successfully, remove temporary message
                inboxMsgs = inboxMsgs.filter(msg => msg.id !== msgId)
                rxInboxListChanged.deferred()
                break
            default: return // no change required
        }
        chatHistory.set(inboxKey, inboxMsgs)
        rxMsg.next([inboxKey, msg])
    })
})

export default {
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
    rxExpanded,
    rxInboxListChanged,
    rxMsg,
    rxOpenInboxKey,
    rxUnreadCount,
    rxVisible,
}