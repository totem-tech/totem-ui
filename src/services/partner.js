import { textEllipsis, arrUnique } from '../utils/utils'
import DataStorage from '../utils/DataStorage'
import identities from './identity'

const partners = new DataStorage('totem_partners')
export const rxPartners = partners.rxData

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
export const remove = address => partners.delete(address)
// Add/update partner
export const set = (address, name, tags, type, userId, visibility, associatedIdentity) => {
    name = name.trim()
    address = address.trim()
    tags = tags || []
    type = type || 'personal'
    if (!name || !address) return
    partners.set(address, {
        address, name, tags, type, userId, visibility, associatedIdentity, isPublic: visibility === 'public'
    })
}

// Set partner as public
export const setPublic = address => {
    const partner = partners.get(address)
    if (!partner) return
    partner.isPublic = true
    partner.visibility = 'public'
    partners.set(address, { ...partner })
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