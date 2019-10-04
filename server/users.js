import DataStorage from '../src/utils/DataStorage'
import { isArr, isFn, isStr } from '../src/utils/utils'
const users = new DataStorage('users.json', false) // false => enables caching entire user list
export const clients = new Map()
export const userClientIds = new Map()
const RESERVED_IDS = [
    'everyone',
    'here',
    'me',
]
// Make sure reserved IDs cannot be used by anyone
RESERVED_IDS.forEach(id => users.set(id, {id}))
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

const onUserLoginCallbacks = []
const execOnUserLogin = userId => setTimeout(()=>onUserLoginCallbacks.forEach(fn => fn(userId)))
// onUserLogin registers callbacks to be executed on any user login occurs
export const onUserLogin = callback => isFn(callback) && onUserLoginCallbacks.push(callback)

export const isUserOnline = userId => (userClientIds.get(userId) || []).length === 0

export const findUserByClientId = clientId => Array.from(userClientIds)
    .filter(([_, clientIds]) => clientIds.indexOf(clientId) >= 0)
    .map(([userId]) => users.get(userId))[0]

// Emit to specific clients by ids
export const emitToClients = (clientIds = [], eventName = '', params = []) => eventName && clientIds.forEach(clientId => {
    const client = clients.get(clientId)
    client && client.emit.apply(client, [eventName].concat(params))
})

// Emit to users (everywhere logged in)
export const emitToUsers = (userIds = [], eventName = '', params = []) => userIds.forEach(userId =>
    emitToClients(userClientIds.get(userId), eventName, params)
)

// Broadcast message to all users except ignoreClientIds
export const broadcast = (ignoreClientIds, eventName, params) => {
    if (!isStr(eventName)) return;
    ignoreClientIds = isArr(ignoreClientIds) ? ignoreClientIds : [ignoreClientIds]
    const clientIds = Array.from(clients).map(([clientId]) => clientId)
        .filter(id => ignoreClientIds.indexOf(id) === -1)
    emitToClients(clientIds, eventName, params)
}

/*
 * event handlers
 */
export function handleDisconnect() {
    const client = this
    clients.delete(client.id)
    const user = findUserByClientId(client.id)
    if (!user) return;

    const clientIds = userClientIds.get(user.id) || []
    const clientIdIndex = clientIds.findIndex(cid => cid === client.id)
    // remove clientId
    clientIds.splice(clientIdIndex, 1)
    userClientIds.set(user.id, clientIds)
    console.info('Client disconnected: ', client.id)
}

export function handleMessage(msg, callback) {
    const client = this
    if (!isStr(msg) || !isFn(callback)) return
    if (msg.length > msgMaxLength) return callback(messages.msgLengthExceeds)

    const sender = findUserByClientId(client.id)
    // Ignore message from logged out users
    if (!sender) return callback(messages.loginOrRegister);
    broadcast(client.id, 'message', [msg, sender.id])
    callback()
}

export const handleIdExists = (userId, callback) => isFn(callback) && callback(!!users.get(userId), userId)

export function handleRegister(userId, secret, callback) {
    const client = this
    if (!isFn(callback)) return
    if (users.get(userId)) return callback(messages.idExists)
    if (!isValidId(userId)) return callback(messages.idInvalid)
    if (userId.length > idMaxLength || userId.length < idMinLength) return callback(messages.idLength)
    if (!isStr(secret) || !secret.trim()) return callback(messages.invalidSecret)

    const newUser = {
        id: userId,
        secret: secret,
    }
    users.set(userId, newUser)
    clients.set(client.id, client)
    userClientIds.set(userId, [client.id])
    console.info('New User registered:', userId)
    callback()
    execOnUserLogin(userId)
}

export function handleLogin (userId, secret, callback) {
    const client = this
    if (!isFn(callback)) return
    const user = users.get(userId)
    const valid = user && user.secret === secret
    if (valid) {
        const clientIds = userClientIds.get(user.id) || []
        clientIds.push(client.id)
        userClientIds.set(user.id, clientIds)
        clients.set(client.id, client)
    }

    console.info('Login ' + (!valid ? 'failed' : 'success') + ' | ID:', userId, '| Client ID: ', client.id)
    callback(valid ? null : messages.loginFailed)
    execOnUserLogin(userId)
}