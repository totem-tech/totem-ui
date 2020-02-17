/*
 * Storage Service: to handle all interactions with browser's localStorage.
 * Typically this should be used by other services
 */
import { isObj } from '../utils/utils'
import DataStorage from '../utils/DataStorage'
// Local Storage item key prefix for all items
const PREFIX = 'totem_'
const PREFIX_STATIC = PREFIX + 'static_'
const storage = {}
// contain a list of all localStorage keys that are for temporary/non-crucial data. Eg: cached data, country list, language data
// const tempStorageKeys = []

// export const addTempStorageKey = key => !tempStorageKeys.includes(key) && tempStorageKeys.push(key)

storage.countries = new DataStorage(PREFIX_STATIC + 'countries', true)

const settingsStorage = new DataStorage(PREFIX + 'settings', true)
storage.settings = {
    // global settings
    global: (itemKey, value) => {
        const key = 'global_settings'
        const gs = settingsStorage.get(key) || {}
        if (!itemKey && !value) return gs
        if (isObj(value)) {
            gs[itemKey] = { ...gs[itemKey], ...value }
            settingsStorage.set(key, gs)
        }
        return gs[itemKey] || {}
    },
    // store and retrieve module specific settings
    // 
    // Params: 
    // @key     string: unique identifier for target module
    // @value   object: (optional) settings/value to replace existing.
    //
    // returns  object: value object
    module: (moduleKey, value) => {
        const key = 'module_settings'
        const ms = settingsStorage.get(key) || {}
        if (isObj(value)) {
            ms[moduleKey] = value
            settingsStorage.set(key, ms)
        }
        return ms[moduleKey] || {}
    },
}
// add/update a property to specific module setting
storage.settings.module.set = (moduleKey, keyValue = {}) => {
    const moduleSettings = storage.settings.module(moduleKey)
    storage.settings.module(moduleKey, { ...moduleSettings, ...keyValue })
}
export default storage