import { ApiPromise, WsProvider } from '@polkadot/api'
import Keyring from '@polkadot/keyring/'
import createPair from '@polkadot/keyring/pair'
import { isFn } from './utils'

let _api, _nodeUrl, _types

export const connect = (nodeUrl, types) => {
    _nodeUrl = nodeUrl || _nodeUrl
    _types = types || _types
    console.log('Polkadot: Connecting to Totem Blockchain Network...')
    // connect to node
    const provider = new WsProvider(_nodeUrl)
    // Create the API and wait until ready
    return ApiPromise.create({ provider, types }).then(api => {
        // Retrieve the chain & node information information via rpc calls
        Promise.all([
            api.rpc.system.chain(),
            api.rpc.system.name(),
            api.rpc.system.version()
        ]).then(([chain, nodeName, nodeVersion]) => {
            console.log(`Polkadot: Connected to chain "${chain}" using "${nodeName}" v${nodeVersion}`)
        })

        // Set @api object for handleFaucetTransfer to use when needed
        _api = api
        return api
    })
}

// @secretKey   string: secretKey or seed
// @publicKey   string: if undefined, @secretkey will be assumed to be a seed
export const transfer = (toAddress, amount, secretKey, publicKey) => {
    // check if api is connected otherwise connect
    // _api.connected??

    const keyring = new Keyring({ type: 'sr25519' })
    let pair
    if (!!publicKey) {
        pair = createPair('sr25519', { secretKey, publicKey })
        keyring.addPair(pair)
    } else {
        pair = keyring.addFromUri(secretKey)
    }

    const sender = keyring.getPair(pair.address)
    return Promise.all([
        _api.query.balances.freeBalance(sender.address),
        _api.query.system.accountNonce(sender.address),
    ]).then(([balance, nonce]) => new Promise((resolve, reject) => {
        if (balance <= amount) return reject('Insufficient balance')
        console.log('Polkadot: transfer', { balance, nonce })

        _api.tx.balances
            .transfer(toAddress, amount)
            .sign(sender, { nonce })
            .send(data => {
                const { events = [], status } = data || {}
                console.log('Polkadot: Transaction status', status.type, { res: data })
                if (!status.isFinalized) return
                const hash = status.asFinalized.toHex()
                console.log('Polkadot: Completed at block hash', hash)
                resolve(hash)
            })
    }))
}