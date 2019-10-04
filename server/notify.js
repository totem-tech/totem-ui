import DataStorage from '../src/utils/DataStorage'
import uuid from 'uuid'
import { isArr, isFn, isObj, objHasKeys, objReadOnly, isStr  } from '../src/utils/utils'
import { emitToUsers, findUserByClientId, isUserOnline, onUserLogin } from './users'
import { projectTimeKeepingInvite } from './projects'

const notifications = new DataStorage('notifications', true)
const targetUserIds = new DataStorage('notification-receivers', false)
const EVENT_NAME = 'notification'
export const VALID_TYPES = objReadOnly({
    // notification that doesn't fall into other types
    // alert: {
    //     responseRequired: false
    // }, 
    // invoice: {
    //     responseRequired: false
    // }, 
    timeKeeping: {
        hasChild: true,
        // child types
        dispute: {
            responseRequired: false
        },
        invitation: {
            dataRequired: true,
            dataFields: [
                'projectHash' // hash of the project invited to
            ],
            // expireAfter: null, // set expiration date??
            handleNotify: projectTimeKeepingInvite, // place it in the project.js
            messageRequired: true,
            // messageEncrypted: false,
            handleResponse: ()=> {}, // placeholder, place it in 
        },
    }, // invitation to project and response, dispute time keeping entry and response
}, true)

const messages = {
    invalidParams: 'Invalid/missing required parameter(s)',
    loginRequired: 'Login required',
    runtimeError: 'Runtime error occured. Please try again later or contact support'
}

// Send notifications to users
const emitNotifications = () => Array.from(targetUserIds).forEach(([userId]) => notifyUser(userId))

const notifyUser = userId => {
    if (!isUserOnline(userId)) return
    const nodificationIds = targetUserIds.get(userId)
    if (!nodificationIds) return
    nodificationIds.forEach(id => {
        const {from, to, type, childType, message, data, tsCreated} = notifications.get(id)
        emitToUsers([userId], EVENT_NAME, [ from, type, childType, message, data, tsCreated ])
    })
    targetUserIds.delete(userId)
}

// Notify user when user logs in
onUserLogin(userId => notifyUser(userId))

// handleNotify deals with notification requests
//
// Params:
// @to          array    : User ID(s)
// @type        string   : parent notification type
// @childType   string   : child notification type
// @message     string   : message to be displayed (unless custom message required). can be encrypted later on
// @data        object   : information specific to the type of notification
// @callback    function : params: (@err string) 
export function handleNotify( to = [], type = '', childType = '', message = '', data = {}, callback ) {
    const client = this
    if (!isFn(callback)) return
    try {
        const user = findUserByClientId(client.id)
        if (!user) return callback(messages.loginRequired)
        if (!isArr(to) || to.length === 0) return callback(messages.invalidParams + ': to')

        const typeObj = !VALID_TYPES[type]
        if (!isObj(typeObj)) return callback(messages.invalidParams + ': type')
        
        const childTypeObj = typeObj[childType]
        if (typeObj.hasChild && !isObj(childTypeObj)) return callback(messages.invalidParams + ': childType')
        
        const config = typeObj.hasChild ? childTypeObj : typeObj
        if (config.dataRequired && !objHasKeys(data, config.dataFields, true)) {
            return callback(`${messages.invalidParams}: data { ${config.dataFields.join()} }`)
        }
        if (config.messageRequired && (!isStr(messages) || !message.trim())) {
            return callback(messages.invalidParams + ': message')
        }

        // emitToUsers(to, EVENT_NAME, [type, childType, message, data])
        const err = config.handleNotify(to, data)
        if (err) return callback(err)
        const id = uuid.v1()
        notifications.set(id, {
            from: user.id,
            to,
            type,
            childType,
            message,
            data,
            tsCreated: new Date(),
        })

        // add user id and notification id to a list for faster processing
        to.forEach(userId => {
            const ids = targetUserIds.get(userId) || []
            ids.push(id)
            targetUserIds.set(userId, ids)
        })
        callback()
        emitNotifications()
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