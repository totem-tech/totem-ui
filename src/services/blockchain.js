// import { Bond } from 'oo7'
import { addCodecTransform, calls, post, runtime, ss58Decode } from 'oo7-substrate'
import { isBond } from '../utils/utils'
import { hexToBytes } from '../utils/convert'

const validatedSenderAddress = address => runtime.indices.tryIndex(
    new Bond().defaultTo(ss58Decode(isBond(address) ? address._value : address))
)
const hashHexToBytes = hash => hexToBytes(isBond(hash) ? hash._value : hash)

// addNewProject registers a hash against a wallet into the blockchain
//
// Params:
// @address string/Bond
// @hash    string: an unique hash generated by using project name, owner address and description
//
// Returns Bond : expected values from returned bond =>
//              1. {signing: true/false}
//              2. {sending: true/false}
//              3. 'ready'
//              4. {finalized: 'TXID'}
//              5. {failed: {code: xxx, message: 'error message'}}
export const addNewProject = (ownerAddress, hash) => {
    addCodecTransform('ProjectHash', 'Hash')

    return post({
        sender: validatedSenderAddress(ownerAddress),
        call: calls.projects.addNewProject(hashHexToBytes(hash)),
        compact: false,
        longevity: true
    })
}

// ownerProjectsList retrieves a list of project hashes owned by @address
//
// Returns Bond
export const ownerProjectsList = address => {
    addCodecTransform('ProjectHash', 'Hash')
    return runtime.projects.ownerProjectsList(ss58Decode(address))
}

//
export const projectHashStatus = hash => {
    addCodecTransform('ProjectStatus', 'u16')
    return runtime.projects.projectHashStatus(hashHexToBytes(hash))
}

// reassignProject transfers ownership of a project to a new owner address 
//
// Params:
// @ownerAddress    string/Bond: current owner of the project
// @newOwnerAddress string/Bond: address which will be the new owner
// @hash            string     : unique hash/ID of the project
//
// Returns Bond : expected values from returned bond =>
//              1. {signing: true/false}
//              2. {sending: true/false}
//              3. 'ready'
//              4. {finalized: 'TXID'}
//              5. {failed: {code: xxx, message: 'error message'}}
export const reassignProject = (ownerAddress, newOwnerAddress, hash) => {
    addCodecTransform('ProjectHash', 'Hash')
    return post({
        sender: validatedSenderAddress(ownerAddress),
        call: calls.projects.reassignProject(newOwnerAddress, hashHexToBytes(hash)),
        compact: false,
        longevity: true
    })
}

// removeProject removes project
//
// Params:
// @ownerAddress    string/Bond: current owner of the project
// @hash            string     : unique hash/ID of the project
//
// Returns Bond : expected values from returned bond =>
//              1. {signing: true/false}
//              2. {sending: true/false}
//              3. 'ready'
//              4. {finalized: 'TXID'}
//              5. {failed: {code: xxx, message: 'error message'}}
export const removeProject = (ownerAddress, hash) => {
    addCodecTransform('ProjectHash', 'Hash')
    return post({
        sender: validatedSenderAddress(ownerAddress),
        call: calls.projects.removeProject(hashHexToBytes(hash)),
        compact: false,
        longevity: true
    })
}

// closeProject removes project
//
// Params:
// @ownerAddress    string/Bond: current owner of the project
// @hash            string     : unique hash/ID of the project
//
// Returns Bond : expected values from returned bond =>
//              1. {signing: true/false}
//              2. {sending: true/false}
//              3. 'ready'
//              4. {finalized: 'TXID'}
//              5. {failed: {code: xxx, message: 'error message'}}
export const closeProject = (ownerAddress, hash) => {
    addCodecTransform('ProjectHash', 'Hash')
    return post({
        sender: validatedSenderAddress(ownerAddress),
        call: calls.projects.closeProject(hashHexToBytes(hash)),
        compact: false,
        longevity: true
    })
}

// reopenProject removes project
//
// Params:
// @ownerAddress    string/Bond: current owner of the project
// @hash            string     : unique hash/ID of the project
//
// Returns Bond : expected values from returned bond =>
//              1. {signing: true/false}
//              2. {sending: true/false}
//              3. 'ready'
//              4. {finalized: 'TXID'}
//              5. {failed: {code: xxx, message: 'error message'}}
export const reopenProject = (ownerAddress, hash) => {
    addCodecTransform('ProjectHash', 'Hash')
    return post({
        sender: validatedSenderAddress(ownerAddress),
        call: calls.projects.reopenProject(hashHexToBytes(hash)),
        compact: false,
        longevity: true
    })
}

addCodecTransform('ProjectHashRef', 'Hash')
// timeKeepingPendingInvites retrieves pending invites by address
export const timeKeeping = {
    record: {
        // Blockchain transaction
        // @postingPeriod u16: 15 fiscal periods (0-14) // not yet implemented use default 0
        add: (projectHash, workerAddress, recordHash, blockCount, blockEnd, postingPeriod) => {
            return post({
                sender: validatedSenderAddress(workerAddress),
                call: calls.timekeeping.workerAcceptanceProject(
                    hashHexToBytes(projectHash),
                    hashHexToBytes(recordHash),
                    blockCount,
                    postingPeriod,
                    blockEnd,
                ),
                compact: false,
                longevity: true
            })
        },
        // Blockchain transaction
        // (project owner) approve a time record
        approve: (projectHash, ownerAddress, workerAddress, recordHash, status, locked, reason) => {
            return post({
                sender: validatedSenderAddress(ownerAddress),
                call: calls.timekeeping.authoriseTime(
                    hashHexToBytes(projectHash),
                    validatedSenderAddress(ownerAddress),
                    validatedSenderAddress(workerAddress),
                    hashHexToBytes(recordHash),
                    status,
                    locked,
                    reason,
                ),
                compact: false,
                longevity: true
            })
        },
        // get details of a record
        get: (projectHash, workerAddress, recordHash) => runtime.timekeeping.timeRecord(
            validatedSenderAddress(workerAddress),
            hashHexToBytes(projectHash),
            hashHexToBytes(recordHash)
        ),
    },
    invitation: {
        // Blockchain transaction
        // (worker) accept invitation to a project
        accept: (projectHash, workerAddress) => {
            return post({
                sender: validatedSenderAddress(workerAddress),
                call: calls.timekeeping.workerAcceptanceProject(hashHexToBytes(projectHash)),
                compact: false,
                longevity: true
            })
        },
        // Blockchain transaction
        // (project owner) invite a worker to join a project
        add: (projectHash, ownerAddress, workerAddress) => {
            return post({
                sender: validatedSenderAddress(ownerAddress),
                call: calls.timekeeping.notifyProjectWorker(
                    ss58Decode(workerAddress),
                    hashHexToBytes(projectHash),
                ),
                compact: false,
                longevity: true
            })
        },
        // status of an invitation
        status: (projectHash, workerAddress) => runtime.timekeeping.workerProjectsBacklogStatus(
            hashHexToBytes(projectHash),
            ss58Decode(workerAddress)
        ),
        // Worker's pending invitation to projects
        pending: workerAddress => runtime.timekeeping.workerProjectsBacklogList(ss58Decode(workerAddress)),
    },
    // list of records booked by worker
    records: address => runtime.timekeeping.workerTimeRecordsHashList(validatedSenderAddress(address)),
    // list of workers that accepted invitation
    workers: projectHash => runtime.timekeeping.projectWorkersList(hashHexToBytes(projectHash)),
    // check if worker is banned. undefined: not banned, object: banned
    workerBanStatus: (projectHash, address) => runtime.timekeeping.projectWorkersBanList(
        hashHexToBytes(projectHash),
        validatedSenderAddress(address)
    ),
}

// Include all functions here that will be used by Queue Service
// Only blockchain transactions
export default {
    addNewProject,
    reassignProject,
    removeProject,
    closeProject,
    reopenProject,
    timeKeeping_invitation_accept: timeKeeping.invitation.accept,
    timeKeeping_invitation_add: timeKeeping.invitation.add,
    timeKeeping_record_add: timeKeeping.record.add,
    timeKeeping_record_approve: timeKeeping.record.approve,
}