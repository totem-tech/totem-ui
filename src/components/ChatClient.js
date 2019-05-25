import io from 'socket.io-client'
const port = 3001
let instance, socket;
const isFn = fn => typeof(fn) === 'function'
const postLoginCallbacks = []

export class ChatClient {
    constructor(url) {
        this.url = url || `${window.location.hostname}:${port}`
        socket = io(this.url)

        this.onConnect = cb => socket.on('connect', cb)
        this.onReconnect = cb => socket.on('reconnect', cb)
        // this.onConnectTimeout = cb => socket.on('connect_timeout', cb);
        this.onConnectError = cb => socket.on('connect_error', cb);
        this.onDisconnect = cb => socket.on('disonnect', cb)
        // this.disconnect = () => socket.disconnect() // doesn't work
        this.onError = cb => socket.on('error', cb)
        this.onMessage = cb => socket.on('message', cb)
        this.message = (msg, cb) => socket.emit('message', msg, cb)
        this.register = (id, secret, cb) => socket.emit('register', id, secret, err => {
            if (!err) {
                saveUser(id, secret)
                setTimeout(() => _execOnLogin(id))
            }
            isFn(cb) && cb(err)
        })

        this.login = (id, secret, cb) => socket.emit('login', id, secret, err => {
            isFn(cb) && cb(err)
            !err && setTimeout(() => _execOnLogin(id))
        })

        this.getUser = getUser
        this.getHistory = getHistory
    }
}
// export default ChatClient

export const getClient = url => {
    if (!instance || !socket.connected) {
        instance = new ChatClient(url)
    }
    return instance
}

const _execOnLogin = (id) => {
    for (let fn of postLoginCallbacks) {
        isFn(fn) && fn(id)
    }
}

// Callback(s) to be executed after login is successful
// ToDo: use Promise
export const onLogin = cb => isFn(cb) && postLoginCallbacks.push(cb)
const userKey = 'chat-user'
const historyKey = 'chat-history'
const saveUser = (id, secret) => localStorage.setItem(userKey, JSON.stringify({id, secret}))
export const getUser = () => JSON.parse(localStorage.getItem(userKey))
export const getHistory = () => localStorage.getItem(historyKey)