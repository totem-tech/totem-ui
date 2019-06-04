
import {calls, runtime, chain, system, runtimeUp, ss58Encode, ss58Decode, addressBook, secretStore, pretty} from 'oo7-substrate'
import {Bond} from 'oo7'
import uuid from 'uuid'

const PREFIX = 'data-cache'
const isFn = fn => typeof(fn) === 'function'
const UPDATE_FREQUERY = 1000*30 //  milliseconds
// In case of custom runtime or when bond is not immediately available
const DEFER_DELAY = 10 * 1000
const DEFER_MAX_TRIES = 10
const settings = {
    chain_height: {
        bond: () => chain.height,
        // key: 'chain_height',
        // value: undefined,
        // valueOld: undefined,
        // lastUpdated: undefined,
        // onUpdateCallbacks: undefined,
        // notifyId: undefined
    },
    runtime_totem_claimsCount: {
        bond: () => runtime.totem.claimsCount,
        // deferred-ish mechanism is required as runtime.totem is not immediately availabe and causes error
        bondIsAvailable: () => runtime.totem && runtime.totem.claimsCount,
        delay: 1000, //millisecond
        maxTries: 15
    },
    runtime_core_authorities: {
        bond: () => runtime.core.authorities
    },
    runtime_version_specVersion: {
        bond: () => runtime.version.specVersion
    },
    runtimeUp: {
        bond: () => runtimeUp
    },
    system_chain: {
        bond: () => system.chain
    },
    system_health_is_syncing: {
        bond: () => system.health.is_syncing
    },
    system_health_peers: {
        bond: () => system.health.peers
    }
}

export const addWatcher = (key, callback, _callbackAdded) => {
    const item = settings[key]
    const callbackId = uuid.v1()
    if (!item || !isFn(callback)) return; // not supported or invalid callback

    if (!_callbackAdded) {
        item.key = key
        item.onUpdateCallbacks = item.onUpdateCallbacks || new Map()
        item.onUpdateCallbacks.set(callbackId, callback)
        item.updateFrequency = item.updateFrequency || UPDATE_FREQUERY
        _callbackAdded = true
    }

    if (isFn(item.bondIsAvailable) && !item.bondIsAvailable()) {
        item.maxTries = item.maxTries === undefined ? DEFER_MAX_TRIES : item.maxTries--
        item.delay = item.delay || DEFER_DELAY
        // max retries reached, bond still not available
        if (item.maxTries === 0) return;
        // delay until bond is ready to be used
        setTimeout(() => addWatcher(key, callback, _callbackAdded), item.delay)
        return callbackId
    }

    // First time setup
    if (!item.notifyId && item.bond() && isFn(item.bond().notify)) {
        item.notifyId = item.bond().notify(() => {
            const bond = item.bond().use()
            const val = bond._value
            if (item.value === val || !bond.isReady()) return;
            
            item.valueOld = item.value
            item.value = val
            const triggerUpdate = !item.lastUpdated || Math.abs(new Date()-item.lastUpdated) >= item.updateFrequency
            if (!triggerUpdate) return;

            Array.from(item.onUpdateCallbacks.entries()).forEach(cbEntry => {
                const cb = cbEntry[1]
                isFn(cb) && cb(item.value, item.valueOld)
            })
            item.lastUpdated = new Date()
        })
    }

    if (item.value !== undefined) {
        callback(item.value, item.valueOld)
    }

    // return callbackId if needs to be removed in the future
    return callbackId
}

export const removeWatcher = (key, callbackId) => {
    const item = settings[key]
    if (!item || !item.onUpdateCallbacks.get(callbackId)) return;
    
    item.onUpdateCallbacks.delete(callbackId)
    if (item.onUpdateCallbacks.size === 0 && item.notifyId) {
        // no more callbacks available. remove bond notifier
        item.bond().unnotify(item.notifyId)
        item.notifyId = undefined
    }

}