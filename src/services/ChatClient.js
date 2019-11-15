import io from 'socket.io-client'
import { isFn } from '../utils/utils'
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
    history.push({ message, id })
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

// Make sure to always keep the callback as the last argument
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
        // this.onFaucetRequest = cb => socket.on('faucet-request', cb)
        // Check if User ID Exists
        this.idExists = (userId, cb) => socket.emit('id-exists', userId, cb)

        // Send notification
        //
        // Params:
        // @toUserIds   array    : receiver User ID(s)
        // @type        string   : parent notification type. Eg: timeKeeping
        // @childType   string   : child notification type. Eg: invitation
        // @message     string   : message to be displayed (unless custom message required). can be encrypted later on
        // @data        object   : information specific to the type of notification
        // @cb          function : callback function
        //                         Params:
        //                         @err string: error message if failed or rejected
        this.notify = (toUserIds, type, childType, message, data, cb) => isFn(cb) && socket.emit(
            'notify', toUserIds, type, childType, message, data, cb
        )
        // Receive notification. 
        //
        // Params:
        // @cb function: callback function
        //          Params:
        //          @senderId   string: sender user ID
        //          @type       string: parent notification type
        //          @childType  string: child notification type
        //          @data       object: information specific to the notification @type
        //          @tsCreated  date  : notification creation timestamp
        this.onNotify = cb => isFn(cb) && socket.on('notify', (id, senderId, type, childType, message, data, tsCreated, cbConfrim) =>
            cb(id, senderId, type, childType, message, data, tsCreated, cbConfrim)
        )

        // add/get/update project
        //
        // Params:
        // @hash    string: A hash string generated using the project details as seed. Will be used as ID/key.
        // @project object
        // @create  bool    : whether to create or update project
        // @cb      function
        this.project = (hash, project, create, cb) => socket.emit('project', hash, project, create, cb)
        // Set project status
        this.projectStatus = (hash, status, cb) => socket.emit('project-status', hash, status, cb)
        this.projectTimeKeepingBan = (hash, address, ban, cb) => isFn(cb) && socket.emit(
            'project-time-keeping-ban', hash, address, ban, cb
        )
        // request user projects
        //
        // Params:
        // @walletAddrs array: array of wallet addresses
        // @cb          function : params =>
        //                  @err    string/null : error message or null if success
        //                  @result Map         : Map of user projects with project hash as key
        this.projects = (walletAddrs, cb) => isFn(cb) && socket.emit(
            'projects', walletAddrs, (err, res) => cb(err, new Map(res))
        )
        this.projectsByHashes = (hashArr, cb) => isFn(cb) && socket.emit(
            'projects-by-hashes', hashArr, (err, res, notFoundHashes) => cb(err, new Map(res), notFoundHashes)
        )
        // project search
        this.projectsSearch = (keyword, cb) => socket.emit('projects-search', keyword, (err, result) => cb(err, new Map(result)))
        // user projects received
        // @cb function : params =>
        //                  @err    string/null : error message or null if success
        //                  @result Map         : Map of user projects with project hash as key
        // this.onProjects = cb => isFn(cb) && socket.on('projects', (err, result) => cb(err, new Map(result)))

        // add/get company by wallet address
        //
        // Params:
        // @walletAddress   string
        // @company         object  : if not supplied will return existing company by @walletAddress 
        // @cb              function: params =>
        //                      @err    string/null/object : error message or null if success or existing company if @company not supplied
        this.company = (walletAddress, company, cb) => socket.emit('company', walletAddress, company, cb)
        // search companies
        //
        // Params:
        // @keyValues   object: one or more key-value pair to search for
        // @matchExact  boolean
        // @matchAll    boolean
        // @ignoreCase  boolean
        // @cb          function: params =>
        //                      @err    string/null : error message or null if success
        //                      @result Map         : Map of companies with walletAddress as key
        this.companySearch = (keyValues, matchExact, matchAll, ignoreCase, cb) => isFn(cb) && socket.emit(
            'company-search', keyValues, matchExact, matchAll, ignoreCase, (err, result) => cb(err, new Map(result))
        )

        // Get list of all countries with 3 character codes
        this.countries = (cb) => isFn(cb) && socket.emit('countries', (err, countries) => cb(err, new Map(countries)))

        // Add/update time keeping entry
        this.timeKeepingEntry = (hash, entry, cb) => isFn(cb) && socket.emit('time-keeping-entry', hash, entry, cb)
        this.timeKeepingEntryApproval = (hash, approve, cb) => isFn(cb) && socket.emit(
            'time-keeping-entry-approval', hash, approve, cb
        )
        this.timeKeepingEntrySearch = (query, matchExact, matchAll, ignoreCase, cb) => isFn(cb) && socket.emit(
            'time-keeping-entry-search',
            query, matchExact, matchAll, ignoreCase,
            (err, entriesArr) => cb(err, new Map(entriesArr))
        )
        this.timeKeepingInvitations = (projectHash, cb) => isFn(cb) && socket.emit(
            'time-keeping-invitations', projectHash, (err, result) => cb(err, new Map(result))
        )
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