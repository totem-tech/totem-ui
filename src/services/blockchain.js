import uuid from 'uuid'
import { BehaviorSubject } from 'rxjs'
// utils
import PromisE from '../utils/PromisE'
import { connect, query as queryHelper, setDefaultConfig } from '../utils/polkadotHelper'
import types from '../utils/totem-polkadot-js-types'
import { generateHash, isArr, isDefined, isFn } from '../utils/utils'
// services
import { translated } from './language'
import { QUEUE_TYPES } from './queue'
import storage from './storage'
import { setToast } from './toast'
import { rxOnline } from './window'
import { currencyDefault } from '../modules/currency/currency'

export const rxBlockNumber = new BehaviorSubject()
const MODULE_KEY = 'blockchain'
const textsCap = translated({
    invalidApiPromise: 'ApiPromise instance required',
    invalidApiFunc: 'invalid API function',
    invalidMultiQueryArgs: 'failed to process arguments for multi-query',
    nodeConnectionErr: 'failed to connect to Totem blockchain network',
    nodeConntimeoutMsg: 'blockchain connection taking longer than expected',
}, true)[1]
let config = {
    primary: 'Ktx',
    unit: 'Transactions',
    ticker: currencyDefault
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
})
// Record Type Codes
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
export const nodesDefault = [
    'wss://node1.totem.live',
    // 'wss://127.0.0.1:1618',
    // 'ws://localhost:9944',
]
export const nodes = (storage.settings.module(MODULE_KEY) || {}).nodes || nodesDefault
setDefaultConfig(
    nodes,
    types,
    30000,
    {
        connectionFailed: textsCap.nodeConnectionErr,
        connectionTimeout: textsCap.nodeConntimeoutMsg,
        invalidApi: textsCap.invalidApiPromise,
        invalidApiFunc: textsCap.invalidApiFunc,
        invalidMutliArgsMsg: textsCap.invalidMultiQueryArgs,
    },
)

export const getConfig = () => config
export const getConnection = async (create = false) => {

    // never connect to blockchain
    if (window.isInIFrame) return await (new Promise(() => { }))
    try {
        let isConnected = !!connection.api && connection.api._isConnected.value
        if (isConnected) return connection
        if (!navigator.onLine && !create && (!connectPromise || !connectPromise.pending)) {
            // working offline. wait for connection to be re-established
            connectPromise = PromisE(resolve => {
                const subscribed = rxOnline.subscribe(online => {
                    if (!online) return
                    connectPromise = null
                    subscribed.unsubscribe()
                    resolve(getConnection(true))
                })
            })
            return connectPromise
        }
        if (connectPromise && !connectPromise.rejected) {
            await connectPromise
            isConnected = connection.api._isConnected.value
            // if connection is rejected attempt to connect again
            if ((connectPromise.rejected || !isConnected) && create) await getConnection(true)
            return connection
        }
        const nodeUrl = nodes[0]
        console.log('Polkadot: connecting to', nodeUrl)
        connectPromise = PromisE(connect(nodeUrl, types, true))
        const { api, keyring, provider } = await connectPromise
        console.log('Connected using Polkadot', { api, provider })
        connection = {
            api,
            provider,
            keyring,
            nodeUrl,
            isConnected: true,
            errorShown: false,
        }

        if (isFn(getCurrentBlock.unsubscribe)) getCurrentBlock.unsubscribe()
        getCurrentBlock.unsubscribe = await getCurrentBlock(blockNumber => rxBlockNumber.next(blockNumber))

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
        // set toast when connection fails for the first time
        !connection.errorShown && setToast(
            { content: textsCap.nodeConnectionErr, status: 'error' },
            3000,
            'blockchain-connection-error', // ensures same message not displayed twice
        )
        connection.errorShown = true
        throw err
    }
    return connection
}

/**
 * @name    getCurrentBlock
 * @summary get current block number
 * 
 * @param {Function} callback (optional) to subscribe to block number changes
 * 
 * @returns {Number|Function} latest block number if `@callback` not supplied, otherwise, function to unsubscribe
 */
export const getCurrentBlock = async (callback) => {
    if (!isFn(callback)) {
        const res = await query('api.rpc.chain.getBlock')
        try {
            return res.block.header.number
        } catch (e) {
            console.log('Unexpected error reading block number', e)
            return 0
        }
    }
    return query('api.rpc.chain.subscribeNewHeads', [res => callback(res.number)])
}

// getTypes returns a promise with 
export const getTypes = () => new Promise(resolve => resolve(types))

/**
 * @name query
 * @summary retrieve data from Blockchain storage using PolkadotJS API. All values returned will be sanitised.
 *
 * @param {Function}    func    string: path to the PolkadotJS API function as a string. Eg: 'api.rpc.system.health'
 * @param {Array}       args    array: arguments to be supplied when invoking the API function.
 *                                  To subscribe to the API supply a callback function as the last item in the array.
 * @param {Boolean}            print   boolean: if true, will print the result of the query
 *
 * @returns {Function|*}        Function/Result: If callback is supplied in @args, will return the unsubscribe function.
 *                              Otherwise, sanitised value of the query will be returned.
 */
export const query = async (func, args = [], multi = false, print = false) => await queryHelper(
    (await getConnection()).api,
    func,
    args,
    multi,
    print,
)

// Save general (not specific to a module or used by multiple modules) data to blockchain storage.
// Each function returns a task (an object) that can be used to create a queued transaction.
// Make sure to supply appropriate `title` and `descrption` properties to `@queueProps`
// and use the `addToQueue(task)` function from queue service to add the task to the queue
export const queueables = {
    // un-/archive a record. See @hashTypes for a list of supported types.
    //
    // Props: 
    // @ownerAddress    string
    // @type            int: type code. See @hashTypes
    // @recordId        string: hash of the record to be un-/archived
    // @archive         boolean: indicates archive or unarchive action
    // @queueProps      string: provide task specific properties (eg: description, title, then, next...)
    archiveRecord: (ownerAddress, type, recordId, archive = true, queueProps = {}) => ({
        ...queueProps,
        address: ownerAddress,
        func: 'api.tx.archive.archiveRecord',
        type: QUEUE_TYPES.TX_STORAGE,
        args: [type, recordId, archive],
    }),
    balanceTransfer: (address, toAddress, amount, queueProps = {}, txId = randomHex(address)) => ({
        ...queueProps,
        address,
        args: [toAddress, amount, txId],
        func: 'api.tx.transfer.networkCurrency',
        txId,
        type: QUEUE_TYPES.TX_STORAGE,
    }),
    bonsaiSaveToken: (ownerAddress, recordTypeCode, recordId, token, queueProps = {}) => ({
        ...queueProps,
        address: ownerAddress,
        args: [recordTypeCode, recordId, token],
        func: 'api.tx.bonsai.updateRecord',
        type: QUEUE_TYPES.TX_STORAGE,
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
        type: QUEUE_TYPES.TX_STORAGE,
        args: [
            signPubKey,
            data,
            signature,
        ],
    }),
}

/**
 * @name randomHex
 * @summary generates a hash using the supplied address and a internally generated time based UUID as seed.
 * 
 * @param {String} address 
 * 
 * @returns {String} hash
 */
export const randomHex = address => generateHash(`${address}${uuid.v1()}`)

// Replace config
export const setConfig = newConfig => {
    config = { ...config, ...newConfig }
    storage.settings.module(MODULE_KEY, { config })

    return config
}

/**
 * @name    setNodes 
 * @summary set blockchain node URLs
 * 
 * @param   {Array} nodes   use empty array to remove all custom nodes
 *                          use null to retrieve saved custom Node URL
 */
export const setNodes = nodes => {
    if (!isArr(nodes)) return storage.settings.module(MODULE_KEY).nodes
    nodes = nodes.filter(Boolean)

    if (!nodes.length) {
        // remove custom URLs
        nodes = null
    }
    storage.settings.module(MODULE_KEY, { nodes })
    window.location.reload(true)
}

export default {
    denominations,
    getConfig,
    getConnection,
    getCurrentBlock,
    getTypes,
    hashTypes,
    nodes,
    query,
    queueables,
    randomHex,
    rxBlockNumber,
    setConfig,
    types,
}