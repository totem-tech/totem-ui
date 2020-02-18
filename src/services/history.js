import DataStorage from '../utils/DataStorage'
import uuid from 'uuid'

const KEY = 'totem_history'
const history = new DataStorage(KEY, true)
let limit = 500

export const clear = () => history.setAll(new Map())

export const getAll = history.getAll

export const remove = id => history.remove(id)

// number of actions to keep
// use null for unlimited history
export const setLimit = newLimit => limit = newLimit === null || isValidNumber(newLimit) ? newLimit : limit

// list of ChatClient property names that should be logged along with their appropriate title
export const historyWorthyClientFuncs = {

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
    })

    if (limit != null && history.size > limit) {
        const arr = Array.from(history.getAll())
        history.setAll(new Map(arr.slice(arr.length - limit)))
    }
    return id
}