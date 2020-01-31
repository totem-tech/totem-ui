import { Bond } from 'oo7'
import uuid from 'uuid'
import { textEllipsis } from '../utils/utils'
import DataStorage from '../utils/DataStorage'
import identities from './identity'

const partners = new DataStorage('totem_partners', true)
const bond = new Bond()
const updateBond = () => setTimeout(() => bond.changed(uuid.v1()))
updateBond()

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
export const getByName = name => partners.find({ name }, true, true, true)
export const remove = address => partners.delete(address) | updateBond()
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
    updateBond()
}

// Set partner as public
export const setPublic = address => {
    const partner = partners.get(address)
    if (!partner) return
    partner.isPublic = true
    partner.visibility = 'public'
    partners.set(address, { ...partner })
    updateBond()
}

export default {
    bond,
    getAddressName,
    getAll,
    get,
    getByName,
    set,
    setPublic,
    remove,
}