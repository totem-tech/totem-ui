import { BehaviorSubject, Subject } from 'rxjs'
import DataStorage from '../../utils/DataStorage'
import { isArr, isBool, isFn, isObj } from '../../utils/utils'
// services
import client, { getUser, rxIsLoggedIn } from '../chat/ChatClient'
import { translated } from '../../services/language'
import { addToQueue, QUEUE_TYPES, rxOnSave } from '../../services/queue'
import storage from '../../services/storage'
import TotemLogo from '../../assets/totem-button-grey.png'
import { MOBILE, rxLayout, rxVisible as rxWindowVisbile } from '../../services/window'

export const MODULE_KEY = 'notifications'
// remove legacy notifications data
storage.settings.module('totem_notifications', null)
const rw = value => storage.settings.module(MODULE_KEY, value) || {}
const notifications = new DataStorage('totem_' + MODULE_KEY)
export const itemViewHandlers = {}
export const rxNewNotification = new Subject()
export const rxNotifications = notifications.rxData
export const rxVisible = new BehaviorSubject(false)
export const rxUnreadCount = new BehaviorSubject(getUnreadCount())
let browserNotification = null
const openNotifications = []
rxNotifications.subscribe(() => {
    const unreadCount = getUnreadCount()
    // auto update unread count
    rxUnreadCount.next(unreadCount)
    // change visibility if no notificaitons left
    if (!notifications.size) rxVisible.next(false)
})

const textsCap = translated({
    newTitle: 'new notification received',
}, true)[1]

function getUnreadCount() {
    const all = notifications.getAll()
    if (!all.size) return -1
    return Array.from(all)
        .map(([_, { read }]) => !read)
        .filter(Boolean)
        .length
}

const notify = (id, notification) => setTimeout(() => {
    const isMobile = rxLayout.value === MOBILE
    if (!browserNotification || isMobile) return

    const { id: userId } = getUser() || {}
    const { childType, from, message, type } = notification
    if (userId === from) return
    const options = {
        badge: TotemLogo,
        body: message || `@${from}: ${type} ${childType}`,
        data: id,
        icon: TotemLogo,
        renotify: false,
        requireInteraction: !rxWindowVisbile.value,
        tag: type,
        vibrate: true,
    }
    try {
        const instance = new Notification(`${textsCap.newTitle} (${rxUnreadCount.value})`, options)
        !rxWindowVisbile.value && openNotifications.push(instance)
    } catch (e) {
        // service worker required for mobile
        browserNotification = false
    }
})

/**
 * @name    getMatchingIds
 * @summary get notifications matching specific values and data
 * 
 * @param   {Object}    values  notification values to match
 * @param   {Object}    data    (optional) notification data
 * 
 * @returns {Array}     notification IDs
 */
export const getMatchingIds = (values = {}, data = {}) => {
    const result = notifications.search(values, true, true, true)
    // no matching notificaion found
    if (!result.size) return

    const resultArr = Array.from(result)
    const dataKeys = isObj(data) ? Object.keys(data) : []
    const ids = dataKeys.length ? [] : resultArr.map(([id]) => id)
    // find notifications matching data
    dataKeys.length && resultArr.forEach(([id, { data: iData }]) => {
        const match = dataKeys.every(key => data[key] === iData[key])
        match && ids.push(id)
    })
    return ids
}

/**
 * @name    remove
 * @summary remove one or more notificaiton by ID(s)
 * 
 * @param {String|Array} ids notification ID(s)
 */
export const remove = ids => setTimeout(() => {
    ids = (isArr(ids) ? ids : [ids]).filter(Boolean)
    if (!ids.length) return // nothing to do
    notifications.delete(ids)

    ids.forEach(id => addToQueue({
        args: [id, null, true],
        func: 'notificationSetStatus',
        notificationId: id,
        silent: true,
        type: QUEUE_TYPES.CHATCLIENT,
    }))
})

/**
 * @name    removeMatching
 * @summary remove all notifications matching extact notification values and data
 * 
 * @param   {Object}    values  notification values to match
 * @param   {Object}    data    (optional) notification data
 */
export const removeMatching = (values, data) => remove(getMatchingIds(values, data))

/**
 * @name    search
 * @summary search notifications
 */
export const search = (...args) => notifications.search.apply(notifications, args)

/**
 * @name        setCustomViewHandler
 * @summary     set notification item renderer for specific notification `type` and `childType`
 * @description allows each module to set how respective notifcation item to be rendered
 * 
 * @param   {String}    type        Notification type as used in messaging service.
 *                                  Typically should be a module key
 * @param   {String}    chileType   Child notification type as used in messaging service. 
 *                                  Typically should correspond to an action
 * @param   {Function}  renderer      function to be invoked before renering a notification item.
 *                                  Args =>
 *                                      @notification   object: notification details
 *                                      @id             string: notification ID
 *                                      @extra          object
 *                                  Must return an Object to be used with `Message` component. 
 *                                  Required Properties: @content {String|Element}
 */
export const setItemViewHandler = (type, childType, renderer) => {
    if (!isFn(renderer)) return
    const key = `${type}:${childType || ''}`
    itemViewHandlers[key] = renderer
}

/**
 * @name    toggleRead
 * @summary toggle notification read status
 * 
 * @param   {String}    id   Notification ID
 * @param   {Boolean}   read (optional) set specific read status
 */
export const toggleRead = (id, read) => {
    const item = notifications.get(id)
    if (!item) return
    read = isBool(read)
        ? read
        : !item.read
    notifications.set(id, { ...item, read })

    addToQueue({
        args: [id, read, false],
        func: 'notificationSetStatus',
        recordId: id,
        type: QUEUE_TYPES.CHATCLIENT,
        silent: true,
    })
}

// initialize
setTimeout(() => {
    // handle new notification received
    client.onNotify((id, from, type, childType, message, data, tsCreated, read = false, deleted = false) => {
        if (deleted) return notifications.delete(id)
        const newNotification = {
            from,
            type,
            childType,
            message,
            data,
            tsCreated,
            deleted,
            read,
        }
        notifications.set(id, newNotification).sort('tsCreated', true, true)
        const { tsLastReceived } = rw()
        const isNew = !tsLastReceived || tsLastReceived < tsCreated
        if (!isNew) return
        rw({ tsLastReceived: tsCreated })
        !read && notify(id, newNotification)
        rxNewNotification.next([id, newNotification])
        console.log('Notification received!', id, from, tsCreated)
    })

    // do stuff whenever user logs in
    rxIsLoggedIn.subscribe(isLoggedIn => {
        // ignore if not logged in
        if (!isLoggedIn) return
        const { tsLastReceived } = rw()

        // Request permission to use browser notifications
        if (browserNotification === null && !!window.Notification) {
            switch (Notification.permission) {
                case 'granted':
                    browserNotification = true
                    break
                case 'denied':
                    browserNotification = false
                    break
                case 'default':
                // Notification.requestPermission().then(
                //     permission => browserNotification = permission === 'granted'
                // )
            }
        }

        // retrieve any new notifications since last logout
        client.notificationGetRecent(null, (err, items) => {
            if (!items.size) return err && console.log('client.notificationGetRecent', err)
            const itemsArr = Array.from(items)
                .filter(([id, { deleted }]) => {
                    // remove items deleted by user's other devices
                    if (deleted) {
                        notifications.delete(id)
                        items.delete(id)
                    }
                    return !deleted
                })
            const [mostRecentId, mostRecent] = itemsArr[0] || []
            const gotNew = itemsArr.find(([_, { tsCreated }]) => tsCreated > tsLastReceived)

            // save latest item's timestamp as last received
            mostRecent && rw({ tsLastReceived: mostRecent.tsCreated })
            notifications.setAll(items, true).sort('tsCreated', true, true)
            if (!gotNew) return

            mostRecentId && rxNewNotification.next([mostRecentId, mostRecent])

            mostRecent && !mostRecent.read && notify(mostRecentId, mostRecent)
        })
    })

    // clear browser notifications whenver tab is visible
    rxWindowVisbile.subscribe(visible => {
        if (!visible) return
        while (openNotifications.length > 0) {
            openNotifications.pop().close()
        }
    })

    // mark notifications as loading whenever queue service processes a notification response
    rxOnSave.subscribe(data => {
        if (!data) return
        let { task: { notificationId: ids, status } } = data
        ids = (isArr(ids) ? ids : [ids]).filter(Boolean)
        ids.forEach(id => {
            const notification = notifications.get(id)
            notification && notifications.set(id, { ...notification, status })
        })
    })
})

export default {
    MODULE_KEY,
    rxNewNotification,
    rxNotifications,
    rxVisible,
    rxUnreadCount,
    remove,
    setItemViewHandler,
    toggleRead,
}