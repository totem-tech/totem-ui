import io from 'socket.io-client'
const port = 3001
let instance, socket;
const postLoginCallbacks = []
// Local Storage Keys
const USER_KEY = 'chat-user'
const HISTORY_KEY = 'chat-history'
const historyLimit = 100
// Saves user credentails to local storage
const saveUser = (id, secret) => localStorage.setItem(USER_KEY, JSON.stringify({id, secret}))
// retrieves user credentails from local storage
export const getUser = () => JSON.parse(localStorage.getItem(USER_KEY))
// Retrieves chat history from local storage
export const getHistory = () => JSON.parse(localStorage.getItem(HISTORY_KEY)) || []
export const getHistoryLimit = () => historyLimit
export const addToHistory = (message, id) => {
    const history = getHistory() || []
    history.push({message, id})
    localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify(history.slice(history.length - historyLimit, history.length))
    )
}
const isFn = fn => typeof(fn) === 'function'
// Adds callback to be executed after login is successful
export const onLogin = cb => isFn(cb) && postLoginCallbacks.push(cb)
// Executes all callbacks added by onLogin()
const _execOnLogin = (userId) => {
    for (let fn of postLoginCallbacks) {
        isFn(fn) && fn(userId)
    }
}

// Returns a single singleton instance of the websocket client
// Instantiates the client if not already done
export const getClient = url => {
    if (!instance || !socket.connected) {
        instance = new ChatClient(url)
    }
    return instance
}

export class ChatClient {
    constructor(url) {
        this.url = url || `${window.location.hostname}:${port}`
        socket = io(this.url)

        this.isConnected = () => socket.connected
        this.onConnect = cb => socket.on('connect', cb)
        this.onReconnect = cb => socket.on('reconnect', cb)
        // this.onConnectTimeout = cb => socket.on('connect_timeout', cb);
        this.onConnectError = cb => socket.on('connect_error', cb);
        // this.onDisconnect = cb => socket.on('disonnect', cb)  // doesn't work
        this.disconnect = () => socket.disconnect()
        this.onError = cb => socket.on('error', cb)
        this.message = (msg, cb) => socket.emit('message', msg, cb)
        this.onMessage = cb => socket.on('message', cb)
        // Request funds
        this.faucetRequest = (address, amount, cb) => socket.emit('faucet-request', address, amount, cb)
        // Funds received
        this.onFaucetRequest = cb => socket.on('faucet-request', cb)
    }

    register(id, secret, cb) {
        socket.emit('register', id, secret, err => {
            if (!err) {
                saveUser(id, secret)
                setTimeout(() => _execOnLogin(id))
            }
            isFn(cb) && cb(err)
        })
    }

    login(id, secret, cb) {
        socket.emit('login', id, secret, err => {
            isFn(cb) && cb(err)
            !err && setTimeout(() => _execOnLogin(id))
        })
    }
}
// export default ChatClient