/*
 * Storage Service: to handle all interactions with browser's localStorage.
 * Typically this should be used by other services
 */
import { hasValue, isMap, isObj } from '../utils/utils'
import DataStorage from '../utils/DataStorage'

// Local Storage item key prefix for all items
const PREFIX = 'totem_'
const PREFIX_STATIC = 'totem_static_'
const CACHE_KEY = PREFIX + 'cache'
const storage = {}
const cache = new DataStorage(CACHE_KEY)
const settings = new DataStorage(PREFIX + 'settings', true)
// LocalStorage items that are essential for the applicaiton to run. 
export const essentialKeys = [
    'totem_history',
    'totem_identities',
    // notifications are essential because user may need to respond to them in case they are migrating to a new device.
    'totem_notifications',
    'totem_partners',
    'secretStore', // ToDo: deprecate by migrating completely to identities
    'totem_settings',
]

// Read/write to storage
//
// @storage DataStorege instance:
// @key     string: module/item key
// @propKey string: name of the property to read/write to. If not supplied, will return value for @key
// @value   any: use `null` to remove the @propKey from storage. If not specified, will return value for @propKey
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

storage.countries = new DataStorage(PREFIX_STATIC + 'countries', true)

storage.settings = {
    // global settings
    // 
    // Params: 
    // @itemKey string: unique identifier for target module or item (if not part of any module)
    // @value   object: (optional) settings/value to replace existing.
    global: (itemKey, value) => rw(settings, 'global_settings', itemKey, value),

    // store and retrieve module specific settings
    // 
    // Params: 
    // @moduleKey     string: unique identifier for target module
    // @value   object: (optional) settings/value to replace existing.
    module: (moduleKey, value) => rw(settings, 'module_settings', moduleKey, value)
}
storage.cache = (moduleKey, itemKey, value) => rw(cache, moduleKey, itemKey, value)

// removes cache and static data
// Caution: can remove 
storage.clearNonEssentialData = () => {
    const keys = [
        CACHE_KEY,
        //deprecated
        'totem_service_notifications',
        'totem_translations',
        'totem_sidebar-items-status',
    ]
    const partialKeys = [
        '_static_',
        '_cache_',
    ]
    const shouldRemove = key => !essentialKeys.includes(key) && ( // makes sure essential keys are not removed
        keys.includes(key) ||
        partialKeys.reduce((remove, pKey) => remove || key.includes(pKey), false)
    )

    Object.keys(localStorage).forEach(key => shouldRemove(key) && localStorage.removeItem(key))
}

export default storage