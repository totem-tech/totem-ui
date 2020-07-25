import { addCodecTransform, post } from 'oo7-substrate'
import storage from './storage'
import { hashToStr } from '../utils/convert'
import { setNetworkDefault, denominationInfo } from 'oo7-substrate'
import { connect } from '../utils/polkadotHelper'
import types from '../utils/totem-polkadot-js-types'
import { isObj, isFn, isArr, isDefined, isStr, isArr2D } from '../utils/utils'
import PromisE from '../utils/PromisE'

// oo7-substrate: register custom types
Object.keys(types).forEach(key => addCodecTransform(key, types[key]))
const MODULE_KEY = 'blockchain'
const TX_STORAGE = 'tx_storage'
let config = {
    primary: 'Ktx',
    unit: 'Transactions',
    ticker: 'XTX'
}
let connection = {
    api: null,
    keyring: null,
    isConnected: false,
    nodeUrl: null,
    provider: null,
}
let connectPromise = null
export const denominations = Object.freeze({
    Ytx: 24,
    Ztx: 21,
    Etx: 18,
    Ptx: 15,
    Ttx: 12,
    Gtx: 9,
    Mtx: 6,
    Ktx: 3,
    Transactions: 0,
})// used for archiving
export const hashTypes = {
    /// 1000
    /// 2000
    projectHash: 3000,
    timeRecordHash: 4000,
    taskHash: 5000,
    /// 5000
    /// 6000
    /// 7000
    /// 8000
    /// 9000
}
export const nodes = [
    'wss://node1.totem.live',
]

export const getConfig = () => config

export const getConnection = async (create = true) => {
    if (connection.api && connection.api._isConnected.value || !create) return connection
    if (connectPromise) {
        await connectPromise

        // if connection is rejected attempt to connect again
        if (connectPromise.rejected && create) await getConnection(true)
        return connection
    }
    const nodeUrl = nodes[0]
    console.log('Polkadot: connecting to', nodeUrl)
    connectPromise = PromisE(connect(nodeUrl, config.types, true))
    try {
        const { api, keyring, provider } = await connectPromise
        console.log('Connected using Polkadot', { api, provider })
        connection = {
            api,
            provider,
            keyring,
            nodeUrl,
            isConnected: true,
        }

        // none of these work!!!!
        // provider.websocket.addEventListener('disconnected', (err) => console.log('disconnected', err))
        // provider.websocket.addEventListener('error', (err) => console.log('error', err))
        // provider.websocket.on('disconnected', (err) => console.log('disconnected', err))
        // provider.websocket.on('disonnect', (err) => console.log('disonnect', err))
        // provider.websocket.on('error', (err) => console.log('error', err))
        // provider.websocket.on('connect_timeout', (err) => console.log('connect_timeout', err))
        // provider.websocket.on('reconnect', (err) => console.log('reconnect', err))
        // provider.websocket.on('connect', (err) => console.log('connect', err))
    } catch (err) {
        // make sure to reset when rejected
        connection.isConnected = false
        throw err
    }
    return connection
}

// get current block number
export const getCurrentBlock = async () => {
    const { api } = await getConnection()
    const res = await api.rpc.chain.getBlock()
    return parseInt(res.block.get('header').get('number'))
}

// getTypes returns a promise with 
export const getTypes = () => new Promise(resolve => resolve(types))

// query makes API calls using PolkadotJS. All values returned will be sanitised.
//
// Params:
// @func    string: path to the PolkadotJS API function as a string. Eg: 'api.rpc.system.health'
// @args    array: arguments to be supplied when invoking the API function.
//              To subscribe to the API supply a callback function as the last item in the array.
// @print   boolean: if true, will print the result of the query
//
// Returns  function/any: If callback is supplied in @args, will return the unsubscribe function.
//              Otherwise, value of the query will be returned
export const query = async (func, args = [], multi = false, print = false) => {
    // **** keep { api } **** It is expected to be used with eval()
    const { api } = await getConnection()
    if (!func || func === 'api') return api
    // add .multi if required
    if (isStr(func) && multi && !func.endsWith('.multi')) func += '.multi'

    const fn = eval(func)
    if (!fn) throw new Error('Invalid API function', func)

    args = isArr(args) || !isDefined(args) ? args : [args]
    multi = isFn(fn) && !!multi
    const sanitise = x => JSON.parse(JSON.stringify(x)) // get rid of jargon
    const cb = args[args.length - 1]
    const isSubscribe = isFn(cb) && isFn(fn)

    if (isSubscribe) {
        // only add interceptor to process result
        args[args.length - 1] = result => {
            result = sanitise(result)
            print && console.log(func, result)
            cb.call(null, result)
        }
    }

    // For multi query arguments needs to be constructs as 2D Array.
    // If only one argument in @args is supplied, assume that it is a 2D array.
    // Otherwise, construct a 2D array as required by 
    const len = isSubscribe ? 2 : 1
    if (multi && !isFn(args[0]) && args.length > len) {
        try {
            // remove subscription callback before processing arguments
            let interceptor
            if (isSubscribe) {
                interceptor = args.slice(-1)[0]
                args = args.slice(0, -1)
            }
            // construct a 2D array
            args = [
                args[0].map((_, i) =>
                    args.map(ar => ar[i])
                )
            ]
            // re-add subscription callback
            if (isSubscribe) args.push(interceptor)

        } catch (err) {
            console.log({ err })
            throw `Failed to process arguments for multi-query. ${err}`
        }
    }
    const result = isFn(fn) ? await fn.apply(null, args) : fn
    !isSubscribe && print && console.log(JSON.stringify(result, null, 4))
    return isSubscribe ? result : sanitise(result)
}

// Replace configs
export const setConfig = newConfig => {
    config = { ...config, ...newConfig }
    storage.settings.module(MODULE_KEY, { config })
    denominationInfo.init({ ...config, denominations })
}

// Save general (not specific to a module or used by multiple modules) data to blockchain storage.
// Each function returns a task (an object) that can be used to create a queued transaction.
// Make sure to supply appropriate `title` and `descrption` properties to `@queueProps`
// and use the `addToQueue(task)` function from queue service to add the task to the queue
export const tasks = {
    // un-/archive a record. See @hashTypes for a list of supported types.
    //
    // Props: 
    // @hashOwnerAddress    string
    // @type                int: type code. See @hashTypes
    // @hash                string: hash of the record to be un-/archived
    // @archive             boolean: indicates archive or unarchive action
    // @queueProps          string: provide task specific properties (eg: description, title, then, next...)
    archiveRecord: (hashOwnerAddress, type, hash, archive = true, queueProps = {}) => ({
        ...queueProps,
        address: hashOwnerAddress,
        func: 'api.tx.archive.archiveRecord',
        type: TX_STORAGE,
        args: [
            type,
            hashToStr(hash),
            archive,
        ],
    }),
    // add a key to the key registry
    //
    // Props: 
    // @address     string
    // @signPubKey  string
    // @data        string
    // @signature   string
    // @queueProps  string: provide task specific properties (eg: description, title, then, next...)
    registerKey: (address, signPubKey, data, signature, queueProps = {}) => ({
        ...queueProps,
        address,
        func: 'api.tx.keyregistry.registerKeys',
        type: TX_STORAGE,
        args: [
            signPubKey,
            data,
            signature,
        ],
    })
}

// Include all functions here that will be used by Queue Service
// Only blockchain transactions
export default {
    denominations,
    getConfig,
    getConnection,
    getCurrentBlock,
    getTypes,
    hashTypes,
    nodes,
    query,
    setConfig,
    tasks,
}