// *********
// IMPORTANT NOTE: the terminology "project" has been replaced by "activity" in the UI. 
// It has not been replaced in all of the codes, yet.
// *********
import { hashTypes, query as queryBC } from '../../services/blockchain'
import { translated } from '../../utils/languageHelper'

export const MODULE_KEY = 'projects'
// transaction queue item type
const TX_STORAGE = 'tx_storage'
// activity status codes
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
// status codes that indicate activity is open
export const openStatuses = [statusCodes.open, statusCodes.reopen]

export const query = {
    // getOwner retrives the owner address of an Activity
    //
    // Params:
    // @recordId    string/array: array for multi query
    // @callback    function: (optional) to subscribe to blockchain storage state changes
    // @multi       boolean: (optional) indicates multiple storage states are being queried in a single request
    //
    // Returns Promise/function
    getOwner: (activityId, callback, multi = false) => queryBC(
        query.getOwner_func,
        [activityId, callback].filter(Boolean),
        multi,
    ),
    getOwner_func: 'api.query.projects.projectHashOwner',
    // listByOwner retrieves a list of activity IDs owned by @address
    //
    // Params:
    // @address     string/array: array for multi query
    // @callback    function: (optional) to subscribe to blockchain storage state changes
    // @multi       function: (optional) indicates multiple storage states are being queried in a single request
    //
    // Returns      promise
    listByOwner: (address, callback, multi = false) => queryBC(
        query.listByOwner_func,
        [address, callback].filter(Boolean),
        multi,
    ),
    listByOwner_func: 'api.query.projects.ownerProjectsList',
    // retrieve the status code by Activity ID
    // params
    // @recordId    string/array: array for multi query
    // @callback    function: (optional) to subscribe to blockchain storage state changes
    // @multi       function: (optional) indicates multiple storage states are being queried in a single request
    //
    // Returns      promise
    status: (activityId, callback, multi = false) => queryBC(
        query.status_func,
        [activityId, callback].filter(Boolean),
        multi,
    ),
    status_func: 'api.query.projects.projectHashStatus',
}

// queueables helps create queueable blockchain transactions relevant to activities.
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
    // add a new Activity
    //
    // Params:
    // @ownerAddress    string
    // @recordId        string: Activity ID
    // @queueProps      string: provide task specific properties (eg: description, title, then, next...)
    //
    // returns      object
    add: (
        ownerAddress,
        activityId,
        queueProps = {}
    ) => ({
        ...queueProps,
        address: ownerAddress,
        func: queueables.add_func,
        type: TX_STORAGE,
        args: [activityId],
    }),
    add_func: 'api.tx.projects.addNewProject',
    // transfer ownership of an activity to a new owner address 
    //
    // Params:
    // @ownerAddress    string: current owner of the activity
    // @newOwnerAddress string: address which will be the new owner
    // @recordId        string: activity ID
    // @queueProps      string: provide task specific properties (eg: description, title, then, next...)
    //
    // returns          object
    reassign: (
        ownerAddress,
        newOwnerAddress,
        activityId,
        queueProps = {}
    ) => ({
        ...queueProps,
        address: ownerAddress,
        func: queueables.reassign_func,
        type: TX_STORAGE,
        args: [newOwnerAddress, activityId],
    }),
    reassign_func: 'api.tx.projects.reassignProject',
    // remove an activity
    //
    // Params:
    // @ownerAddress    string: current owner of the activity
    // @recordId        string: activity ID
    // @queueProps      string: provide task specific properties (eg: description, title, then, next...)
    //
    // returns          object
    remove: (
        ownerAddress,
        activityId,
        queueProps = {}
    ) => ({
        ...queueProps,
        address: ownerAddress,
        func: queueables.remove_func,
        type: TX_STORAGE,
        args: [activityId],
    }),
    remove_func: 'api.tx.projects.removeProject',
    // save BONSAI token for an activity
    //
    // Params:
    // @ownerAddress    string
    // @recordId        string: activity ID
    // @token           string: hash generated using activity details
    //
    // Returns          object
    saveBONSAIToken: (
        ownerAddress,
        activityId,
        token,
        queueProps = {}
    ) => ({
        ...queueProps,
        address: ownerAddress,
        func: queueables.saveBONSAIToken_func,
        type: TX_STORAGE,
        args: [
            hashTypes.activityId,
            activityId,
            token
        ],
    }),
    saveBONSAIToken_func: 'api.tx.bonsai.updateRecord',
    // change activity status
    //
    // Params:
    // @ownerAddress    string: current owner of the activity
    // @recordId        string: activity ID
    // @queueProps      string: provide task specific properties (eg: description, title, then, next...)
    //
    // returns          object
    setStatus: (ownerAddress, activityId, statusCode, queueProps = {}) => ({
        ...queueProps,
        address: ownerAddress,
        func: queueables.setStatus_func,
        type: TX_STORAGE,
        args: [activityId, statusCode],
    }),
    setStatus_func: 'api.tx.projects.setStatusProject',
}
export default {
    MODULE_KEY,
    openStatuses,
    query,
    queueables,
    statusCodes,
    statusTexts,
}