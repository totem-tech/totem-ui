// Store and manage identities
import { Bond } from 'oo7'
import { secretStore } from 'oo7-substrate'
import DataStorage from '../utils/DataStorage'
import uuid from 'uuid'
import { objClean } from '../utils/utils'

// catch errors from secretstore
const _secretStore = () => {
    try {
        return secretStore()
    } catch (e) {
        return {
            //
            accountFromPhrase: () => { },
            find: () => { },
            forget: () => { },
            submit: () => { },
            _key: [],
        }
    }
}
const _ssFind = address => _secretStore().find(address)
const _ssSubmit = (seed, name) => _secretStore().submit(seed, name)
const _ssKeys = () => _secretStore()._keys || []
const _ssSync = () => _secretStore()._sync()
const _ssForget = address => _secretStore().forget(address)

const identities = new DataStorage('totem_identities', true)
const VALID_KEYS = [
    'cloudBackupStatus', // undefined: never backed up, in-progress, done
    'cloudBackupTS', // most recent successful backup timestamp
    //???? 'fileBackupTS' // most recent file backup timestamp
    'tags',
    'usageType',
]

export const bond = identities.bond
export const selectedAddressBond = new Bond().defaultTo(uuid.v1())

export const accountFromPhrase = seed => _secretStore().accountFromPhrase(seed)

export const get = address => {
    const identity = _ssFind(address)
    return !identity ? null : {
        ...identity,
        ...identities.get(address)
    }
}

// returns array
export const getAll = () => _ssKeys().map(identity => ({
    ...identity,
    // add extra information
    ...identities.get(identity.address)
}))

export const getSelected = () => {
    const result = identities.search({ selected: true }, true, true)
    let [address] = result.size > 0 && Array.from(result)[0] || []
    if (!address) {
        const ssIdentities = _ssKeys()
        // attempt to prevent error when secretStore is unexpectedly not yet ready!!
        if (!ssIdentities || ssIdentities.length === 0) return {}
        address = ssIdentities[0].address
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
}

// add/update
export const set = (address, identity = {}) => {
    const { name, uri: seed } = identity
    let create = false
    let existing = _ssFind(address)
    if (!existing) {
        setSelected
        const account = accountFromPhrase(seed)
        if (!account || !name) return
        create = true
        // create new identity
        _ssSubmit(seed, name)
        existing = _ssFind(name)
        address = existing.address
    }
    identities.set(address, {
        ...identities.get(address),
        // get rid of any unaccepted keys
        ...objClean(identity, VALID_KEYS),
    })

    // update name in secretStore
    if (!create && !!name && name !== existing.name) {
        existing.name = name
        _ssSync()
    }
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
}

export default {
    accountFromPhrase,
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