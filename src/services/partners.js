import { Bond } from 'oo7'
import uuid from 'uuid'
import DataStorage from '../utils/DataStorage'

const partners = new DataStorage('totem_partners', true)
const bond = new Bond()
const updateBond = () => setTimeout(() => bond.changed(uuid.v1()))
updateBond()

// Add/update partner
const set = (address, name, tags, type, userId, visibility, associatedIdentity) => {
    name = name.trim()
    address = address.trim()
    if (!name || !address) return
    partners.set(address, {
        address, name, tags, type, userId, visibility, associatedIdentity, isPublic: visibility === 'public'
    })
    updateBond()
}

// Set partner as public
const setPublic = address => {
    const partner = partners.get(address)
    if (!partner) return
    partner.isPublic = true
    partner.visibility = 'public'
    partners.set(address, { ...partner })
    updateBond()
}

export default {
    set,
    setPublic,
    getBond: () => bond,
    getAll: () => partners.getAll(),
    get: address => partners.get(address),
    getByName: name => partners.find({ name }, true, true, true),
    remove: address => partners.delete(address) | updateBond(),
}