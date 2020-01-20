import { ApiPromise, WsProvider } from '@polkadot/api'
import Keyring from '@polkadot/keyring/'
import createPair from '@polkadot/keyring/pair'

const TYPE = 'sr25519'
const config = {
    nodes: [],
    timeout: 30000,
    types: {},
}

// connect initiates a connection to the blockchain using PolkadotJS
//
// Params:
// @nodeUrl     string
// @types       object: custom type definitions
// @autoConnect boolean: whether to auto reconnect or create an once-off connection
//
// returns promise: 
//                  - will resolve to an object: { api, provider}
//                  - will reject to either a @err: string or object (if object use @message property for error message)
//                  - will reject if connection fails as well as times out
export const connect = (
    nodeUrl = config.nodes[0],
    types = config.types,
    autoConnect = true,
    timeout = config.timeout
) => new Promise((resolve, reject) => {
    const provider = new WsProvider(nodeUrl, autoConnect)
    if (!autoConnect) provider.connect()
    // auto reject if doesn't connect within specified duration
    const tId = setTimeout(() => !provider.isConnected() && reject('Connection timeout'), timeout)
    // reject if connection fails
    provider.websocket.addEventListener('error', () => reject('Connection failed') | clearTimeout(tId))
    // instantiate the Polkadot API using the provider and supplied types
    ApiPromise.create({ provider, types }).then(api => resolve({ api, provider }) | clearTimeout(tId), reject)
})

// setDefaultConfig sets nodes and types for use with once-off connections as well as default values for @connect function
export const setDefaultConfig = (nodes = config.nodes, types = config.types, timeout = config.timeout) => {
    config.nodes = nodes
    config.types = types
    config.timeout = timeout
}

// transfer funds between accounts
//
// Params:
// @toAddress   string: destination identity/address
// @secretKey   string: secretKey or seed
// @publicKey   string: if falsy, @secretkey will be assumed to be a seed with type: 'sr25519'
// @api         object: Polkadot API from `ApiPromise`
//
// Returns promise: will resolve to transaction hash
export const transfer = (toAddress, amount, secretKey, publicKey, api) => {
    if (!api) {
        // config.nodes wasn't set => return empty promise that rejects immediately
        if (config.nodes.length === 0) {
            return new Promise((_, reject) => reject('Unable to connect: invalid configuration'))
        }
        return connect(config.nodes[0], config.types, false)
            .then(({ api, provider }) => {
                console.log({ api, provider })
                return transfer(toAddress, amount, secretKey, publicKey, api)
                    .finally(() => provider.disconnect())
            })
    }

    const keyring = new Keyring({ type: TYPE })
    let pair
    if (!!publicKey) {
        pair = createPair(TYPE, { secretKey, publicKey })
        keyring.addPair(pair)
    } else {
        pair = keyring.addFromUri(secretKey)
    }
    const sender = keyring.getPair(pair.address)
    return Promise.all([
        api.query.balances.freeBalance(sender.address),
        api.query.system.accountNonce(sender.address),
    ]).then(([balance, nonce]) => new Promise((resolve, reject) => {
        if (balance <= amount) return reject('Insufficient balance')
        console.log('Polkadot: transfer', { balance: balance.toString(), nonce: nonce.toString() })

        api.tx.balances
            .transfer(toAddress, amount)
            .sign(sender, { nonce })
            .send(({ status }) => {
                console.log('Polkadot: Transaction status', status.type)
                if (!status.isFinalized) return
                const hash = status.asFinalized.toHex()
                console.log('Polkadot: Completed at block hash', hash)
                resolve(hash)
            })
    }))
}