import { addCodecTransform, post } from 'oo7-substrate'
import timeKeeping from './timeKeeping'
import project from './project'
import { validateAddress } from '../utils/convert'
import { setNetworkDefault, denominationInfo } from 'oo7-substrate'
import { isObj } from '../utils/utils'
import types from '../utils/totem-polkadot-js-types'

// oo7-substrate: register custom types
Object.keys(types).forEach(key => addCodecTransform(key, types[key]))

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
export let config = Object.freeze({
    primary: 'Gtx',
    unit: 'Transactions',
    ticker: 'XTX'
})

// getTypes returns a promise with 
export const getTypes = () => new Promise(resolve => resolve(types))

export const nodes = [
    'wss://node1.totem.live',
]

// Replace configs
export const setConfig = newConfig => {
    if (isObj(newConfig)) {
        config = Object.freeze(newConfig)
    }
    denominationInfo.init({ ...config, denominations })
}

// Include all functions here that will be used by Queue Service
// Only blockchain transactions
export default {
    addNewProject: project.add,
    reassignProject: project.reassign,
    removeProject: project.remove,
    closeProject: project.close,
    reopenProject: project.reopen,
    timeKeeping_record_save: timeKeeping.record.save,
    timeKeeping_record_approve: timeKeeping.record.approve,
    timeKeeping_worker_add: timeKeeping.worker.add,
    timeKeeping_worker_accept: timeKeeping.worker.accept,
    transfer: (addressFrom, addressTo, amount) => post({
        sender: runtime.indices.tryIndex(validateAddress(addressFrom)),
        call: calls.balances.transfer(runtime.indices.tryIndex(validateAddress(addressTo)), amount),
        compact: false,
        longevity: true
    }),
    registerKey: (address, signPubKey, data, signature) => post({
        sender: validateAddress(address),
        call: calls.keyregistry.registerKeys(signPubKey, data, signature),
        compact: false,
        longevity: true
    })
}