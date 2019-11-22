// Store and manage identities
import { Bond } from 'oo7'
import { secretStore } from 'oo7-substrate'
import DataStorage from '../utils/DataStorage'
import uuid from 'uuid'
import { objClean } from '../utils/utils'

const _ssFind = address => secretStore().find(address)
const _ssSubmit = (seed, name) => secretStore().submit(seed, name)
const _ssKeys = () => secretStore()._keys
const _ssSync = () => secretStore()._sync()
const _ssForget = address => secretStore().forget(address)

const identities = new DataStorage('totem_identities')
const updateBond = () => bond.changed(uuid.v1())
const VALID_KEYS = [
    'address',
    'cloudBackupStatus', // undefined: never backed up, in-progress, done
    'cloudBackupTS', // most recent successful backup timestamp
    //???? 'fileBackupTS' // most recent file backup timestamp
    // 
    // 'seed',
    'name',
    'tags',
    'usageType',
]

export const bond = new Bond().defaultTo(uuid.v1())
export const selectedAddressBond = new Bond().defaultTo(uuid.v1())

export const accountFromPhrase = seed => secretStore().accountFromPhrase(seed)

export const get = address => {
    const identity = _ssFind(address)
    return !identity ? null : {
        ...identity,
        ...identities.get(address)
    }
}

export const getAll = () => _ssKeys().map(identity => ({
    ...identity,
    // add extra information
    ...identities.get(identity.address)
}))

export const getSelected = () => {
    const result = identities.search({ selected: true }, true, true)
    let [address] = Array.from(result)[0] || []
    if (!address) {
        address = _ssKeys()[0].address
    }
    return find(address)
}

export const find = addressOrName => {
    const found = _ssFind(addressOrName)
    if (!found) return
    return {
        ...found,
        ...identities.get(found.address),
    }
}

// Delete wallet permanently
export const remove = address => {
    _ssForget(address)
    identities.delete(address)
    updateBond()
}

// add/update
export const set = (address, identity = {}) => {
    const { name, uri: seed } = identity
    let existing = _ssFind(address)
    if (!existing) {
        if (!seed || !name) return
        // create new identity
        _ssSubmit(seed, name)
        existing = _ssFind(name)
        address = existing.address
    }
    identities.set(address, {
        ...identities.get(address),
        // get rid of any unaccepted keys
        ...objClean(identity, VALID_KEYS)
    })

    // update name in secretStore
    if (!seed && name && name !== existing.name) {
        existing.name = name
        _ssSync()
    }
    updateBond()
}

export const setSelected = address => {
    if (!_ssFind(address)) return
    const identity = identities.get(address) || {}
    const selected = identities.search({ selected: true }, true, true)
    Array.from(selected).forEach(([addr, next]) => {
        next.selected = false
        identities.set(addr, next)
    })
    identity.selected = true
    identities.set(address, identity)
    selectedAddressBond.changed(uuid.v1())
    updateBond()
}

export default {
    bond,
    find,
    get,
    getAll,
    getSelected,
    remove,
    selectedAddressBond,
    set,
    setSelected,
}