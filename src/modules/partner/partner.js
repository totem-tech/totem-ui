import DataStorage from '../../utils/DataStorage'
import { textEllipsis, arrUnique, objHasKeys, isAddress, objClean } from '../../utils/utils'
import contacts from '../contact/contact'
import identities from '../identity/identity'
import locations from '../location/location'

const partners = new DataStorage('totem_partners')
export const rxPartners = partners.rxData
export const types = Object.freeze({
    BUSINESS: 'business',
    PERSONAL: 'personal',
})
export const visibilityTypes = {
    PRIVATE: 'private',
    PUBLIC: 'public',
}

export const requiredKeys = [
    'address',
    'name',
    'type',
    'visibility',
]
export const validKeys = [
    ...requiredKeys,
    'associatedIdentity',
    'locationFormHtml',
    'locationGroup',
    'registeredNumber',
    'tags',
    'userId',
    'vatNumber',
]

export const find = addressOrName => partners.find({ address: addressOrName, name: addressOrName }, true, false, true)

export const get = address => partners.get(address)

// returns name of an address if available in identity or partner lists.
// Otherwise, returns shortened address
export const getAddressName = (address, shortenAddress = true, useAlternative = true) => {
    const entry = identities.get(address) || get(address) || {}
    return entry.name
        || useAlternative
        && (
            shortenAddress
                ? textEllipsis(address, 15, 5)
                : address
        )
        || ''
}

export const getAll = () => partners.getAll()

// returns an array of unique tags used in partner and identity modules
export const getAllTags = () => {
    const iTags = identities.getAll()
        .map(x => x.tags)
        .filter(tags => tags && tags.length > 0)
        .flat()
    const pTags = Array.from(getAll())
        .map(([_, p]) => p.tags)
        .filter(tags => tags && tags.length > 0)
        .flat()
    return arrUnique([...iTags, ...pTags]).sort()
}
export const getByName = name => partners.find({ name }, true, true, true)

// returns first matching partner with userId
export const getByUserId = userId => partners.find({ userId }, true, true, false)

/**
 * @name    remove
 * @summary remove partner
 * 
 * @param   {String} address partner identity/key
 */
export const remove = address => {
    contacts.removeByPartnerIdentity(address)
    locations.removeByPartnerIdentity(address)
    partners.delete(address)
}

/**
 * @name	search
 * @summary search partners
 * 
 * @param	{Object}	values
 * @param	{...any}	args	See DataStorage.search
 * 
 * @returns {Map}
 */
export const search = (values = {}, ...args) => partners.search(values, ...args)

/**
 * @name    set
 * @summary add or update partner
 * 
 * @param   {String}      values.address              partner address/identity. Also used as key/ID.
 * @param   {String}      values.associatedIdentity   (optional) own identity/address
 * @param   {locationId}  values.locationId           (optional) partner location ID
 * @param   {String}      values.name                 partner name
 * @param   {String}      values.registeredNumber     (optional) company registration number
 * @param   {Array}       values.tags                 (optional)
 * @param   {String}      values.type                 partner type: public or personal
 * @param   {String}      values.userId               (optional) partner user ID
 * @param   {String}      values.vatNumber            (optional) VAT registration number
 * @param   {String}      values.visibility           whether partner is public or private
 * 
 * @returns {Boolean} indicates save success or failure
 */
export const set = values => {
    const { address, name, tags, type } = values
    values.name = name.trim()
    values.address = address.trim()
    values.tags = tags || []
    values.type = Object.values(types).includes(type) ? type : types.PERSONAL
    if (!objHasKeys(values, requiredKeys, true)) return false
    if (!isAddress(values.address)) return false
    // get rid of any unwanted properties
    values = objClean(values, validKeys)
    partners.set(address, values)

    return true
}

/**
 * @name    setPublic
 * @summary set partner visibility
 * 
 * @param {String} address 
 * @param {String} visibility 
 */
// Set partner as public
export const setPublic = (address, visibility) => {
    const partner = partners.get(address)
    visibility = Object.values(visibilityTypes).includes(visibility) ? visibility : visibilityTypes.PUBLIC
    partner && partners.set(address, { ...partner, visibility })
}

export default {
    getAddressName,
    getAll,
    get,
    getByName,
    getByUserId,
    remove,
    rxPartners,
    search,
    set,
    setPublic,
}