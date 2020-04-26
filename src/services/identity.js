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
const DEFAULT_NAME = 'Default'
const rw = value => storage.settings.module(MODULE_KEY, value) || {}
const identities = new DataStorage('totem_identities', true)
const USAGE_TYPES = Object.freeze({
    PERSONAL: 'personal',
    BUSINESS: 'business',
})
const REQUIRED_KEYS = Object.freeze([
    'address',
    'name',
    'type',
    'uri',
])
const VALID_KEYS = Object.freeze([
    ...REQUIRED_KEYS,
    'cloudBackupStatus', // undefined: never backed up, in-progress, done
    'cloudBackupTS', // most recent successful backup timestamp
    'fileBackupTS', // most recent file backup timestamp
    'tags',
    'usageType',
])

export const bond = identities.bond
export const selectedAddressBond = new Bond().defaultTo(uuid.v1())

export const addFromUri = (uri, type = 'sr25519') => {
    try {
        return keyring.keyring.addFromUri(uri, null, type).toJson()
    } catch (err) {
        console.log('services.identity.addFromUri()', err)
    }
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
    const { type, usageType } = identity
    // add to PolkadotJS keyring
    !identities.get(address) && keyring.add([identity.uri])
    identity.type = type || 'sr25519'
    if (!Object.keys(USAGE_TYPES).includes(usageType)) identity.usageType = USAGE_TYPES.PERSONAL
    identity = objClean({
        ...identities.get(address), //  merge with existing values
        ...identity
    }, VALID_KEYS)
    identities.set(address, identity)
    return identity
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
const deprecateSecretStore = (ssKeys) => {
    console.log('Identity service: Migrating secretStore identities')
    const arr = ssKeys.map(ssKey => {
        const { address } = ssKey
        return [
            address,
            objClean(
                { ...ssKey, ...identities.find(address) },
                REQUIRED_KEYS
            ),
        ]
    })
    identities.setAll(new Map(arr))
}
const init = () => {
    const ssKeys = _secretStore()._keys
    let identities = getAll()
    const hasMissingProps = identities.filter(x => !x.name || !x.uri).length > 0
    const shouldInit = !hasMissingProps && identities.length === 0 && ssKeys.length <= 1

    if (shouldInit) {
        console.log('Identity service: Creating default identity for first time user')
        const uri = generateUri() + '/totem/0/0'
        const { address } = addFromUri(uri)
        const identity = {
            address,
            name: DEFAULT_NAME,
            usageType: USAGE_TYPES.PERSONAL,
            uri,
        }
        set(address, identity)
    } else if (!rw().secretStoreDeprecated) deprecateSecretStore(ssKeys)

    rw({ secretStoreDeprecated: true })

    // add seeds to PolkadotJS keyring
    keyring.add(getAll().map(x => x.uri))
}
setTimeout(init, 2000)

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