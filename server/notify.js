import DataStorage from '../src/utils/DataStorage'
import uuid from 'uuid'
import { arrUnique, isArr, isFn, isObj, objHasKeys, objReadOnly, isStr } from '../src/utils/utils'
import { emitToUsers, getUserByClientId, idExists, isUserOnline, onUserLogin } from './users'

export const EVENT_NAME = 'notify'
const notifications = new DataStorage('notifications.json', true)
// Pending notification recipient user IDs
const userNotificationIds = new DataStorage('notification-receivers.json', false)
const REQUIRED = true
const NOT_REQUIRED = false
const messages = {
    notifySelf: 'You cannot notify yourself!',
    invalidParams: 'Invalid/missing required parameter(s)',
    invalidUserId: 'Invalid User ID supplied',
    loginRequired: 'You need to complete the Getting Started module, and create a messaging User ID',
    runtimeError: 'Runtime error occured. Please try again later or email support@totemaccounting.com',
    introducingUserIdConflict: 'Introducing user cannot not be a recipient',
}

// @validate function: callback function to be executed before adding a notification.
//                      Must return error string if any error occurs or notification should be void.
//                      thisArg: client object
//                      Params:
//                      @id         string : notification ID
//                      @from       string : sender user ID
//                      @toUserIds  array  : receiver user IDs
//                      @data       object : extra information, can be specific to the module
//                      @message    string : message to be displayed, unless invitation type has custom view
export const VALID_TYPES = Object.freeze({
    identity: {
        // user1 recommends user2 to share their identity with user3
        introduce: {
            dataFields: {
                userId: REQUIRED,
            },
            // check if user id is valid
            validate: (i, f, toUserIds, { userId }) => {
                // makes sure supplied userId is valid
                if (!idExists(userId)) return messages.invalidUserId
                // prevents user to be introduced to themself!
                if (toUserIds.includes(userId)) return messages.introducingUserIdConflict
            },
            message: NOT_REQUIRED,
        },
        // user1 requests identity from user2
        request: {
            dataFields: {
                // one-liner explanation by the requester of why they want receivers identity
                reason: REQUIRED,
            },
            message: NOT_REQUIRED,
        },
        // user1 shares identity with user2
        share: {
            dataFields: {
                // address/identity being shared
                address: REQUIRED,
                // optionally include introducer ID
                introducedBy: NOT_REQUIRED,
                // name of the user or the identity
                name: REQUIRED,
            },
            // check if introducer id is valid, if provided
            validate: (_, _1, _2, { introducerId: iId }) => !iId || idExists(iId) ? null : messages.invalidUserId,
            message: NOT_REQUIRED,
        }
    },
    time_keeping: {
        dispute: {
            responseRequired: REQUIRED
        },
        invitation: {
            dataFields: {
                projectHash: REQUIRED,
                projectName: REQUIRED,
                workerAddress: REQUIRED,
            },
            messageRequird: NOT_REQUIRED,
        },
        invitation_response: {
            dataFields: {
                accepted: REQUIRED,
                projectHash: REQUIRED,
                projectName: REQUIRED,
                workerAddress: REQUIRED,
            },
            messageRequird: REQUIRED,
        },
    },
})

// Send notification to all clients of a specific user
const _notifyUser = userId => setTimeout(() => {
    if (!isUserOnline(userId)) return
    arrUnique(userNotificationIds.get(userId)).forEach(id => {
        const { from, type, childType, message, data, tsCreated } = notifications.get(id)
        emitToUsers([userId], EVENT_NAME, [id, from, type, childType, message, data, tsCreated, (received) => {
            const notifyIds = userNotificationIds.get(userId)
            notifyIds.splice(notifyIds.indexOf(id), 1)
            if (notifyIds.length > 0) return userNotificationIds.set(userId, notifyIds)
            userNotificationIds.delete(userId)
        }])
    })
}, 500) // minimum 150 ms delay required, otherwise client UI might not receive it on time to consume the event

// Check and notify user when on login
onUserLogin(_notifyUser)

// handleNotify deals with notification requests
//
// Params:
// @toUserIds   array    : receiver User ID(s)
// @type        string   : parent notification type
// @childType   string   : child notification type
// @message     string   : message to be displayed (unless custom message required). can be encrypted later on
// @data        object   : information specific to the type of notification
// @callback    function : params: (@err string) 
export function handleNotify(toUserIds = [], type = '', childType = '', message = '', data = {}, callback) {
    if (!isFn(callback)) return
    const client = this
    try {
        const user = getUserByClientId(client.id)
        if (!user) return callback(messages.loginRequired)
        if (!isArr(toUserIds) || toUserIds.length === 0) return callback(messages.invalidParams + ': to')
        // prevent user sending notification to themselves
        if (toUserIds.indexOf(user.id) >= 0) return callback(messages.notifySelf)
        toUserIds = arrUnique(toUserIds)

        // check if all receipient user id are valid
        const invalid = toUserIds.reduce((invalid, userId) => invalid || !idExists(userId), false)
        if (invalid) return callback(messages.invalidUserId)

        const typeObj = VALID_TYPES[type]
        if (!isObj(typeObj)) return callback(messages.invalidParams + ': type')

        const childTypeObj = typeObj[childType]
        if (childType && !isObj(childTypeObj)) return callback(messages.invalidParams + ': childType')

        const config = childType ? childTypeObj : typeObj

        if (config.dataRequired && !objHasKeys(data, config.dataFields, true)) {
            return callback(`${messages.invalidParams}: data { ${config.dataFields.join()} }`)
        }
        if (config.messageRequired && (!isStr(message) || !message.trim())) {
            return callback(messages.invalidParams + ': message')
        }

        // if notification type has a handler function execute it
        const from = user.id
        const id = uuid.v1()
        const err = isFn(config.validate) && config.validate.bind(client)(id, from, toUserIds, data, message)
        if (err) return callback(err)
        notifications.set(id, {
            from,
            to: toUserIds,
            type,
            childType,
            message,
            data,
            tsCreated: new Date(),
        })

        // add user id and notification id to a list for faster processing
        toUserIds.forEach(userId => {
            const ids = userNotificationIds.get(userId) || []
            ids.push(id)
            userNotificationIds.set(userId, arrUnique(ids))
            // notify the user if online
            _notifyUser(userId)
        })
        callback()
    } catch (e) {
        console.log('Runtime error occured: ', e)
        callback(messages.runtimeError)
    }
}