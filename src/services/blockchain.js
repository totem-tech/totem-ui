import { addCodecTransform, post } from 'oo7-substrate'
import project from './project'
import storage from './storage'
import { hashToStr, validateAddress } from '../utils/convert'
import { setNetworkDefault, denominationInfo } from 'oo7-substrate'
import { connect } from '../utils/polkadotHelper'
import types from '../utils/totem-polkadot-js-types'
import { isObj } from '../utils/utils'

// oo7-substrate: register custom types
Object.keys(types).forEach(key => addCodecTransform(key, types[key]))
const moduleKey = 'blockchain'
const TX_STORAGE = 'tx_storage'
let config = {
    primary: 'Ktx',
    unit: 'Transactions',
    ticker: 'XTX'
}
export const connection = { api: null, provider: null }
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
    /// 5000
    /// 6000
    /// 7000
    /// 8000
    /// 9000
}
export const nodes = [
    'wss://node1.totem.live',
]

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
        address: address,
        func: 'api.tx.keyregistry.registerKeys',
        type: TX_STORAGE,
        args: [
            signPubKey,
            data,
            signature,
        ],
    })
}

export const getConfig = () => config

export const getConnection = () => {
    if (connection.api && connection.api._isConnected.value) return new Promise(resolve => resolve(connection))
    const nodeUrl = nodes[0]
    console.log('Polkadot: connecting to', nodeUrl)
    return connect(nodeUrl, config.types, true).then(({ api, provider }) => {
        console.log('Connected using Polkadot', { api, provider })
        connection.api = api
        connection.provider = provider
        window.connection = connection
        return connection
    })
}

// getTypes returns a promise with 
export const getTypes = () => new Promise(resolve => resolve(types))
// Replace configs
export const setConfig = newConfig => {
    if (isObj(newConfig)) {
        config = { ...config, ...newConfig }
    }
    storage.settings.module.set(moduleKey, { config })
    denominationInfo.init({ ...config, denominations })
}


// Include all functions here that will be used by Queue Service
// Only blockchain transactions
export default {
    getConnection,
    tasks,
    addNewProject: project.add,
    reassignProject: project.reassign,
    removeProject: project.remove,
    closeProject: project.close,
    reopenProject: project.reopen,
    //// timeKeeping_record_save: timeKeeping.record.save,
    //// timeKeeping_record_approve: timeKeeping.record.approve,
    //// timeKeeping_worker_add: timeKeeping.worker.add,
    //// timeKeeping_worker_accept: timeKeeping.worker.accept,
    // transfer: (addressFrom, addressTo, amount) => post({
    //     sender: runtime.indices.tryIndex(validateAddress(addressFrom)),
    //     call: calls.balances.transfer(runtime.indices.tryIndex(validateAddress(addressTo)), amount),
    //     compact: false,
    //     longevity: true
    // }),
    // registerKey: (address, signPubKey, data, signature) => post({
    //     sender: validateAddress(address),
    //     call: calls.keyregistry.registerKeys(signPubKey, data, signature),
    //     compact: false,
    //     longevity: true
    // })
}