import { BehaviorSubject } from 'rxjs'
import { generateMnemonic } from 'bip39'
import DataStorage from '../../utils/DataStorage'
import { keyring } from '../../utils/polkadotHelper'
import { isObj, isStr, objClean, objHasKeys } from '../../utils/utils'

const identities = new DataStorage('totem_identities')
export const DEFAULT_NAME = 'Default' // default identity name
export const rxIdentities = identities.rxData
export const rxSelected = new BehaviorSubject()
export const USAGE_TYPES = Object.freeze({
	PERSONAL: 'personal',
	BUSINESS: 'business',
})
export const REQUIRED_KEYS = Object.freeze([
	'address',
	'name',
	'uri',
])
export const VALID_KEYS = Object.freeze([
	...REQUIRED_KEYS,
	'cloudBackupStatus', // undefined: never backed up, in-progress, done
	'cloudBackupTS', // most recent successful backup timestamp
	'contactId',
	'fileBackupTS', // most recent file backup timestamp
	'locationId',
	'registeredNumber',
	'vatNumber',
	'selected',
	'tags',
	'type',
	'usageType',
])

export const addFromUri = (uri, type = 'sr25519') => {
	try {
		return keyring.keyring.addFromUri(uri, null, type).toJson()
	} catch (err) {
		// error will occur if wasm-crypto is not initialised or invalid URI passed
		// console.log('services.identity.addFromUri()', err)
	}
}

export const generateUri = generateMnemonic

export const get = address => identities.get(address)

export const getAll = () => identities.map(([_, x]) => ({ ...x }))

/**
 * @name    getSelected
 * @summary getSelected identity
 *
 * @returns {Object}
 */
export const getSelected = () => identities.find({ selected: true }, true, true) || getAll()[0]

export const find = addressOrName => identities.find({ address: addressOrName, name: addressOrName }, true, false, true)

/**
 * @name    remove
 * @summary Permanent remove identity from localStorage
 *
 * @param   {String} address
 */
export const remove = address => { identities.delete(address) }

/**
 * @name	search
 * @summary search identities
 * 
 * @param	{Object}	values
 * @param	{...any}	args	See DataStorage.search
 * 
 * @returns {Map}
 */
export const search = (values = {}, ...args) => identities.search(values, ...args)

/**
 * @name    set
 * @summary add or update identity
 *
 * @param   {String} address
 * @param   {Object} identity In case of update, will be merged with existing values.
 *                            See `VALID_KEYS` for a list of accepted properties
 *
 * @returns {Object} returns the identity added/updated
 */
export const set = (address, identity) => {
	if (!isStr(address) || !isObj(identity)) return

	const existingItem = identities.get(address)
	if (!existingItem && !objHasKeys(identity, REQUIRED_KEYS, true)) return

	const { selected, type, usageType } = identity
	const isUsageTypeValid = Object.values(USAGE_TYPES).includes(usageType)
	identity.type = type || 'sr25519'
	identity.selected = !!selected
	identity.usageType = !isUsageTypeValid ? USAGE_TYPES.PERSONAL : usageType
	//  merge with existing values and get rid of any unwanted properties
	identity = objClean({ ...existingItem, ...identity }, VALID_KEYS)
	identities.set(address, identity)

	return identity
}

/**
 * @name    setSelected
 * @summary set selected identity
 *
 * @param {String} address identity/wallet address
 */
export const setSelected = address => {
	const identity = identities.get(address)
	if (!identity) return
	const selected = identities.search({ selected: true }, true, true)
	// unset previously selected
	Array.from(selected).forEach(([addr, next]) => {
		next.selected = false
		identities.set(addr, next)
	})
	identity.selected = true
	identities.set(address, identity)
	rxSelected.next(address)
}

const init = () => {
	const all = getAll()
	if (!all.length) {
		// generate a new seed
		const uri = generateUri() + '/totem/0/0'
		const { address } = addFromUri(uri) || {}
		// in case `wasm-crypto` hasn't been initiated yet, try again after a second
		if (!address) return setTimeout(init, 1000)
		// console.log('Identity service: creating default identity for first time user')

		const identity = {
			address,
			name: DEFAULT_NAME,
			usageType: USAGE_TYPES.PERSONAL,
			uri,
		}
		set(address, identity)
	} else {
		// remove extension identities
		all.forEach(({ address, uri }) => !uri && identities.delete(address))
	}

	rxSelected.next(getSelected().address)
}
setTimeout(init)

export default {
	addFromUri,
	find,
	generateUri,
	get,
	getAll,
	getSelected,
	remove,
	REQUIRED_KEYS,
	rxIdentities,
	rxSelected,
	search,
	set,
	setSelected,
	USAGE_TYPES,
	VALID_KEYS,
}
