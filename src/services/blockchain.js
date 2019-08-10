// import { Bond } from 'oo7'
import { addCodecTransform, calls, hexToBytes, post, runtime, ss58Decode } from 'oo7-substrate'
import { isBond } from '../utils/utils'

const validatedAddress = address => runtime.indices.tryIndex(
    new Bond().defaultTo(ss58Decode(isBond(address) ? address._value : address)
))
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
        sender: validatedAddress(ownerAddress),
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
        sender: validatedAddress(ownerAddress),
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
        sender: validatedAddress(ownerAddress),
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
        sender: validatedAddress(ownerAddress),
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
        sender: validatedAddress(ownerAddress),
        call: calls.projects.reopenProject(hashHexToBytes(hash)),
        compact: false,
        longevity: true
    })
}

// Include all functions here that will be used by Queue Service
export default {
    addNewProject,
    reassignProject,
    removeProject,
    closeProject,
    reopenProject,
}