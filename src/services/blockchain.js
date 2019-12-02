import { addCodecTransform, calls, post, runtime, ss58Decode } from 'oo7-substrate'
import timeKeeping from './timeKeeping'
import project from './project'

// Include all functions here that will be used by Queue Service
// Only blockchain transactions
export default {
    addNewProject: project.add,
    reassignProject: project.reassign,
    removeProject: project.remove,
    closeProject: project.close,
    reopenProject: project.reopen,
    timeKeeping_invitation_accept: timeKeeping.invitation.accept,
    timeKeeping_invitation_add: timeKeeping.invitation.add,
    timeKeeping_record_add: timeKeeping.record.add,
    timeKeeping_record_approve: timeKeeping.record.approve,
}

// ToDo: use common-utils library
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
        "worker": "AccountId",
        "project_hash": "ProjectHashRef",
        "total_blocks": "NumberOfBlocks",
        "locked_status": "LockStatus",
        "submit_status": "StatusOfTimeRecord",
        "reason_code": "ReasonCodeStruct",
        "posting_period": "PostingPeriod",
        "start_block": "StartOrEndBlockNumber",
    },
    "Timekeeper<AccountId,ProjectHashRef,NumberOfBlocks,LockStatus,\nStatusOfTimeRecord,ReasonCodeStruct,PostingPeriod,StartOrEndBlockNumber>": "Timekeeper",
}
Object.keys(types).forEach(key => addCodecTransform(key, types[key]))