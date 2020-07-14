import { Bond } from 'oo7'
import DataStorage from '../../utils/DataStorage'
// services
import client, { getUser } from '../../services/chatClient'
import { translated } from '../../services/language'
import { getProject } from '../../services/project'
import { addToQueue, QUEUE_TYPES } from '../../services/queue'
import storage from '../../services/storage'
import { workerTasks } from '../../services/timeKeeping'
import { mapSort } from '../../utils/utils'

export const MODULE_KEY = 'totem_notifications'
const rw = value => storage.settings.module(MODULE_KEY, value) || {}
export const notifications = new DataStorage(MODULE_KEY, true)
export const newNotificationBond = new Bond()
export const visibleBond = new Bond().defaultTo(false)
export const unreadCountBond = new Bond().defaultTo(getUnreadCount())

const [texts] = translated({
    timekeeping: 'Timekeeping',
    activity: 'Activity',
    acceptInvitation: 'accept invitation',
    acceptedInvitation: 'accepted invitation to activity',
    rejectInvitation: 'reject invitation',
    rejectedInvitation: 'rejected invitation to activity',
})

client.onNotify((id, from, type, childType, message, data, tsCreated) => {
    if (notifications.get(id)) console.log('notification exists', { id })
    const newNotification = {
        from,
        type,
        childType,
        message,
        data,
        tsCreated,
        deleted: false,
        read: false,
    }
    setTimeout(() => {
        rw({ tsLastReceived: tsCreated })
        notifications.set(id, newNotification).sort('tsCreated', true, true)
        unreadCountBond.changed(getUnreadCount())
        newNotificationBond.changed(id)
        console.log('Notification received!', id, from, tsCreated)
    })
})

client.onConnect(() => {
    if (!(getUser() || {}).id) return // ignore if not registered
    const { tsLastReceived } = rw()
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
        unreadCountBond.changed(getUnreadCount())
        gotNew && newNotificationBond.changed(mostRecentId)
    })
})

function getUnreadCount() {
    const all = notifications.getAll()
    if (!all.size) return -1
    return Array.from(all)
        .map(([_, { read }]) => !read)
        .filter(Boolean)
        .length
}

export const toggleRead = id => {
    const item = notifications.get(id)
    item.read = !item.read
    notifications.set(id, item)
    unreadCountBond.changed(getUnreadCount())

    addToQueue({
        silent: true,
        type: QUEUE_TYPES.CHATCLIENT,
        func: 'notificationSetStatus',
        args: [id, item.read, false]
    })
}

export const remove = id => setTimeout(() => {
    notifications.delete(id)
    if (!notifications.size) visibleBond.changed(false)

    addToQueue({
        silent: true,
        type: QUEUE_TYPES.CHATCLIENT,
        func: 'notificationSetStatus',
        args: [id, null, true]
    })
})

// respond to time keeping invitation
export const handleTKInvitation = (
    projectHash, workerAddress, accepted,
    // optional args
    projectOwnerId, projectName, notificationId
) => new Promise(resolve => {
    const type = 'time_keeping'
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
        const match = hash === projectHash && address === workerAddress
        return match ? xNotifyId : null
    }, null)

    const getprops = (projectOwnerId, projectName) => workerTasks.accept(projectHash, workerAddress, accepted, {
        title: `${texts.timekeeping} - ${accepted ? texts.acceptInvitation : texts.rejectInvitation}`,
        description: `${texts.activity}: ${projectName}`,
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
                `${accepted ? texts.acceptedInvitation : texts.rejectedInvitation}: "${projectName}"`,
                { accepted, projectHash, projectName, workerAddress },
                err => {
                    !err && notificationId && remove(notificationId)
                    resolve(!err)
                }
            ]
        }
    })

    if (!!projectOwnerId && !!projectName) return addToQueue(getprops(projectOwnerId, projectName))

    // retrieve project details to get project name and owners user id
    getProject(projectHash).then(project => {
        const { name, userId } = project || {}
        addToQueue(getprops(userId, name))
    })
})