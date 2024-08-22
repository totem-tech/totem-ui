import uuid from 'uuid'
import DataStorage from '../../utils/DataStorage'
import { optionalFields, requiredFields } from './ShareTypeForm'
import { generateHash, isObj, isStr, objClean, objHasKeys } from '../../utils/utils'
// import { TYPES } from '../../utils/validator'

const shares = new DataStorage('totem_shares', true)
export const rxShares = shares.rxData // RxJS Subject (because caching is disabled)
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
 * @summary find shares
 * @param	{...any} args see `DataStorage.find` for details
 * 
 * @returns	{*}
 */
export const find = (...args) => shares.find(...args)

/**
 * @name    get
 * @summary get share by ID
 *
 * @param   {String} id share ID
 *
 * @returns {Object}
 */
export const get = id => shares.get(id)

/**
 * @name	newId
 * @summary	generate new share ID 
 * 
 * @param	{*} seed
 * 
 * @returns {String}
 */
export const newId = seed => generateHash(seed || uuid.v1(), 'blake2', 256)

/**
 * @name    getAll
 * @summary get all shares
 *
 * @returns {Map}
 */
export const getAll = () => shares.getAll()

/**
 * @name	remove
 * @summary	remove share by ID
 * 
 * @param	{String|Array} ids one or more share ID(s)
 */
export const remove = ids => { shares.delete(ids) }

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
 * @summary search shares
 * 
 * @param   {Object}    keyValues
 * @param	{...any}	args		see `DataStorage.find` for details
 * 
 * @returns	{*}
 */
export const search = (keyValues, ...args) => shares.search(keyValues, ...args)

/**
 * @name    set
 * @summary add or update share type
 * @description a share type is associated with a single identity. It cannot be associated with a partner.
 *
 * @param   {Object} share	See `allKeys` for a list of accepted properties
 * @param   {String} id			(optional) Default: randomly generate unique hex string
 * @param	{String} replace	(optional) whether to replace existing values instead of merging when updating.
 * 								Default: false
 * 
 * @returns	{String|null}		null if save failed
 */
export const set = (share, id = newId(), replace = false) => {
	if (!isStr(id) || !isObj(share)) return null

	const existingItem = shares.get(id)
	// merge with existing item and get rid of any unwanted properties
	share = objClean({ ...(replace ? {} : existingItem), ...share }, validKeys)
	const hasRequiredKeys = objHasKeys(share, requiredKeys, true)

	// new item must have all the required keys
	if (!existingItem && !hasRequiredKeys) return null

	// save to localStorage
	shares.set(id, share)
	return id
}

export default {
	find,
	get,
	getAll,
	remove,
	removeByPartnerIdentity,
	rxShares,
	search,
	set,
	validKeys,
}