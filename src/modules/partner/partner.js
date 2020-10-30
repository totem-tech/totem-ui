import DataStorage from '../../utils/DataStorage'
import { textEllipsis, arrUnique, objHasKeys, isAddress, objClean } from '../../utils/utils'
import identities from '../identity/identity'
import { remove as removeLocation } from '../location/location'
import { inputNames as allFields, requiredFields } from './PartnerForm'

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

export const get = address => partners.get(address)

// returns name of an address if available in identity or partner lists.
// Otherwise, returns shortened address
export const getAddressName = address => (identities.find(address) || {}).name
    // not found in wallet list
    // search in addressbook
    || (get(address) || {}).name
    // not available in addressbok or wallet list
    // display the address itself with ellipsis
    || textEllipsis(address, 15, 5)
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
export const getByUserId = id => (Array.from(partners.getAll()).find(([_, { userId }]) => userId === id) || [])[1]

export const remove = address => {
    const { name, locationId } = partners.get(address) || {}
    name && partners.delete(address)
    locationId && removeLocation(locationId)
}

// Add/update partner
// export const set = (address, name, tags, type, userId, visibility, associatedIdentity) => {
//     name = name.trim()
//     address = address.trim()
//     tags = tags || []
//     type = type || 'personal'
//     if (!name || !address) return
//     partners.set(address, {
//         address,
//         name,
//         tags,
//         type,
//         userId,
//         visibility,
//         associatedIdentity,
//         isPublic: visibility === 'public',
//     })
// }
/**
 * @name    set
 * @summary add or update partner
 * 
 * @param   {String}      values.address              partner address/identity. Also used as key/ID.
 * @param   {String}      values.name                 partner name
 * @param   {String}      values.type                 partner type: public or personal
 * @param   {String}      values.visibility           whether partner is public or private
 * @param   {String}      values.associatedIdentity   (optional) own identity/address
 * @param   {locationId}  values.locationId           (optional) partner location ID
 * @param   {Array}       values.tags                 (optional)
 * @param   {String}      values.userId               (optional) partner user ID
 * 
 * @returns {Boolean} indicates save success or failure
 */
export const set = values => {
    const { address, name, tags, type } = values
    values.name = name.trim()
    values.address = address.trim()
    values.tags = tags || []
    values.type = Object.values(types).includes(type) ? type : types.PERSONAL
    if (!objHasKeys(values, Object.values(requiredFields), true)) return false
    if (!isAddress(values.address)) return false
    // get rid of any unwanted properties
    values = objClean(values, Object.values(allFields))
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
    set,
    setPublic,
}