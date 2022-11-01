import uuid from 'uuid'
import DataStorage from '../../utils/DataStorage'
import { isObj, isStr, isValidNumber, isDefined } from '../../utils/utils'
import storage from '../../services/storage'
import { getUser } from '../../utils/chatClient'

const key = 'history'
export const MODULE_KEY = 'totem_' + key
const history = new DataStorage(MODULE_KEY, true)
export const rxHistory = history.rxData
export const LIMIT_DEFAULT = 500 // default number of items to store
// read/write to module settings
const rw = value => storage.settings.module(MODULE_KEY, value) || {}

export const clearAll = () => history.setAll(new Map(), true)

export const getAll = () => history.getAll()


export const getById = id => history.get(id)

export const remove = id => history.delete(id)

/**
 * @name    limit
 * @summary set number of actions to store and apply to history items.
 * use null for unlimited history.
 *
 * @param   {number}: number of items to store. Use '0' (zero) to save unlimited items
 * @param   {Boolean}: whether to trigger update on the history list (if open)
 *
 * @returns {Number}
 */
export const limit = (newLimit) => {
    let limit = rw().limit
    if (!isDefined(limit)) limit = LIMIT_DEFAULT
    const changed = isValidNumber(newLimit) && limit != newLimit
    if (changed) {
        limit = newLimit
        rw({ limit })
    }

    if (limit === 0 || history.size <= limit) return limit

    const limitted = Array.from(history.getAll()).slice(-limit)
    history.setAll(new Map(limitted), true)
    return limit
}

const actionIcons = {
    'api.tx.': 'connectdevelop',        // icon for all blockchain transactions 
    'client.faucetRequest': 'money',    // icon for faucet requests
    'client.project': 'briefcase',      // icon for all project related requests
}
// icons for notification types
const notificationIcons = {
    identity: {
        introduce: 'handshake',
        invitation_response: 'upload',
        request: 'download',
        share: 'upload',
    },
    // task: 'tasks',
    timekeeping: {
        invitation: 'group',
        invitation_response: 'group',
    }
}

// enable/disable history data donation
// if enabled, user's usage data will be anonymously sent to Totem servers for analytical purposes
export const historyDataDonation = enable => (isBool(enable) ? rw({ donate }) : rw()).donate

// checks if action should be logged. All transaction related actions are accepted.
// returns appropriate icon name if valid
export const historyWorthy = (func, args) => {
    if (func.startsWith('api.tx.')) return actionIcons['api.tx.']
    const historyIcon = 'history' // for any new/undefined types that should be logged
    switch (func) {
        case 'client.notificationSetStatus': return false
        case 'client.project':
            // only log project creation and update actions
            const [recordId, project] = args
            if (!recordId || !isObj(project)) return false
            break
        case 'client.notify':
            const [_, type, childType] = args
            const icon = notificationIcons[type]
            return (isStr(icon) ? icon : isObj(icon) && icon[childType]) || historyIcon
    }
    return actionIcons[func] || func.startsWith('client.') && historyIcon
}

// add or update a history item. Each item represents an individual successful or failed queued task 
//
// Params:
// @identity    string: address of the identity that executed the action.
//                      For transaction actions, the source address of the transaction will be used.
//                      For messaging serivce, if action is independant of the identity the User ID,
//                      otherwise the selected identity, should be used.
// @action      string: queued task's `func` property or a string that describe what action user has taken.
//                      For messaging service related actions, should start with 'client.'.
//                      For transaction related actions, should start with 'api.tx.'. 
// @data        array: values used for this action so that the action can be repeat if the user desires so.
//                      Typically, queued task's `args` property will be used.
// @title       string: (required) title of the history event.
//                      Typically, same as the title of the queued task.
// @description string: description of the action.
//                      Typically, same as the description of the queued task.
// @status      string: status of the action. Acceptable values: 
//                      'success': indicates action was executed successfully.
//                      'error': indicates action failed to execute.
//                              Should contain an error @message or a brief (preferably one-liner) explainer text.
// @message     string: (optional) a message that corresponds the @status.
// @groupId     string: (optional) if an action is part of a nested queue task, this can be used to group them together.
// @timestamp   string: (optional) datetime in ISO format (timezone: UTC). Will be auto-generated, if not supplied.
// @id          string: (optional) an unique ID. Will be auto-generated, if not supplied.
export const save = (
    identity,
    action,
    data = [], // queue task's @args values
    title,
    description,
    status = 'success',
    message,
    groupId, // the root ID of a series of queued task
    id = uuid.v1(),
    balance,
    result,
    txId,
    timestamp = new Date().toISOString(),
) => {
    const icon = title && historyWorthy(action, data)
    if (!icon) return
    // id already exists remove it from history to re-appear at the end of the list
    if (history.get(id)) history.delete(id)
    history.set(id, {
        action,
        balance,
        data,
        description,
        icon,
        identity,
        groupId,
        message,
        result,
        status,
        timestamp,
        title,
        txId,
        userId: (getUser() || {}).id,
    })
    // apply history limit
    limit(undefined, false)
    return id
}