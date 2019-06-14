
import {calls, runtime, chain, nodeService, system, runtimeUp, ss58Encode, ss58Decode, addressBook, secretStore} from 'oo7-substrate'
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
        // key: 'runtime_totem_claimsCount',
        // value: undefined,
        // valueOld: undefined,
        // lastUpdated: undefined,
        // callbacks: undefined,
        // notifyId: undefined
    },
    runtime_balances_balance: { 
        bond: () => runtime.balances.balance,
        requireArgs: true,
        // settings: new Map() // for each variation of argument(s)
    },
    runtime_core_authorities: { bond: () => runtime.core.authorities },
    runtime_balances_totalIssuance: { bond: () => runtime.balances.totalIssuance},
    runtime_version_implName: { bond: () => runtime.version.implName},
    runtime_version_implVersion: { bond: () => runtime.version.implVersion},
    runtime_version_specName: { bond: () => runtime.version.specName},
    runtime_version_specVersion: { bond: () => runtime.version.specVersion },
    runtimeUp: { bond: () => runtimeUp },
    system_chain: { bond: () => system.chain },
    system_health_is_syncing: { bond: () => system.health.isSyncing },
    system_health_should_have_peers: { bond: () => system.health.shouldHavePeers },
    system_health_peers: { bond: () => system.health.peers },
    system_name: { bond: () => system.name },
    system_version: {bond: () => system.version}
}

// subscribe adds an watcher for blockchain related data.
// Uses the Bond's notify functions and invokes the callback whenever value changes and minimum duration elapsed.
//
// Params:
// @key         string  : data key (see 'settings' above for a list of data keys)
// @callback    function: function to be invoked 
//                      Arguments supplied: newValue, oldValue
// @args        Array   : array of agruments if bond() function returns a function rather than a Bond.
// @callbackId  string  : FOR INTERNAL USE ONLY
//
// Returns callbackId
export const subscribe = (key, callback, args, callbackId) => {
    const item = settings[key]
    args = args || []
    callbackId = callbackId || uuid.v1()
    if (!item || !isFn(callback)) return; // not supported or invalid callback

    // For Bonds that are not immediately available.
    // Example: runtime.totem is a custom runtime and is not immediately available
    if (isFn(item.bondIsAvailable) && !item.bondIsAvailable()) {
        item.maxTries = item.maxTries === undefined ? DEFER_MAX_TRIES : item.maxTries--
        item.delay = item.delay || DEFER_DELAY
        // max retries reached, bond still not available
        if (item.maxTries === 0) return;
        // delay until bond is ready to be used
        setTimeout(() => subscribe(key, callback, args, callbackId), item.delay)
        return callbackId
    }

    let bond = !item.requireArgs ? item.bond() : item.bond().apply(null, args)
    const argsStr = JSON.stringify(args)
    item.key = key
    if (item.requireArgs) {
        // variable bond
        item.settings = item.settings || new Map()
        const argsItem = item.settings.get(argsStr) || item.settings.set(argsStr, {}).get(argsStr)
        argsItem.bond = () => bond
        argsItem.callbacks = argsItem.callbacks || new Map().set(calblackId, callback)
        argsItem.updateFrequency = argsItem.updateFrequency || UPDATE_FREQUENCY
    } else {
        // static bond
        item.callbacks = item.callbacks || new Map()
        item.callbacks.set(callbackId, callback)
        item.updateFrequency = item.updateFrequency || UPDATE_FREQUENCY
    }

    // setup notifier
    const itemX = !item.requireArgs ? item : item.settings.get(argsStr)
    itemX.notifierId = itemX.notifierId || setNotifier(bond, itemX)
    itemX.value !== undefined && callback(itemX.value, itemX.valueOld)

    // return callbackId if needs to be removed in the future
    return callbackId
}

const setNotifier = (bond, item) => bond.notify(() => notifierCallback(bond, item))
const notifierCallback = (bond, item) => {
    const val = bond.use()._value
    if (item.value === val || !bond.isReady()) return;
    
    item.valueOld = item.value
    item.value = val
    const triggerUpdate = !item.lastUpdated || Math.abs(new Date()-item.lastUpdated) >= item.updateFrequency
    if (!triggerUpdate) return;

    Array.from(item.callbacks.entries()).forEach(cbEntry => {
        const cb = cbEntry[1]
        isFn(cb) && cb(item.value, item.valueOld)
    })
    item.lastUpdated = new Date()
}

// subscribeNSetState adds a watcher for a specific data key and sets instance.state[key] to resolved value on callback
//
// Params:
// @instance    React.Component/ReactiveComponent
// @key         string
export const subscribeNSetState = (instance, key) => subscribe(key, (value) => {
    const data = {}
    data[Array.isArray(key) ? key[1] : key] = value
    instance.setState(data)
})

// subscribeAllNSetState adds an array of watcher keys and sets instance.state[key] to resolved value on callback
//
// Params:
// @instance    React.Component/ReactiveComponent
// @keys        Array
//
// Returns Map
export const subscribeAllNSetState = (instance, keys) => keys.map(key => [key, subscribeNSetState(instance, key)])

// unsubscribe removes a data watcher callback. Also unsubscribes from notifier if it's the only callback
//
// Params: 
// @key         string
// @callbackId  string : the ID returned by the addWatcher() function
export const unsubscribe = (key, callbackId) => {
    const item = settings[key]
    if (!item) return;
    let itemX;

    if (item.requireArgs) {
        const x = Array.from(item.settings.entries()).find(argsItem => {
            return !!argsItem[1].callbacks.get(callbackId)
        })
        if (!x) return;
        itemX = x[1]
    } else {
        itemX = item
    }

    itemX.callbacks.delete(callbackId)
    if (itemX.callbacks.size === 0 && item.notifyId) {
        // no more callbacks available. remove bond notifier
        itemX.bond().unnotify(itemX.notifyId)
        itemX.notifyId = undefined
    }
}

// unsubscribeAll removes multiple watchers
//
// Params: 
// @keyIdMap    Map
export const unsubscribeAll = keyIdMap => Array.from(keyIdMap.entries()).forEach(ki => unsubscribe(ki[0], ki[1]))