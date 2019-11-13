import { Bond } from 'oo7'
import uuid from 'uuid'
import DataStorage from '../utils/DataStorage'

const addressbook = new DataStorage('totem_addressbook', true)
const bond = new Bond()
const updateBond = () => setTimeout(() => bond.changed(uuid.v1()))
updateBond()

// Add/update partner
const set = (address, name, tags, type, visibility) => {
    name = name.trim()
    address = address.trim()
    if (!name || !address) return
    addressbook.set(address, { address, name, tags, type, visibility, isPublic: visibility === 'public' })
    updateBond()
}

// Set partner as public
const setPublic = address => {
    const partner = addressbook.get(address)
    if (!partner) return
    partner.isPublic = true
    partner.visibility = 'public'
    addressbook.set(address, { ...partner })
    updateBond()
}

export default {
    set,
    setPublic,
    getBond: () => bond,
    getAll: () => addressbook.getAll(),
    get: address => addressbook.get(address),
    getByName: name => addressbook.find({ name }, true, true, true),
    remove: address => addressbook.delete(address),
}