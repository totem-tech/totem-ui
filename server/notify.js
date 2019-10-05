import DataStorage from '../src/utils/DataStorage'
import uuid from 'uuid'
import { arrUnique, isArr, isFn, isObj, objHasKeys, objReadOnly, isStr  } from '../src/utils/utils'
import { emitToUsers, getUserByClientId, isUserOnline, onUserLogin } from './users'
import { projectTimeKeepingInvite } from './projects'

const notifications = new DataStorage('notifications.json', true)
const userNotificationIds = new DataStorage('notification-receivers.json', false)
export const EVENT_NAME = 'notify'
export const VALID_TYPES = objReadOnly({
    // notification that doesn't fall into other types
    // alert: {
    //     responseRequired: false
    // }, 
    // invoice: {
    //     responseRequired: false
    // }, 
    time_keeping: {
        hasChild: true,
        // child types
        dispute: {
            responseRequired: false
        },
        invitation: {
            dataRequired: true, // determines whether the all the @dataFields are required
            dataFields: [
                'projectHash'   // hash of the project invited to
            ],
            // expireAfter: null, // set expiration date??
            //
            // @handleNotify function: callback function to be executed before adding a notification.
            //                      Must return error string if any error occurs or notification should be void.
            //                      Params:
            //                      @id         string : notification ID
            //                      @from       string : sender user ID
            //                      @toUserIds  array  : receiver user IDs
            //                      @data       object : extra information, can be specific to the module
            //                      @message    string :
            handleNotify: projectTimeKeepingInvite, // place it in the project.js
            messageRequired: true,
            // messageEncrypted: false,
            handleResponse: ()=> {}, // placeholder, place it in
        },
    }, // invitation to project and response, dispute time keeping entry and response
}, true, true)

const messages = {
    notifySelf: 'You cannot notify yourself',
    invalidParams: 'Invalid/missing required parameter(s)',
    loginRequired: 'Login required',
    runtimeError: 'Runtime error occured. Please try again later or contact support'
}

// Send notification to all clients of a specific user
const _notifyUser = userId => setTimeout(()=> {
    if (!isUserOnline(userId)) return
    arrUnique(userNotificationIds.get(userId)).forEach(id => {
        const {from, type, childType, message, data, tsCreated} = notifications.get(id)
        emitToUsers([userId], EVENT_NAME, [id, from, type, childType, message, data, tsCreated, (received)=> {
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
export function handleNotify( toUserIds = [], type = '', childType = '', message = '', data = {}, callback ) {
    const client = this
    console.log('handleNotify() ', toUserIds)
    if (!isFn(callback)) return
    try {
        const user = getUserByClientId(client.id)
        if (!user) return callback(messages.loginRequired)
        if (!isArr(toUserIds) || toUserIds.length === 0) return callback(messages.invalidParams + ': to')
        // prevent user sending notification to themselves
        if (toUserIds.indexOf(user.id) >= 0) return callback(messages.notifySelf)
        toUserIds = arrUnique(toUserIds)

        const typeObj = VALID_TYPES[type]
        if (!isObj(typeObj)) return callback(messages.invalidParams + ': type')
        
        const childTypeObj = typeObj[childType]
        if (typeObj.hasChild && !isObj(childTypeObj)) return callback(messages.invalidParams + ': childType')
        
        const config = typeObj.hasChild ? childTypeObj : typeObj
        if (config.dataRequired && !objHasKeys(data, config.dataFields, true)) {
            return callback(`${messages.invalidParams}: data { ${config.dataFields.join()} }`)
        }
        if (config.messageRequired && (!isStr(message) || !message.trim())) {
            return callback(messages.invalidParams + ': message')
        }

        // if notification type has a handler function execute it
        const from = user.id
        const id = uuid.v1()
        const err = isFn(config.handleNotify) && config.handleNotify(id, from, toUserIds, data, message)
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

// export const handleNotificationResponse = (notification, callback) => {
//     if (!isObj(notification) || object)
//     const {
//         to = [],
//         message = '',
//         type = '',
//         data = {}
//     } = notification

// }

// export const handleNotificationRead = (notification, callback) => {
//     if (!isObj(notification) || object)
//     const {to = [], message = '', type = '', data = {} } = notification

// }