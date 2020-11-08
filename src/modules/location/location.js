import DataStorage from '../../utils/DataStorage'
import { randomHex } from '../../services/blockchain'
import { optionalFields, requiredFields } from './LocationForm'
import { isObj, isStr, objClean, objHasKeys } from '../../utils/utils'

const locations = new DataStorage('totem_locations', true)
export const rxLocations = locations.rxData // RxJS Subject (because caching is disabled)
export const validKeys = Object.freeze([
	...Object.values(requiredFields),
	...Object.values(optionalFields),
	'isCrowdsale',
])

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
 * @name	search
 * @summary search locations
 * @param	{...any} args see `DataStorage.find` for details
 * 
 * @returns	{*}
 */
export const search = (...args) => locations.search(...args)

/**
 * @name    set
 * @summary add or update location
 *
 * @param   {Object} location	See `allKeys` for a list of accepted properties
 * @param   {String} id			(optional) Default: randomly generate unique hex string
 * @param	{String} replace	(optional) whether to replace existing values instead of merging when updating.
 * 								Default: false
 * 
 * @returns	{String|null}		null if save failed
 */
export const set = (location, id = randomHex(), replace = false) => {
	if (!isStr(id) || !isObj(location)) return null
	const existingItem = locations.get(id)
	const requiredKeys = Object.values(requiredFields)
	// merge with existing item and get rid of any unwanted properties
	location = objClean({ ...(replace ? {} : existingItem), ...location }, validKeys)
	const hasRequiredKeys = objHasKeys(location, requiredKeys, true)
	// new item must have all the required keys
	if (!existingItem && !hasRequiredKeys) return null

	// save to localStorage
	locations.set(id, location)

	return id
}