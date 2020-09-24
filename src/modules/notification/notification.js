import { BehaviorSubject, Subject } from 'rxjs'
import DataStorage from '../../utils/DataStorage'
// services
import client, { getUser, rxIsLoggedIn } from '../../services/chatClient'
import { translated } from '../../services/language'
import { getProject } from '../../services/project'
import { addToQueue, QUEUE_TYPES } from '../../services/queue'
import storage from '../../services/storage'
import { queueables } from '../../modules/timekeeping/timekeeping'
import TotemLogo from '../../assets/totem-button-grey.png'
import { rxVisible as rxWindowVisbile } from '../../services/window'

export const MODULE_KEY = 'notifications'
storage.settings.module('totem_notifications', null)
const rw = value => storage.settings.module(MODULE_KEY, value) || {}
const notifications = new DataStorage('totem_' + MODULE_KEY)
const itemRenderers = {}
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
    activity: 'Activity',
    acceptInvitation: 'accept invitation',
    acceptedInvitation: 'accepted invitation to activity',
    rejectInvitation: 'reject invitation',
    rejectedInvitation: 'rejected invitation to activity',
    timekeeping: 'Timekeeping',
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
    if (!browserNotification) return
    const { id: userId } = getUser() || {}
    const { childType, from, message, type } = notification
    if (userId === from) return console.log('same user', { id, notification })
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

export const toggleRead = id => {
    const item = notifications.get(id)
    if (!item) return
    item.read = !item.read
    notifications.set(id, item)

    addToQueue({
        silent: true,
        type: QUEUE_TYPES.CHATCLIENT,
        func: 'notificationSetStatus',
        args: [id, item.read, false]
    })
}

export const remove = id => setTimeout(() => {
    notifications.delete(id)

    addToQueue({
        silent: true,
        type: QUEUE_TYPES.CHATCLIENT,
        func: 'notificationSetStatus',
        args: [id, null, true]
    })
})

/**
 * @name    setItemRenderer
 * @summary allows each module to set how respective notifcation item to be rendered
 * 
 * @param   {String}    type        Notification type as used in messaging service.
 *                                  Typically should be a module key
 * @param   {String}    chileType   Child notification type as used in messaging service. 
 *                                  Typically should correspond to an action
 * @param   {Function}  renderer      function to be invoked before renering a notification item.
 *                                  Args =>
 *                                      @notification   object: notification details
 *                                      @id             string: notification ID
 *                                  Expected return: one of the following
 *                                      1. JSX/HTML element: element to be displayed for the notification
 *                                      2. `null`: ignore/hide this notification
 *                                      3. none of above: display generic item view
 */
export const setItemRenderer = (type, childType, renderer) => {
    const key = `${type}:${childType}`
    // SHOULD not occur
    if (itemRenderers[key]) console.log(
        'Notifcation item render function being overriden:',
        { previous: itemRenderers[key], new: renderer }
    )
    itemRenderers[key] = renderer
}

// respond to time keeping invitation
export const handleTKInvitation = (
    projectId, workerAddress, accepted,
    // optional args
    projectOwnerId, projectName, notificationId
) => new Promise(resolve => {
    const type = 'timekeeping'
    const childType = 'invitation'
    const currentUserId = (getUser() || {}).id
    // find notification if not supplied
    notificationId = notificationId || Array.from(notifications.search({
        from: projectOwnerId,
        type,
        childType,
    })).reduce((notifyId, [xNotifyId, xNotification]) => {
        if (!!notifyId) return notifyId
        const { data: { projectHash: hash, workerAddress: address } } = xNotification
        const match = hash === projectId && address === workerAddress
        return match ? xNotifyId : null
    }, null)

    const getprops = (projectOwnerId, projectName) => queueables.worker.accept(projectId, workerAddress, accepted, {
        title: `${textsCap.timekeeping} - ${accepted ? textsCap.acceptInvitation : textsCap.rejectInvitation}`,
        description: `${textsCap.activity}: ${projectName}`,
        then: success => !success && resolve(false),
        // no need to notify if rejected or current user is the project owner
        next: !accepted || !projectOwnerId || projectOwnerId === currentUserId ? undefined : {
            address: workerAddress, // for automatic balance check
            type: QUEUE_TYPES.CHATCLIENT,
            func: 'notify',
            args: [
                [projectOwnerId],
                type,
                'invitation_response',
                `${accepted ? textsCap.acceptedInvitation : textsCap.rejectedInvitation}: "${projectName}"`,
                { accepted, projectHash: projectId, projectName, workerAddress },
                err => {
                    !err && notificationId && remove(notificationId)
                    resolve(!err)
                }
            ]
        }
    })

    if (!!projectOwnerId && !!projectName) return addToQueue(getprops(projectOwnerId, projectName))

    // retrieve project details to get project name and owners user id
    getProject(projectId).then(project => {
        const { name, userId } = project || {}
        addToQueue(getprops(userId, name))
    })
})

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
    const isNew = rw().tsLastReceived < tsCreated
    if (!isNew) return
    rw({ tsLastReceived: tsCreated })
    !read && notify(id, newNotification)
    rxNewNotification.next(id)
    console.log('Notification received!', id, from, tsCreated)
})

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
                Notification.requestPermission().then(
                    permission => browserNotification = permission === 'granted'
                )
        }
    }

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
        const mostRecentId = itemsArr[0][0]
        const mostRecent = itemsArr[0][1]
        const gotNew = itemsArr.find(([_, { tsCreated }]) => tsCreated > tsLastReceived)

        // save latest item's timestamp as last received
        rw({ tsLastReceived: mostRecent.tsCreated })
        notifications.setAll(items, true).sort('tsCreated', true, true)
        if (!gotNew) return

        rxNewNotification.next(mostRecentId)

        !mostRecent.read && notify(mostRecentId, mostRecent)
    })
})

rxWindowVisbile.subscribe(visible => {
    if (!visible) return
    while (openNotifications.length > 0) {
        openNotifications.pop().close()
    }
})


export default {
    MODULE_KEY,
    rxNewNotification,
    rxNotifications,
    rxVisible,
    rxUnreadCount,
    remove,
    setItemHandler: setItemRenderer,
    toggleRead,
}