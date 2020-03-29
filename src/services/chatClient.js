import io from 'socket.io-client'
import { isFn, isValidNumber, isDefined } from '../utils/utils'
import { translated } from './language'
import storage from './storage'

// chat server port
// use 3003 for dev.totem.live otherwise 3001
const port = window.location.hostname === 'dev.totem.live' ? 3003 : 3001
let instance, socket;
const postLoginCallbacks = []
const HISTORY_LIMIT = 100 // default limit
const MODULE_KEY = 'messaging'
// read or write to messaging settings storage
const rw = value => storage.settings.module(MODULE_KEY, value) || {}
const [texts] = translated({
    notConnected: 'Messaging server is not connected'
})

// migrate existing user data
const deprecatedKey = 'totem_chat-user'
const oldData = localStorage[deprecatedKey]
if (oldData) {
    localStorage.removeItem(deprecatedKey)
    rw({ user: JSON.parse(oldData) })
}

// add new message to chat history
export const addToHistory = (message, id) => {
    // save history
    rw({ history: [...getHistory(), { message, id }] })
    // apply history limit
    historyLimit()
}
// retrieves user credentails from local storage
export const getUser = () => rw().user
// Retrieves chat history from local storage
export const getHistory = () => rw().history || []

// get/set number of chat messages to store.
// All existing and new chat messages will be visible on the chat widget despite the limit, until page is reloaded.
//
// Params:
// @newLimit    number: use '0' (zero) to store unlimited items
//
// returns      nubmer
export const historyLimit = newLimit => {
    let limit = rw().historyLimit
    if (!isDefined(limit)) limit = HISTORY_LIMIT
    // save to local storage
    if (isValidNumber(newLimit)) {
        limit = newLimit
        rw({ historyLimit: limit })
    }
    console.log({ limit })
    if (limit === 0) return limit

    let history = getHistory()
    if (history.length <= limit) return limit

    // limit number of items immediately
    history = history.slice(history.length - limit)
    rw({ history })
    console.log({ history })
    return limit
}
// Adds callback to be executed after login is successful
export const onLogin = cb => isFn(cb) && postLoginCallbacks.push(cb)
// Executes all callbacks added by onLogin()
const _execOnLogin = (userId) => {
    for (let fn of postLoginCallbacks) {
        isFn(fn) && fn(userId)
    }
}

// include any ChatClient property that is not a function or event that does not have a callback
const nonCbs = ['isConnected', 'disconnect']
// Returns a singleton instance of the websocket client
// Instantiates the client if not already done
export const getClient = () => {
    if (!instance || !socket.connected) {
        instance = new ChatClient()
        // attach a promise() functions to all event related methods. 
        // promise() will take the exactly the same arguments as the orginal event method.
        // however the callback is optional here as promise() will add an interceptor callback anyway.
        //
        // Example: use of client.message
        //     without promise:
        //          client.messate('hello universe!', err => console.log({err}))
        //     with promise:
        //          client.message.promise('hello universe!').then(
        //              console.log, // success callback
        //              console.log, // error callback will always have the error/first argument
        //          )
        //
        Object.keys(instance).forEach(key => {
            const prop = instance[key]
            if (!isFn(prop) || nonCbs.includes(key)) return
            prop.promise = function () {
                const args = [...arguments]
                return new Promise((resolve, reject) => {
                    try {
                        if (!instance.isConnected()) return reject(texts.notConnected)
                        // last argument must be a callback
                        let callbackIndex = args.length - 1
                        const originalCallback = args[callbackIndex]
                        // if last argument is not a callback increment index to add a new callback
                        if (!isFn(originalCallback)) callbackIndex++
                        args[callbackIndex] = function () {
                            const cbArgs = arguments
                            // first argument indicates whether there is an error.
                            const err = cbArgs[0]
                            isFn(originalCallback) && originalCallback.apply({}, cbArgs)
                            const fn = !!err ? reject : resolve
                            fn.apply({}, cbArgs)
                        }

                        prop.apply(instance, args)
                    } catch (err) {
                        reject(err)
                    }
                })
            }
        })
        window.client = instance
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

        // Emit chat (Totem trollbox) message to everyone
        this.message = (msg, cb) => isFn(cb) && socket.emit('message', msg, cb)
        // receive chat messages
        this.onMessage = cb => isFn(cb) && socket.on('message', cb)

        // add/get company by wallet address
        //
        // Params:
        // @identity        string
        // @company         object  : if not supplied will return existing company by @identity 
        // @cb              function: params =>
        //                      @err    string/null/object : error message or null if success or existing company if @company not supplied
        this.company = (identity, company, cb) => socket.emit('company', identity, company, cb)
        // search companies
        //
        // Params:
        // @query       string/object
        // @matchExact  boolean
        // @matchAll    boolean
        // @ignoreCase  boolean
        // @cb          function: params =>
        //                      @err    string/null : error message or null if success
        //                      @result Map         : Map of companies with identity as key
        this.companySearch = (query, matchExact, matchAll, ignoreCase, cb) => isFn(cb) && socket.emit(
            'company-search', query, matchExact, matchAll, ignoreCase, (err, result) => cb(err, new Map(result))
        )

        // Get list of all countries
        //
        // Params:
        // @hash    string: hash generated by the Map of existing countries to compare with the ones stored on the server
        // @cb      function
        this.countries = (hash, cb) => isFn(cb) && socket.emit('countries', hash, (err, countries) => cb(err, new Map(countries)))

        this.errorMessages = cb => isFn(cb) && socket.emit('error-messages', cb)

        // Request funds
        this.faucetRequest = (address, cb) => isFn(cb) && socket.emit('faucet-request', address, cb)

        // Funds received
        // this.onFaucetRequest = cb => socket.on('faucet-request', cb)
        // Check if User ID Exists
        this.idExists = (userId, cb) => isFn(cb) && socket.emit('id-exists', userId, cb)

        // handleTranslations handles translated text requests
        //
        // Params: 
        // @langCode    string: 2 digit language code
        // @hash        string: (optional) hash of client's existing translated texts' array to compare whether update is required.
        // @cb          function: arguments =>
        //              @error  string/null: error message, if any. Null indicates no error.
        //              @list   array/null: list of translated texts. Null indicates no update required.
        this.translations = (langCode, hash, cb) => isFn(cb) && socket.emit('translations', langCode, hash, cb)

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
        //          Arguments:
        //          @id         string: notification ID
        //          @senderId   string: sender user ID
        //          @type       string: parent notification type
        //          @childType  string: child notification type
        //          @message    string: notification message
        //          @data       object: information specific to the notification @type and @childType
        //          @tsCreated  date: notification creation timestamp
        //          @cbConfirm  function: a function to confirm receipt
        this.onNotify = cb => isFn(cb) && socket.on('notify', cb)

        // add/get/update project
        //
        // Params:
        // @hash    string: A hash string generated using the project details as seed. Will be used as ID/key.
        // @project object
        // @create  bool: whether to create or update project
        // @cb      function
        this.project = (hash, project, create, cb) => socket.emit('project', hash, project, create, cb)
        // retrieve projects by an array of hashes
        this.projectsByHashes = (hashArr, cb) => isFn(cb) && socket.emit(
            'projects-by-hashes', hashArr, (err, res, notFoundHashes) => cb(err, new Map(res), notFoundHashes)
        )
    }

    register = (id, secret, cb) => socket.emit('register', id, secret, err => {
        if (!err) {
            rw({ user: { id, secret } })
            setTimeout(() => _execOnLogin(id))
        }
        isFn(cb) && cb(err)
    })

    login = (id, secret, cb) => socket.emit('login', id, secret, err => {
        isFn(cb) && cb(err)
        !err && setTimeout(() => _execOnLogin(id))
    })
}
export default getClient()