import { addCodecTransform, post } from 'oo7-substrate'
import timeKeeping from './timeKeeping'
import project from './project'
import { validateAddress } from '../utils/convert'
import { setNetworkDefault, denominationInfo } from 'oo7-substrate'
import { isObj } from '../utils/utils'

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

// use a placeholder promsie as types may eventually be retrived frome external source
export const getTypes = () => new Promise(resolve => resolve(types))

export const nodes = [
    'wss://node1.totem.live', // post-upgrade node (https)
    // 'wss://165.22.72.170:443', // post-upgrade node (http)
    // 'ws://localhost:9944', // local node
    // 'ws://104.248.37.226:16181/', // pre-upgrade node
    // 'wss://substrate-rpc.parity.io/' // parity hosted node
]

// Replace configs
export const setConfig = newConfig => {
    if (isObj(newConfig)) {
        config = Object.freeze(newConfig)
    }
    denominationInfo.init({ ...config, denominations })
}
// setConfig(config)

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

// ToDo: use https://gitlab.com/totem-tech/common-utils/raw/master/totem-polkadot-js-types.json
const types = {
    "ProjectHash": "Hash",
    "DeletedProject": "Hash",
    "ProjectStatus": "u16",
    "AcceptAssignedStatus": "bool",
    "BanStatus": "bool",
    "LockStatus": "bool",
    "ReasonCode": "u16",
    "ReasonCodeType": "u16",
    "NumberOfBreaks": "u16",
    "NumberOfBlocks": "u64",
    "PostingPeriod": "u16",
    "ProjectHashRef": "Hash",
    "StartOrEndBlockNumber": "u64",
    "StatusOfTimeRecord": "u16",
    "EncryptPublicKey": "H256",
    "EncryptNonce": "u64",
    "UserNameHash": "Hash",
    "RandomHashedData": "Hash",
    "Ed25519signature": "H512",
    "SignedBy": "H256",
    "Data": "Vec<u8>",
    "SignedData": {
        "user_hash": "UserNameHash",
        "pub_enc_key": "EncryptPublicKey",
        "pub_sign_key": "SignedBy",
        "nonce": "EncryptNonce"
    },
    "SignedData<UserNameHash, EncryptPublicKey, SignedBy, EncryptNonce>": "SignedData",
    "ReasonCodeStruct": {
        "ReasonCodeKey": "ReasonCode",
        "ReasonCodeTypeKey": "ReasonCodeType"
    },
    "ReasonCodeStruct<ReasonCode,ReasonCodeType>": "ReasonCodeStruct",
    "BannedStruct": {
        "BanStatusKey": "BanStatus",
        "ReasonCodeStructKey": "ReasonCodeStruct"
    },
    "BannedStruct<BanStatus,ReasonCodeStruct>": "BannedStruct",
    "Timekeeper": {
        "total_blocks": "NumberOfBlocks",
        "locked_status": "LockStatus",
        "locked_reason": "ReasonCodeStruct",
        "submit_status": "StatusOfTimeRecord",
        "reason_code": "ReasonCodeStruct",
        "posting_period": "PostingPeriod",
        "start_block": "StartOrEndBlockNumber",
        "end_block": "StartOrEndBlockNumber",
        "nr_of_breaks": "NumberOfBreaks"
    },
    "Timekeeper<AccountId,ProjectHashRef,NumberOfBlocks,LockStatus,\nStatusOfTimeRecord,ReasonCodeStruct,PostingPeriod,StartOrEndBlockNumber,NumberOfBreaks>": "Timekeeper",
    // remove
    "EncryptedVerificationData": "Hash"

}
Object.keys(types).forEach(key => addCodecTransform(key, types[key]))