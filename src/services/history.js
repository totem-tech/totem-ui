import DataStorage from '../utils/DataStorage'
import uuid from 'uuid'

const KEY = 'totem_history'
const history = new DataStorage(KEY, true)

export const clear = () => history.setAll(new Map())
export const getAll = history.getAll
export const remove = id => history.remove(id)
export const set = (identity, moduleKey, action, data = {}, timestamp, id = uuid.v1()) => {
    timestamp = timestamp || new Date().toISOString()
    history.set(id, {
        action,
        data,
        identity,
        moduleKey,
        timestamp
    })
    return id
}