import uuid from 'uuid'
import { Bond } from 'oo7'
import DataStorage from '../utils/DataStorage'
import { isObj, isStr, isValidNumber, isDefined } from '../utils/utils'
import storage from './storage'

const key = 'history'
const MODULE_KEY = 'totem_' + key
const history = new DataStorage(MODULE_KEY, true)
const LIMIT = 500 // default number of items to store
// read/write to module settings
const rw = value => storage.settings.module(MODULE_KEY, value) || {}

export const bond = new Bond().defaultTo(uuid.v1())
const updateBond = () => bond.changed(uuid.v1())
export const clearAll = () => history.setAll(new Map()) | updateBond()

export const getAll = () => history.getAll()

export const remove = id => history.delete(id) | updateBond()

// set number of actions to store and apply to history items
// use null for unlimited history
//
// Params:
// @newLimit    number: number of items to store. Use '0' (zero) to save unlimited items
// @trigger     boolean: whether to trigger update on the history list (if open)
//
// Returns      number
export const limit = (newLimit, trigger = true) => {
    let limit = rw().limit
    if (!isDefined(limit)) limit = LIMIT
    if (limit != newLimit && isValidNumber(newLimit)) {
        limit = newLimit
        rw({ limit })
    }

    if (limit === 0 || history.size <= limit) return limit

    const arr = Array.from(history.getAll())
    const limitted = arr.slice(arr.length - limit)
    history.setAll(new Map(limitted))
    trigger && updateBond()
    return limit
}

const actionIcons = {
    'api.tx.': 'connectdevelop',
    'client.faucetRequest': 'money',
    'client.project': 'tasks',
}
const notifyTypesIcons = {
    identity: {
        request: 'download',
        share: 'upload',
    }
}

// enable/disable history data donation
// if enabled, user's usage data will be anonymously sent to Totem servers for analytical purposes
export const historyDataDonation = enable => (isBool(enable) ? rw({ donate }) : rw()).donate

// checks if action should be logged. All transaction related actions are accepted.
// returns appropriate icon name if valid
export const historyWorthy = (func, args) => {
    if (func.startsWith('api.tx.')) return actionIcons['api.tx.']
    switch (func) {
        case 'client.project':
            // only log project creation and update actions
            const [hash, project] = args
            if (!hash || !isObj(project)) return false
            break
        case 'client.notify':
            const [_, type, childType] = args
            const childTypes = notifyTypesIcons[type]
            return isStr(childTypes) ? childTypes : childTypes[childType]
    }
    return actionIcons[func] || false
}

// add or update a history item. Each item represents an individual successful or failed queued task 
//
// Params:
// @identity    string: address of the identity that executed the action.
//                      For transaction actions, the source address of the transaction will be used.
//                      For messaging serivce, if action is independant of the identity the User ID, otherwise the selected identity, should be used.
// @action      string: queued task's `func` property or a string that describe what action user has taken.
//                      For messaging service related actions, should start with 'client.'.
//                      For transaction related actions, should start with 'api.tx.'. 
// @data        array: values used for this action so that the action can be repeat if the user desires so.
//                      Typically, queued task's `args` property will be used.
// @title       string: title of the action.
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
    groupId,
    timestamp = new Date().toISOString(),
    id = uuid.v1(),
) => {
    const icon = historyWorthy(action, data)
    if (!icon) return
    // id alredy exists remove it from history to re-appear at the end of the list
    if (history.get(id)) history.delete(id)
    history.set(id, {
        identity,
        action,
        data,
        title,
        description,
        status,
        message,
        groupId,
        timestamp,
        icon,
    })
    // apply history limit
    limit(undefined, false)
    updateBond()
    return id
}