import React, { useState, useEffect } from 'react'
import { Subject } from 'rxjs'
import { generateMnemonic } from 'bip39'
import DataStorage from '../utils/DataStorage'
import { keyring } from '../utils/polkadotHelper'
import { objClean } from '../utils/utils'

const DEFAULT_NAME = 'Default'
const identities = new DataStorage('totem_identities', true)
export const rxIdentities = identities.rxData
export const rxSelected = new Subject()
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
    'selected',
    'tags',
    'usageType',
])

export const addFromUri = (uri, type = 'sr25519') => {
    try {
        return keyring.keyring.addFromUri(uri, null, type).toJson()
    } catch (err) {
        // error will occur if wasm-crypto is not initialised or invalid URI passed
        // console.log('services.identity.addFromUri()', err)
    }
}

export const generateUri = generateMnemonic

export const get = address => identities.get(address)

// todo: migrate from array to map for consistency
export const getAll = () => identities.map(([_, x]) => x)

export const getSelected = () => identities.find({ selected: true }, true, true) || getAll()[0]

export const find = addressOrName => identities.find({ address: addressOrName, name: addressOrName }, true, false, true)

// Permanent remove identity from localStorage
export const remove = address => identities.delete(address)

// add/update
export const set = (address, identity = {}) => {
    const { selected, type, uri, usageType } = identity
    identity.type = type || 'sr25519'
    identity.selected = !!selected
    if (!Object.values(USAGE_TYPES).includes(usageType)) {
        identity.usageType = USAGE_TYPES.PERSONAL
    }
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
    rxSelected.next(address)
}

// Custom hook to use the selected identity in a functional component
export const useSelected = () => {
    const [selected, setSelected] = useState(getSelected().address)

    useEffect(() => {
        const subscribed = rxSelected.subscribe(address => setSelected(address))
        return () => subscribed.unsubscribe()
    }, [])

    return selected
}

// Custom React hook use get the list of identities and subscribe to changes
export const useIdentities = () => {
    const [list, setList] = useState(getAll())

    useEffect(() => {
        let mounted = true
        let ignoredFirst
        const subscribed = identities.rxData.subscribe(() => {
            // prevents one extra render
            ignoredFirst && mounted && setList(getAll())
            ignoredFirst = true
        })
        return () => {
            mounted = false
            subscribed.unsubscribe()
        }
    }, [])

    return [list]
}

const init = () => {
    if (!getAll().length) {
        // generate a new seed
        const uri = generateUri() + '/totem/0/0'
        const { address } = addFromUri(uri) || {}
        // in case `wasm-crypto` hasn't been initiated yet, try again after a second
        if (!address) return setTimeout(init, 1000)
        console.log('Identity service: creating default identity for first time user')

        const identity = {
            address,
            name: DEFAULT_NAME,
            usageType: USAGE_TYPES.PERSONAL,
            uri,
        }
        set(address, identity)
    }

    rxSelected.next(getSelected().address)
}

setTimeout(init)

export default {
    addFromUri,
    find,
    generateUri,
    get,
    getAll,
    getSelected,
    remove,
    set,
    setSelected,
}