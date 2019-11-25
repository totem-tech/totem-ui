import DataStorage from '../src/utils/DataStorage'
import { arrUnique, isArr, isFn, isStr, arrReadOnly } from '../src/utils/utils'

const users = new DataStorage('users.json', false) // false => enables caching entire user list
export const clients = new Map()
export const userClientIds = new Map()
const isValidId = id => /^[a-z][a-z0-9]+$/.test(id)
const idMaxLength = 16
const msgMaxLength = 160
const idMinLength = 3
// Error messages
const messages = {
    idInvalid: `Only alpha-numeric characters allowed and must start with an alphabet`,
    idLength: `Must be between ${idMinLength} to ${idMaxLength} characters`,
    idExists: 'User ID already taken',
    invalidSecret: 'Secret must be a valid string',
    msgLengthExceeds: `Maximum ${msgMaxLength} characters allowed`,
    loginFailed: 'Credentials do not match',
    loginOrRegister: 'Login/registration required'
}
// User IDs reserved for Totem
const RESERVED_IDS = arrReadOnly([
    'admin',
    'administrator',
    'chris',
    'live',
    'accounting',
    'support',
    'totem',
], true, true)
// User IDs for use by the application ONLY.
const SYSTEM_IDS = arrReadOnly([
    'everyone',
    'here',
    'me'
], true, true)
// Save reserved ids without password (secret) if not already exists
RESERVED_IDS.forEach(id => !users.get(id) && users.set(id, { id }))
// Save system IDs without any password (secret) so that nobody can login with these
SYSTEM_IDS.forEach(id => users.set(id, { id }))
const onUserLoginCallbacks = []
const _execOnUserLogin = userId => setTimeout(() => onUserLoginCallbacks.forEach(fn => fn(userId)))

/*
 *
 * Utility functions
 * 
 */
// findUserByClientId seeks out user ID by connected client ID
//
// Params:
// @clientId    string
//
// returns object
export const getUserByClientId = clientId => Array.from(userClientIds)
    .filter(([_, clientIds]) => clientIds.indexOf(clientId) >= 0)
    .map(([userId]) => users.get(userId))[0]

// idExists
export const idExists = userId => !!users.get(userId)

// isUserOnline checks if user is online
//
// Params:
// @userId  string
export const isUserOnline = userId => (userClientIds.get(userId) || []).length > 0

// onUserLogin registers callbacks to be executed on any user login occurs
//
// Params:
// @callback    function: params => (@loggedInUserId string)
export const onUserLogin = callback => isFn(callback) && onUserLoginCallbacks.push(callback)

/*
 *
 * Websocket event emitter function
 * 
 */
// Emit to specific clients by ids
//
// Params: 
// @clientIds   array
// @eventName   string: name of the websocket event
// @params      array: parameters to be supplied to the client
// 
// Example: 
// Client/receiver will consume the event as follows: 
//      socket.on(eventName, param[0], param[1], param[2],...)
export const emitToClients = (clientIds = [], eventName = '', params = []) => eventName && arrUnique(clientIds).forEach(clientId => {
    const client = clients.get(clientId)
    client && client.emit.apply(client, [eventName].concat(params))
})

// Emit to users (everywhere the user is logged in)
//
// Params:
// @userIds     array
// @eventName   string: websocket event name
// @params      array: parameters to be supplied to the client
export const emitToUsers = (userIds = [], eventName = '', params = []) => arrUnique(userIds).forEach(userId => {
    const clientIds = userClientIds.get(userId)
    emitToClients(clientIds, eventName, params)
})

// Broadcast message to all users except ignoreClientIds
//
// Params:
// @ignoreClientIds  array: client IDs to skip.
// @eventName        string: websocket event name
// @params           array:  parameters to be supplied to the client
export const broadcast = (ignoreClientIds, eventName, params) => {
    if (!isStr(eventName)) return;
    ignoreClientIds = isArr(ignoreClientIds) ? ignoreClientIds : [ignoreClientIds]
    const clientIds = Array.from(clients).map(([clientId]) => clientId)
        .filter(id => ignoreClientIds.indexOf(id) === -1)
    emitToClients(clientIds, eventName, params)
}
// /*
//  *
//  * event handlers
//  * 
//  */
export function handleDisconnect() {
    const client = this
    clients.delete(client.id)
    const user = getUserByClientId(client.id)
    if (!user) return;

    const clientIds = userClientIds.get(user.id) || []
    const clientIdIndex = clientIds.indexOf(client.id)
    // remove clientId
    clientIds.splice(clientIdIndex, 1)
    userClientIds.set(user.id, arrUnique(clientIds))
    console.info('Client disconnected: ', client.id, ' userId: ', user.id)
}

export function handleMessage(msg, callback) {
    const client = this
    if (!isStr(msg) || !isFn(callback)) return
    if (msg.length > msgMaxLength) return callback(messages.msgLengthExceeds)

    const sender = getUserByClientId(client.id)
    // Ignore message from logged out users
    if (!sender) return callback(messages.loginOrRegister);
    broadcast(client.id, 'message', [msg, sender.id])
    callback()
}

export const handleIdExists = (userId, callback) => isFn(callback) && callback(idExists(userId), userId)

export function handleRegister(userId, secret, callback) {
    const client = this
    userId = (userId || '').toLowerCase()
    secret = (secret || '').trim()
    if (!isFn(callback)) return
    if (users.get(userId)) return callback(messages.idExists)
    if (!isValidId(userId)) return callback(messages.idInvalid)
    if (userId.length > idMaxLength || userId.length < idMinLength) return callback(messages.idLength)
    if (!isStr(secret) || !secret) return callback(messages.invalidSecret)
    const newUser = {
        id: userId,
        secret: secret,
    }
    users.set(userId, newUser)
    clients.set(client.id, client)
    userClientIds.set(userId, [client.id])
    console.info('New User registered:', userId)
    callback()
    _execOnUserLogin(userId)
}

export function handleLogin(userId, secret, callback) {
    const client = this
    if (!isFn(callback)) return
    const user = users.get(userId)
    const valid = user && user.secret === secret
    if (valid) {
        const clientIds = userClientIds.get(user.id) || []
        clientIds.push(client.id)
        userClientIds.set(user.id, arrUnique(clientIds))
        clients.set(client.id, client)
    }

    console.info('Login ' + (!valid ? 'failed' : 'success') + ' | ID:', userId, '| Client ID: ', client.id)
    callback(valid ? null : messages.loginFailed)
    _execOnUserLogin(userId)
}