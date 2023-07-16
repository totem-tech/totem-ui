// *********
// IMPORTANT NOTE the terminology "project" has been replaced by "activity" in the UI. 
// It has not been replaced in all of the codes, yet.
// *********
import { hashTypes, query as queryBC } from '../../services/blockchain'
import { translated } from '../../utils/languageHelper'

export const MODULE_KEY = 'projects'
const queryPrefix = 'api.query.projects.'
const txPrefix = 'api.tx.projects.'
// transaction queue item type
const TX_STORAGE = 'tx_storage'
// project status codes
export const statusCodes = {
    open: 0,
    reopen: 100,
    onHold: 200,
    abandon: 300,
    cancel: 400,
    close: 500,
    delete: 999,
}
export const statusTexts = {
    0: 'open',
    100: 're-opened',
    200: 'on-hold',
    300: 'abandoned',
    400: 'canceled',
    500: 'closed',
    999: 'deleted',
    unknown: 'unknown',
}
translated(statusTexts)
// status codes that indicate project is open
export const openStatuses = [statusCodes.open, statusCodes.reopen]

export const query = {
    // getOwner retrives the owner address of a project
    //
    // Params:
    // @recordId    string/array: array for multi query
    // @callback    function: (optional) to subscribe to blockchain storage state changes
    // @multi       boolean: (optional) indicates multiple storage states are being queried in a single request
    //
    // Returns Promise/function
    getOwner: (recordId, callback, multi = false) => queryBC(
        queryPrefix + 'projectHashOwner',
        [recordId, callback].filter(Boolean),
        multi,
    ),
    // listByOwner retrieves a list of project hashes owned by @address
    //
    // Params:
    // @address     string/array: array for multi query
    // @callback    function: (optional) to subscribe to blockchain storage state changes
    // @multi       function: (optional) indicates multiple storage states are being queried in a single request
    //
    // Returns      promise
    listByOwner: (address, callback, multi = false) => queryBC(
        queryPrefix + 'ownerProjectsList',
        [address, callback].filter(Boolean),
        multi,
    ),
    // status retrieves the status code of a project
    // params
    // @recordId    string/array: array for multi query
    // @callback    function: (optional) to subscribe to blockchain storage state changes
    // @multi       function: (optional) indicates multiple storage states are being queried in a single request
    //
    // Returns      promise
    status: (recordId, callback, multi = false) => queryBC(
        queryPrefix + 'projectHashStatus',
        [recordId, callback].filter(Boolean),
        multi,
    ),
}

// queueables helps create queueable blockchain transactions relevant to projects.
// Make sure to supply appropriate `title` and `descrption` properties to `@queueProps`
// so that user can be notified by a toast message.
//
// Usage Example:
// const queueProps = {
//      title: 'a simple title',   
//      description: 'short description about the action being executed',
// }
// queueService.addToQueue(queueables.add('', '', queueProps))
export const queueables = {
    // add a new project
    //
    // Params:
    // @ownerAddress    string
    // @recordId        string: project ID
    // @queueProps      string: provide task specific properties (eg: description, title, then, next...)
    //
    // returns      object
    add: (ownerAddress, recordId, queueProps = {}) => ({
        ...queueProps,
        address: ownerAddress,
        func: txPrefix + 'addNewProject',
        type: TX_STORAGE,
        args: [recordId],
    }),
    // transfer ownership of a project to a new owner address 
    //
    // Params:
    // @ownerAddress    string: current owner of the project
    // @newOwnerAddress string: address which will be the new owner
    // @recordId        string: project ID
    // @queueProps      string: provide task specific properties (eg: description, title, then, next...)
    //
    // returns          object
    reassign: (ownerAddress, newOwnerAddress, recordId, queueProps = {}) => ({
        ...queueProps,
        address: ownerAddress,
        func: txPrefix + 'reassignProject',
        type: TX_STORAGE,
        args: [newOwnerAddress, recordId],
    }),
    // remove a project
    //
    // Params:
    // @ownerAddress    string: current owner of the project
    // @recordId        string  : project ID
    // @queueProps      string: provide task specific properties (eg: description, title, then, next...)
    //
    // returns          object
    remove: (ownerAddress, recordId, queueProps = {}) => ({
        ...queueProps,
        address: ownerAddress,
        func: txPrefix + 'removeProject',
        type: TX_STORAGE,
        args: [recordId],
    }),
    // save BONSAI token for a project
    //
    // Params:
    // @ownerAddress    string
    // @recordId        string: project ID
    // @token           string: hash generated using project details
    //
    // Returns          object
    saveBONSAIToken: (ownerAddress, recordId, token, queueProps = {}) => ({
        ...queueProps,
        address: ownerAddress,
        func: 'api.tx.bonsai.updateRecord',
        type: TX_STORAGE,
        args: [hashTypes.projectHash, recordId, token],
    }),
    // change project status
    //
    // Params:
    // @ownerAddress    string: current owner of the project
    // @recordId        string: project ID
    // @queueProps      string: provide task specific properties (eg: description, title, then, next...)
    //
    // returns          object
    setStatus: (ownerAddress, recordId, statusCode, queueProps = {}) => ({
        ...queueProps,
        address: ownerAddress,
        func: txPrefix + 'setStatusProject',
        type: TX_STORAGE,
        args: [recordId, statusCode],
    }),
}
export default {
    openStatuses,
    statusCodes,
    queueables,
    query,
}