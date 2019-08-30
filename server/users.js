import DataStorage from '../src/utils/DataStorage'
import { isFn, isStr } from '../src/utils/utils'
const users = new DataStorage('users.json', false) // false => enables caching entire user list
const userClientIds = new Map()
const isValidId = id => /^[a-z][a-z0-9]+$/.test(id)
const idMaxLength = 16
const msgMaxLength = 160
const idMinLength = 3
// Error messages
const errMsgs = {
	idInvalid: `Only alpha-numeric characters allowed and must start with an alphabet`,
	idLength: `Must be between ${idMinLength} to ${idMaxLength} characters`,
	idExists: 'User ID already taken',
	msgLengthExceeds: `Maximum ${msgMaxLength} characters allowed`,
	loginFailed: 'Credentials do not match',
	loginOrRegister: 'Login/registration required'
}

export const findUserByClientId = clientId => {
    for (let [userId, clientIds] of userClientIds.entries()) {
        if (clientIds.indexOf(clientId) >= 0) return users.get(userId)
	}
}

export const handleDisconnect = (clients, client) => () => {
    clients.delete(client.id)
    const user = findUserByClientId(client.id)
    if (!user) return;

    const clientIds = userClientIds.get(user.id) || []
    const clientIdIndex = clientIds.findIndex(cid => cid === client.id)
    // remove clientId
    clientIds.splice(clientIdIndex, 1)
    userClientIds.set(user.id, clientIdIndex)
    console.info('Client disconnected: ', client.id)
}

export const handleMessage = (client, emitter) => (msg, callback) => {
    if (!isStr(msg) || !isFn(callback)) return
    if (msg.length > msgMaxLength) return callback(errMsgs.msgLengthExceeds)

    const sender = findUserByClientId(client.id)
    // Ignore message from logged out users
    if (!sender) return callback(errMsgs.loginOrRegister);
    emitter(client.id, 'message', [msg, sender.id])
    callback()
}

export const handleIdExists = (userId, callback) => isFn(callback) && callback(!!users.get(userId), userId)

export const handleRegister = (clients, client) => (userId, secret, callback) => {
    if (!isFn(callback)) return
    if (users.get(userId)) return callback(errMsgs.idExists)
    if (!isValidId(userId)) return callback(errMsgs.idInvalid)
    if (userId.length >= idMaxLength || userId.length < idMinLength) return callback(errMsgs.idLength)

    const newUser = {
        id: userId,
        secret: secret,
    }
    users.set(userId, newUser)
    clients.set(client.id, client)
    userClientIds.set(userId, [client.id])
    console.info('New User registered:', userId)
    callback()
}

export const handleLogin = (clients, client) => (userId, secret, callback) => {
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
    callback(valid ? null : errMsgs.loginFailed)
}