/*
 * Storage Service: to handle all interactions with browser's localStorage.
 * Typically this should be used by other services
 */
import { hasValue, isMap, isObj } from '../utils/utils'
import DataStorage from '../utils/DataStorage'
// Local Storage item key prefix for all items
const PREFIX = 'totem_'
const PREFIX_STATIC = PREFIX + 'static_'
const CACHE_KEY = PREFIX + 'cache'
const storage = {}

const cache = new DataStorage(CACHE_KEY)
storage.countries = new DataStorage(PREFIX_STATIC + 'countries', true)
const settings = new DataStorage(PREFIX + 'settings', true)

export const rw = (storage, key, propKey, value) => {
    if (!storage || !key) return {}
    const data = storage.get(key) || {}
    let save = true
    if (!propKey) return data

    if (value === null) {
        // remove from storage
        delete data[propKey]
    } else if (isMap(value)) {
        // convert map to array. PS: may need to convert back to Map on retrieval
        data[propKey] = Array.from(value)
    } else if (isObj(value)) {
        // merge with existing value
        data[propKey] = { ...data[propKey], ...value }
    } else if (hasValue(value)) {
        data[propKey] = value
    } else {
        save = false
    }
    save && storage.set(key, data)
    return data[propKey]
}
storage.settings = {
    // global settings
    global: (itemKey, value) => rw(settings, 'global_settings', itemKey, value),

    // store and retrieve module specific settings
    // 
    // Params: 
    // @key     string: unique identifier for target module
    // @value   object: (optional) settings/value to replace existing.
    //
    // returns  object: value object
    module: (moduleKey, value) => rw(settings, 'module_settings', moduleKey, value)
}
storage.cache = (moduleKey, itemKey, value) => rw(cache, moduleKey, itemKey, value)

// removes cache and static data
storage.clearNonEssentialData = () => {
    const keys = [CACHE_KEY]
    Object.keys(localStorage)
        .map(key => {
            if (!keys.includes(key) && !key.startsWith(PREFIX_STATIC)) return
            localStorage.removeItem(key)
        })
}
export default storage