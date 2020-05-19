import io from 'socket.io-client'
import { Bond } from 'oo7'
import { isFn } from '../utils/utils'
import storage from './storage'

// chat server port
// use 3003 for dev.totem.live otherwise 3001
const port = window.location.hostname === 'dev.totem.live' ? 3003 : 3001
let instance, socket;
const MODULE_KEY = 'messaging'
const PREFIX = 'totem_'
// read or write to messaging settings storage
const rw = value => storage.settings.module(MODULE_KEY, value) || {}

// migrate existing user data
const deprecatedKey = PREFIX + 'chat-user'
const oldData = localStorage[deprecatedKey]
if (oldData) {
    localStorage.removeItem(deprecatedKey)
    rw({ user: JSON.parse(oldData) })
}
// remove trollbox chat history items
if (rw().history) rw({ history: null })

export const loginBond = new Bond
// retrieves user credentails from local storage
export const getUser = () => rw().user
export const setUser = user => rw({ user }) // user = {id, secret}

// include any ChatClient property that is not a function or event that does not have a callback
const nonCbs = ['isConnected', 'disconnect']
// Returns a singleton instance of the websocket client
// Instantiates the client if not already done
export const getClient = () => {
    if (instance) return instance

    instance = new ChatClient()
    // attach a promise() functions to all event related methods. 
    // promise() will take the exactly the same arguments as the orginal event method.
    // however the callback is optional here as promise() will add an interceptor callback anyway.
    //
    // Example: use of client.message
    //     without promise:
    //          client.messate('hello universe!', (err, arg0, arg1) => console.log({err, arg0, arg1}))
    //     with promise:
    //          client.message.promise('hello universe!').then(
    //              console.log, // success callback excluding the error message
    //              console.log, // error callback with only error message
    //          )
    //
    Object.keys(instance).forEach(key => {
        const func = instance[key]
        if (!isFn(func) || nonCbs.includes(key)) return
        func.promise = function () {
            const args = [...arguments]
            return new Promise((resolve, reject) => {
                try {
                    // last argument must be a callback
                    let callbackIndex = args.length - 1
                    const originalCallback = args[callbackIndex]
                    // if last argument is not a callback increment index to add a new callback
                    if (!isFn(originalCallback)) callbackIndex++
                    args[callbackIndex] = function () {
                        const cbArgs = [...arguments]
                        // first argument indicates whether there is an error.
                        const err = cbArgs[0]
                        isFn(originalCallback) && originalCallback.apply({}, cbArgs)
                        if (!!err) return reject(err)
                        // resolver only takes a single argument
                        resolve(cbArgs.length <= 2 ? cbArgs[1] : cbArgs.slice(1))
                    }

                    func.apply(instance, args)
                } catch (err) {
                    reject(err)
                }
            })
        }
    })

    // automatically login to messaging service
    const { id, secret } = getUser() || {}
    if (!id) return instance

    instance.onConnect(() => instance.login(id, secret, err => {
        loginBond.changed(!err)
        err && console.log('Login failed', err)
    }))
    instance.onConnectError(() => loginBond.changed(false))
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

        // add/get company by wallet address
        //
        // Params:
        // @hash       string
        // @company    object  : if not supplied will return existing company by @identity 
        //                 required keys:
        //                       'countryCode',          // 2 letter country code
        //                       'identity',
        //                       'name',                 // name of the company
        //                       'registrationNumber',   // company registration number for the above country
        // @cb         function: params =>
        //                 @err    string/null/object : error message or null if success or existing company if @company not supplied
        this.company = (hash, company, cb) => isFn(cb) && socket.emit('company', hash, company, cb)
        // search companies
        //
        // Params:
        // @query           string
        // @findIdentity    boolean: if false will search for both identity and parentIdentity
        // @cb              function: params =>
        //                      @err    string/null : error message or null if success
        //                      @result Map         : Map of companies with identity as key
        this.companySearch = (query, findIdentity, cb) => isFn(cb) &&
            socket.emit('company-search', query, findIdentity, (err, result) => cb(err, new Map(result)))

        // Get list of all countries
        //
        // Params:
        // @hash    string: hash generated by the Map of existing countries to compare with the ones stored on the server
        // @cb      function
        this.countries = (hash, cb) => isFn(cb) && socket.emit('countries', hash, (err, countries) => cb(err, new Map(countries)))

        // Currency conversion
        //
        // Params:
        // @from    string: source currency ticker
        // @to      string: target currency ticker
        // @amount  number: amount in source currency
        // @cb      function: args:
        //              @err                string: message in case of error. Otherwise, null.
        //              @convertedAmount    number: amount in target currency
        this.currencyConvert = (from, to, amount, cb) => isFn(cb) && socket.emit('currency-convert', from, to, amount, cb)

        // Get a list of all supported currencies
        // 
        // Params:
        // @tickersHash string: (optional) hash generated using the sorted array of currency tickers
        // @calblack    function: args =>
        //                  @err    string: message in case of error. Otherwise, null.
        //                  @list   map: list of all currenies (objects)
        this.currencyList = (hash, cb) => isFn(cb) && socket.emit('currency-list', hash, cb)

        // Request funds
        this.faucetRequest = (address, cb) => isFn(cb) && socket.emit('faucet-request', address, cb)

        // Check if User ID Exists
        this.idExists = (userId, cb) => isFn(cb) && socket.emit('id-exists', userId, cb)

        // Check if User ID Exists
        this.isUserOnline = (userId, cb) => isFn(cb) && socket.emit('is-user-online', userId, cb)

        // FOR BUILD MODE ONLY
        // Retrieve a list of error messages used in the messaging service
        //
        // Params:
        // @cb      function: args => 
        //                  @err        string: error message if request fails
        //                  @messages   array
        this.languageErrorMessages = cb => isFn(cb) && socket.emit('language-error-messages', cb)

        // retrieve a list of translated application texts for a specific language
        //
        // Params: 
        // @langCode    string: 2 digit language code
        // @hash        string: (optional) hash of client's existing translated texts' array to compare whether update is required.
        // @cb          function: arguments =>
        //              @error  string/null: error message, if any. Null indicates no error.
        //              @list   array/null: list of translated texts. Null indicates no update required.
        this.languageTranslations = (langCode, hash, cb) => isFn(cb)
            && socket.emit('language-translations', langCode, hash, cb)

        // Send chat messages
        //
        // Params:
        // @userIds    array: User IDs without '@' sign
        // @message    string: encrypted or plain text message
        // @encrypted  bool: determines whether @message requires decryption
        this.message = (receiverIds, msg, encrypted, cb) => isFn(cb)
            && socket.emit('message', receiverIds, msg, encrypted, cb)
        // receive chat messages
        //
        // 
        // Params:
        // @cb  function: callback arguments => 
        //          @senderId       string: 
        //          @receiverIds    array: User IDs without '@' sign
        //          @message        string: encrypted or plain text message
        //          @encrypted      bool: determines whether @message requires decryption
        this.onMessage = cb => isFn(cb) && socket.on('message', cb)

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
        this.notify = (toUserIds, type, childType, message, data, cb) => isFn(cb)
            && socket.emit('notify', toUserIds, type, childType, message, data, cb)
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

    register = (id, secret, cb) => isFn(cb) && socket.emit('register', id, secret, err => {
        if (!err) {
            setUser({ id, secret })
            loginBond.changed(true)
        }
        cb(err)
    })

    login = (id, secret, cb) => isFn(cb) && socket.emit('login', id, secret, cb)
}
export default getClient()