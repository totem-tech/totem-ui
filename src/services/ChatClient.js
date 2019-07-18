import io from 'socket.io-client'
import { isFn, isArr } from '../components/utils'
import storageService from './storage'

const port = 3001
let instance, socket;
const postLoginCallbacks = []
const HISTORY_LIMIT = 100
// retrieves user credentails from local storage
export const getUser = () => storageService.chatUser()
// Retrieves chat history from local storage
export const getHistory = () => storageService.chatHistory()
export const getHistoryLimit = () => HISTORY_LIMIT
export const addToHistory = (message, id) => {
    const history = getHistory()
    history.push({message, id})
    storageService.chatHistory(history.slice(history.length - HISTORY_LIMIT, history.length))
}
// Adds callback to be executed after login is successful
export const onLogin = cb => isFn(cb) && postLoginCallbacks.push(cb)
// Executes all callbacks added by onLogin()
const _execOnLogin = (userId) => {
    for (let fn of postLoginCallbacks) {
        isFn(fn) && fn(userId)
    }
}

// Returns a singleton instance of the websocket client
// Instantiates the client if not already done
export const getClient = () => {
    if (!instance || !socket.connected) {
        instance = new ChatClient()
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
        this.faucetRequest = (address, cb) => socket.emit('faucet-request', address, cb)
        // Funds received
        this.onFaucetRequest = cb => socket.on('faucet-request', cb)
        // Check if User ID Exists
        this.idExists = (userId, cb) => socket.emit('id-exists', userId, cb)

        // add/update project
        this.project = (hash, project, create, cb) => socket.emit('project', hash, project, create, cb)

        // request user projects
        // @cb function : params =>
        //                @err             string/null : error message or null if success
        //                @result    Map         : Map of user projects with project hash as key
        this.projects = (walletAddrs, cb) => socket.emit(
            'projects',
            walletAddrs,
            (err, result) => isFn(cb) && cb(err, new Map(result))
        )
        // user projects received
        // @cb function : params =>
        //                @result    Map         : Map of user projects with project hash as key
        this.onProjects = cb => socket.on('projects', (result) => isFn(cb) && cb(new Map(result)))
    }

    register(id, secret, cb) {
        socket.emit('register', id, secret, err => {
            if (!err) {
                storageService.chatUser(id, secret)
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
export default getClient()