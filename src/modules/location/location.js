import uuid from 'uuid'
import DataStorage from '../../utils/DataStorage'
import { optionalFields, requiredFields } from './LocationForm'
import { generateHash, isObj, isStr, objClean, objHasKeys } from '../../utils/utils'
import { TYPES } from '../../utils/validator'

const locations = new DataStorage('totem_locations', true)
export const rxLocations = locations.rxData // RxJS Subject (because caching is disabled)
export const requiredKeys = Object.freeze(Object.values(requiredFields))
export const validKeys = Object.freeze([
	...requiredKeys,
	...Object.values(optionalFields),
	'fileBackupTS',
])

// ToDo: add validation conf
// const validationConf = {
// 	fileBackupTS: {
// 		maxLength: 24, // "2001-01-001T01:01:01.123Z"
// 		minLength: 16, // "2001-01-001T01:01"
// 		type: TYPES.string,
// 	},
// }

/**
 * @name	find
 * @summary find locations
 * @param	{...any} args see `DataStorage.find` for details
 * 
 * @returns	{*}
 */
export const find = (...args) => locations.find(...args)

/**
 * @name    get
 * @summary get location by ID
 *
 * @param   {String} id location ID
 *
 * @returns {Object}
 */
export const get = id => locations.get(id)

/**
 * @name	newId
 * @summary	generate new location ID 
 * 
 * @param	{*} seed
 * 
 * @returns {String}
 */
export const newId = seed => generateHash(seed || uuid.v1(), 'blake2', 256)

/**
 * @name    getAll
 * @summary get all locations
 *
 * @returns {Map}
 */
export const getAll = () => locations.getAll()

/**
 * @name	remove
 * @summary	remove location by ID
 * 
 * @param	{String|Array} ids one or more location ID(s)
 */
export const remove = ids => { locations.delete(ids) }

/**
 * @name    removeByPartnerIdentity
 * 
 * @param   {String}    partnerIdentity 
 */
export const removeByPartnerIdentity = partnerIdentity => {
	const map = search({ partnerIdentity })
	Array
		.from(map)
		.forEach(([id]) => remove(id))
}

/**
 * @name	search
 * @summary search locations
 * 
 * @param   {Object}    keyValues
 * @param	{...any}	args		see `DataStorage.find` for details
 * 
 * @returns	{*}
 */
export const search = (keyValues, ...args) => locations.search(keyValues, ...args)

/**
 * @name    set
 * @summary add or update location
 * @description a location is either associated with a single partner or 0+ identities.
 * If a location is associated with a partner it cannot be associated with any identity.
 *
 * @param   {Object} location	See `allKeys` for a list of accepted properties
 * @param   {String} id			(optional) Default: randomly generate unique hex string
 * @param	{String} replace	(optional) whether to replace existing values instead of merging when updating.
 * 								Default: false
 * 
 * @returns	{String|null}		null if save failed
 */
export const set = (location, id = newId(), replace = false) => {
	if (!isStr(id) || !isObj(location)) return null

	const existingItem = locations.get(id)
	// merge with existing item and get rid of any unwanted properties
	location = objClean({ ...(replace ? {} : existingItem), ...location }, validKeys)
	const hasRequiredKeys = objHasKeys(location, requiredKeys, true)

	// new item must have all the required keys
	if (!existingItem && !hasRequiredKeys) return null

	// save to localStorage
	locations.set(id, location)
	return id
}

export default {
	find,
	get,
	getAll,
	remove,
	removeByPartnerIdentity,
	rxLocations,
	search,
	set,
	validKeys,
}