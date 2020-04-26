// Store and manage identities
import { Bond } from 'oo7'
import { generateMnemonic } from 'bip39'
import { secretStore } from 'oo7-substrate'
import uuid from 'uuid'
import DataStorage from '../utils/DataStorage'
import { keyring } from '../utils/polkadotHelper'
import { objClean } from '../utils/utils'
import storage from './storage'

// catch errors from secretstore
const _secretStore = () => {
    try {
        return secretStore()
    } catch (e) {
        return { _key: [] }
    }
}

const MODULE_KEY = 'identity'
const rw = value => storage.settings.module(MODULE_KEY, value) || {}
const identities = new DataStorage('totem_identities', true)
const REQUIRED_KEYS = Object.freeze(['address', 'name', 'type', 'uri'])
const VALID_KEYS = Object.freeze([
    ...REQUIRED_KEYS,
    'cloudBackupStatus', // undefined: never backed up, in-progress, done
    'cloudBackupTS', // most recent successful backup timestamp
    //???? 'fileBackupTS' // most recent file backup timestamp
    'tags',
    'usageType',
])

export const bond = identities.bond
export const selectedAddressBond = new Bond().defaultTo(uuid.v1())

export const addFromUri = uri => {
    try {
        return keyring.addFromUri(uri).toJson()
    } catch (_) { }
}

export const generateUri = generateMnemonic

export const get = address => identities.get(address)

// todo: migrate from array to map for consistency
export const getAll = () => Array.from(identities.getAll()).map(([_, x]) => x)

export const getSelected = () => identities.find({ selected: true }, true, true) || getAll()[0]

export const find = addressOrName => identities.find({ address: addressOrName, name: addressOrName }, true, false, true)

// Permanent remove identity from localStorage
export const remove = address => identities.delete(address)

// add/update
export const set = (address, identity = {}) => {
    // add to PolkadotJS keyring
    !identities.get(address) && keyring.add([identity.uri])
    const cIdentity = objClean({
        ...identities.get(address),
        ...identity
    }, VALID_KEYS)
    identities.set(address, cIdentity)
    return cIdentity
}

export const setSelected = address => {
    const identity = identities.get(address)
    if (!identity) return
    const selected = identities.search({ selected: true }, true, true)
    Array.from(selected).forEach(([addr, next]) => {
        next.selected = false
        identities.set(addr, next)
    })
    identity.selected = true
    identities.set(address, identity)
    selectedAddressBond.changed(uuid.v1())
}

setTimeout(() => {
    const ssIdentities = getAll()
    const ssKeys = _secretStore()._keys
    // add seeds to PolkadotJS keyring
    keyring.add(ssIdentities.map(x => x.uri))

    // migrate from secretStore
    if (rw().secretStoreDeprecated || ssKeys.length === 0) return
    console.log('Migrating secretStore identities')
    const arr = ssKeys.map(ssKey => {
        const { address } = ssKey
        return [
            address,
            {
                ...objClean(ssKey, REQUIRED_KEYS), // remove non-essential keys
                ...identities.find(address)
            }
        ]
    })
    identities.setAll(new Map(arr))
    rw({ secretStoreDeprecated: true })
}, 2000)

export default {
    addFromUri,
    bond,
    find,
    generateUri,
    get,
    getAll,
    getSelected,
    keyring,
    remove,
    selectedAddressBond,
    set,
    setSelected,
}