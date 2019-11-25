import { Bond } from 'oo7'
import uuid from 'uuid'
import DataStorage from '../utils/DataStorage'

const partners = new DataStorage('totem_partners', true)
const bond = new Bond()
const updateBond = () => setTimeout(() => bond.changed(uuid.v1()))
updateBond()

export const get = address => partners.get(address)
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
    set,
    setPublic,
    getAll,
    get,
    getByName,
    remove,
}