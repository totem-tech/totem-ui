import { addCodecTransform } from 'oo7-substrate'
import timeKeeping from './timeKeeping'
import project from './project'
import { validateAddress } from '../utils/convert'

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
    registerKey: (address, signPubKey, data, signature) => post({
        sender: validateAddress(address),
        call: calls.keyregistry.registerKeys(signPubKey, data, signature),
        compact: false,
        longevity: true
    })
}

// ToDo: use https://gitlab.com/totem-tech/common-utils/raw/master/totem-polkadot-js-types.json
// const types = {
//     "ProjectHash": "Hash",
//     "DeletedProject": "Hash",
//     "ProjectStatus": "u16",
//     "AcceptAssignedStatus": "bool",
//     "BanStatus": "bool",
//     "LockStatus": "bool",
//     "ReasonCode": "u16",
//     "ReasonCodeType": "u16",
//     "NumberOfBlocks": "u64",
//     "PostingPeriod": "u16",
//     "ProjectHashRef": "Hash",
//     "StartOrEndBlockNumber": "u64",
//     "StatusOfTimeRecord": "u16",
//     "ReasonCodeStruct": {
//         "ReasonCodeKey": "ReasonCode",
//         "ReasonCodeTypeKey": "ReasonCodeType"
//     },
//     "ReasonCodeStruct<ReasonCode,ReasonCodeType>": "ReasonCodeStruct",
//     "BannedStruct": {
//         "BanStatusKey": "BanStatus",
//         "ReasonCodeStructKey": "ReasonCodeStruct"
//     },
//     "BannedStruct<BanStatus,ReasonCodeStruct>": "BannedStruct",
//     "Timekeeper": {
//         "worker": "AccountId",
//         "project_hash": "ProjectHashRef",
//         "total_blocks": "NumberOfBlocks",
//         "locked_status": "LockStatus",
//         "submit_status": "StatusOfTimeRecord",
//         "reason_code": "ReasonCodeStruct",
//         "posting_period": "PostingPeriod",
//         "start_block": "StartOrEndBlockNumber",
//     },
//     "Timekeeper<AccountId,ProjectHashRef,NumberOfBlocks,LockStatus,\nStatusOfTimeRecord,ReasonCodeStruct,PostingPeriod,StartOrEndBlockNumber>": "Timekeeper",
// }
const types = {
    "ProjectHash": "Hash",
    "DeletedProject": "Hash",
    "ProjectStatus": "u16",
    "AcceptAssignedStatus": "bool",
    "BanStatus": "bool",
    "LockStatus": "bool",
    "ReasonCode": "u16",
    "ReasonCodeType": "u16",
    "NumberOfBlocks": "u64",
    "PostingPeriod": "u16",
    "ProjectHashRef": "Hash",
    "StartOrEndBlockNumber": "u64",
    "StatusOfTimeRecord": "u16",
    "EncryptNonce": "u16",
    "UserNameHash": "Hash",
    "RandomHashedData": "Hash",
    "Ed25519signature": "H512",
    "SignedBy": "H256",
    "Data": "Vec<u8>",
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
        "end_block": "StartOrEndBlockNumber"
    },
    "Timekeeper<AccountId,ProjectHashRef,NumberOfBlocks,LockStatus,\nStatusOfTimeRecord,ReasonCodeStruct,PostingPeriod,StartOrEndBlockNumber>": "Timekeeper",
    "SignedData": {
        "userHash": "UserNameHash",
        "pub_enc_key": "AccountId",
        "pub_sign_key": "AccountId",
        "random_hash": "RandomHashedData",
        "nonce": "EncryptNonce"
    },
    "SignedData<UserNameHash,AccountId,RandomHashedData,EncryptNonce>": "SignedData"
}
Object.keys(types).forEach(key => addCodecTransform(key, types[key]))