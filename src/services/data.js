
import {calls, runtime, chain, nodeService, system, runtimeUp, ss58Encode, ss58Decode, addressBook, secretStore, pretty} from 'oo7-substrate'
import {Bond} from 'oo7'
import uuid from 'uuid'

const PREFIX = 'data-cache'
const isFn = fn => typeof(fn) === 'function'
const UPDATE_FREQUENCY = 1000*30 //  milliseconds (30 Seconds)
// In case of custom runtime or when bond is not immediately available
const DEFER_DELAY = 10 * 1000
const DEFER_MAX_TRIES = 10
const settings = {
    chain_height: { bond: () => chain.height },
    chain_lag: { bond: () => chain.lag },
    nodeService_status: { bond: () => nodeService().status},
    runtime_totem_claimsCount: {
        bond: () => runtime.totem.claimsCount,
        // deferred-ish mechanism is required as runtime.totem is not immediately available and causes error
        bondIsAvailable: () => runtime.totem && runtime.totem.claimsCount,
        delay: 1000, //millisecond
        maxTries: 15
        // Properties used
        // key: 'runtime_totem_claimsCount',
        // value: undefined,
        // valueOld: undefined,
        // lastUpdated: undefined,
        // onUpdateCallbacks: undefined,
        // notifyId: undefined
    },
    runtime_balances_balance: { bond: () => runtime.balances.balance, requireArgs: 1},
    runtime_core_authorities: { bond: () => runtime.core.authorities },
    runtime_balances_totalIssuance: { bond: () => runtime.balances.totalIssuance},
    runtime_version_implName: { bond: () => runtime.version.implName},
    runtime_version_implVersion: { bond: () => runtime.version.implVersion},
    runtime_version_specName: { bond: () => runtime.version.specName},
    runtime_version_specVersion: { bond: () => runtime.version.specVersion },
    runtimeUp: { bond: () => runtimeUp },
    system_chain: { bond: () => system.chain },
    system_health_is_syncing: { bond: () => system.health.is_syncing },
    system_health_peers: { bond: () => system.health.peers },
    system_name: { bond: () => system.name },
    system_version: {bond: () => system.version}
}

// addWatcher adds an watcher for blockchain related data.
// Uses the Bond's notify functions and invokes the callback whenever value changes and minimum duration elapsed.
//
// Params:
// @key         string  : data key (see 'settings' above for a list of data keys)
// @callback    function: function to be invoked 
//                      Arguments supplied: newValue, oldValue
// @args        Array   : array of agruments if bond() function returns a function rather than a Bond.
// @_callbackAdded bool : FOR INTERNAL USE ONLY
//
// Returns callbackId
export const addWatcher = (key, callback, args, _callbackAdded) => {
    const item = settings[key]
    const callbackId = uuid.v1()
    if (!item || !isFn(callback)) return; // not supported or invalid callback

    if (!_callbackAdded) {
        item.key = key
        item.onUpdateCallbacks = item.onUpdateCallbacks || new Map()
        item.onUpdateCallbacks.set(callbackId, callback)
        item.updateFrequency = item.updateFrequency || UPDATE_FREQUENCY
        _callbackAdded = true
    }

    if (isFn(item.bondIsAvailable) && !item.bondIsAvailable()) {
        item.maxTries = item.maxTries === undefined ? DEFER_MAX_TRIES : item.maxTries--
        item.delay = item.delay || DEFER_DELAY
        // max retries reached, bond still not available
        if (item.maxTries === 0) return;
        // delay until bond is ready to be used
        setTimeout(() => addWatcher(key, callback, args, _callbackAdded), item.delay)
        return callbackId
    }

    // First time setup notifier
    if (!item.notifyId && item.bond() && isFn(item.bond().notify)) {
        item.notifyId = item.bond().notify(() => {
            let bond = item.bond()
            if (typeof(bond) === 'function') {
                // TODO: improvements required to handle different arguments supplied
                //       --- register separate notifiers for each set of arguments
                //       --- also remove them appropriately
                args = args || []
                bond = bond.apply(null, args)
            }
            const val = bond.use()._value
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

// addWatcherSetState adds a watcher for a specific data key and sets instance.state[key] to resolved value on callback
//
// Params:
// @instance    React.Component/ReactiveComponent
// @key         string
export const addWatcherSetState = (instance, key) => addWatcher(key, (value) => {
    const data = {}
    data[key] = value
    instance.setState(data)
})

// addWatcherSetState adds an array of watcher keys and sets instance.state[key] to resolved value on callback
//
// Params:
// @instance    React.Component/ReactiveComponent
// @keys        Array
//
// Returns Map
export const addMultiWatcherSetState = (instance, keys) => keys.map(key => [key, addWatcherSetState(instance, key)])

// removeWatcher removes a data watcher callback. Also unsubscribes from notifier if it's the only callback
//
// Params: 
// @key         string
// @callbackId  string : the ID returned by the addWatcher() function
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

// removeWatchers removes multiple watchers
//
// Params: 
// @keyIdMap    Map
export const removeWatchers = keyIdMap => Array.from(keyIdMap.entries()).forEach(ki => removeWatcher(ki[0], ki[1]))