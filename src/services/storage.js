/*
 * Storage Service: to handle all interactions with browser's localStorage.
 * Typically this should be used by other services
 */
import { downloadFile, generateHash, hasValue, isMap, isObj, isSet, isStr, objClean } from '../utils/utils'
import DataStorage from '../utils/DataStorage'
// import FormBuilder from '../components/FormBuilder'
import { getAll as getIdentities, set as saveIdentity} from '../modules/identity/identity'
import { translated } from './language'

// Local Storage item key prefix for all items
const PREFIX = 'totem_'
const PREFIX_STATIC = PREFIX + 'static_'
const CACHE_KEY = PREFIX + 'cache'
const storage = {}
const cache = new DataStorage(CACHE_KEY, true)
const settings = new DataStorage(PREFIX + 'settings', true) // keep cache disabled

// LocalStorage items that are essential for the applicaiton to run. 
export const essentialKeys = [
    'totem_chat-history', // chat history
    'totem_history', // user activity history
    'totem_identities',
    'totem_locations',
    // notifications are essential because user may need to respond to them in case they are migrating to a new device.
    'totem_notifications',
    'totem_partners',
    'totem_settings',
]

/**
 * @name    downloadBackup
 * @summary download backup of application data
 * 
 * @param   {String}    backup (optional) will be generated if not supplied
 * 
 * @returns {Array}     [backupContent: string, timestamp: string]
 */
export const downloadBackup = () => {
    const fileBackupTS = new Date().toISOString()
    const content = JSON.stringify(generateBackupData(fileBackupTS))
    downloadFile(
        content,
        `totem-backup-${fileBackupTS}.json`,
        'application/json'
    )
    return [content, fileBackupTS]
}

/**
 * @name    generateBackupData
 * @summary generate a replica of the localStorage contents only includes the properties specified in `essentialKeys`
 * @param   {String}    fileBackupTS (optional) if supplied downloaded identities will be updated
 */
// generates user data for backup, excluding non-essential items such as cache etc...
export const generateBackupData = (fileBackupTS) => {
    const data =  objClean(localStorage, essentialKeys)
    const keys = Object.keys(data)
    keys.forEach(key => {
        // parse JSON string
        data[key] = JSON.parse(data[key])
        if (!fileBackupTS || key !== 'totem_identities') return
        // update backup timestamp
        data[key]
            .forEach(([_, identity]) =>
            identity.fileBackupTS = fileBackupTS
        )
    })
    return data
}

/**
 * @name    rw
 * @summary Read/write to storage
 * 
 * @param   {DataStorage} storage 
 * @param   {String}      key       module/item key
 * @param   {String|null} propKey   name of the property to read/write to.
 *                                  If null, will remove all data stored for the @key
 *                                  If not supplied, will return value for the @key
 * @param   {*}           value       If not specified, will return value for @propKey
 *                                  If null, will remove value for @propKey
 *                                  If Map or Set supplied, will be converted to array using `Array.from`.
 *                                  If Object supplied, will merge with existing values.
 * @param   {Boolean}     override  If @value is an Object, whether to override or merge with existing value. 
 *                                  Default: false
 * 
 * @returns {*} 
 */
export const rw = (storage, key, propKey, value, override = false) => {
    if (!storage || !key) return {}
    const data = storage.get(key) || {}
    if (!isStr(propKey) && propKey !== null) return data
    
    if (propKey === null) {
        data.delete(key)
    } else if (value === null) {
        // remove from storage
        delete data[propKey]
    } else if (isMap(value) || isSet(value)) {
        // convert map to array. PS: may need to convert back to Map on retrieval
        data[propKey] = Array.from(value)
    } else if (isObj(value)) {
        // merge with existing value
        data[propKey] = override
            ? value
            : { ...data[propKey], ...value }
    } else if (hasValue(value)) {
        data[propKey] = value
    } else {
        // nothing to save | read-only operation
        return data[propKey]
    }
    storage.set(key, data)
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

    /**
     * @name    storage.settings.module
     * @summary read/write module related settings to localStorage
     * 
     * @param   {String}    moduleKey   a unique identifier for the module
     * @param   {*}         value
     * @param   {Boolean}   override    if @value is an Object, whether to override or merge with existing value.
     *                                  Default: false
     * 
     * @returns {*} returns the saved value
     */
    module: (moduleKey, value, override = false) => rw(settings, 'module_settings', moduleKey, value, override)
}

/**
 * @name    storage.cache
 * @summary read/write to module cache storage
 * 
 * @param   {String}        moduleKey 
 * @param   {String|null}   itemKey 
 * @param   {*|null}        value 
 * 
 * @returns {*}
 */
storage.cache = (moduleKey, itemKey, value) => rw(cache, moduleKey, itemKey, value)

/**
 * @name    storage.cacheDelete
 * @summary remove all cached data for a module
 * 
 * @param   {String} moduleKey 
 */
storage.cacheDelete = moduleKey => rw(cache, moduleKey, null)

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