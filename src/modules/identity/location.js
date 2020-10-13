import DataStorage from '../../utils/DataStorage'
import { randomHex } from '../../services/blockchain'
import { inputNames, requiredFields } from './LocationForm'
import { isObj, isStr, objClean, objContains } from '../../utils/utils'

const locations = new DataStorage('totem_locations', true)
export const rxLocations = locations.rxData // RxJS Subject (since caching is disabled)

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
export const getAll = () => {
	const all = locations.getAll()
	console.log({ all })
	return all
}

/**
 * @name	remove
 * @summary	remove location by ID
 * 
 * @param	{String|Array} ids one or more location ID(s)
 */
export const remove = ids => { locations.delete(ids) }

/**
 * @name    set
 * @summary add or update location
 *
 * @param   {Object} location See `inputNames` for a list of accepted properties
 * @param   {String} id (optional) if not supplied, will generate a new random hex string
 */
export const set = (location, id = randomHex()) => {
	if (!isStr(id) || !isObj(location)) return
	const existingItem = locations.get(id)
	const requiredKeys = Object.values(requiredFields)
	const validKeys = Object.values(inputNames)
	if (!existingItem && !objContains(location, requiredKeys)) return console.log({location, validKeys})

	// merge with existing item and get rid of any unwanted properties
	location = objClean({ ...existingItem, ...location }, validKeys)
	// save to localStorage
	locations.set(id, location)

	return location
}
