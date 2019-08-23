import Keyring from '@polkadot/keyring/'
import hexToU8a from '@polkadot/util/hex/toU8a'

export async function txHandler(api, uri, toAddress, amount, secretKey) {
    // create an instance of our testing keyring
    // If you're using ES6 module imports instead of require, just change this line to:
    const keyring = new Keyring()

    // Restore funding wallet 
    const sender = keyring.addFromUri(uri, undefined, 'sr25519')
    // const sender = keyring.addFromSeed(
    //     secretKey instanceof Uint8Array ? secretKey : hexToU8a(secretKey, 256),
    //     undefined,
    //     'sr25519'
    // )
    console.log('sender.address:', sender.address)
    showBalance(api, sender.address, toAddress)
    let balance = await api.query.balances.freeBalance(sender.address)
    if (balance <= amount) throw new Error('Insufficient balance')
    // get the nonce for the admin key
    const nonce = await api.query.system.accountNonce(sender.address)

    console.log('Sending', amount, 'from', sender.address, 'to', toAddress, 'with nonce', nonce.toString())

    // Do the transfer and track the actual status
    api.tx.balances
        .transfer(toAddress, amount)
        .sign(sender, { nonce })
        .send(({ events = [], status = {} }) => {
            console.log('Transaction status:', status.type)

            if (!status.isFinalized) return
            console.log('Completed at block hash', status.asFinalized.toHex())
            console.log('Events:')

            events.forEach(({ phase, event: { data, method, section } }) => {
                console.log('\t', phase.toString(), `: ${section}.${method}`, data.toString())
            })
            showBalance(api, sender.address, toAddress)
        })
}
// Make sure to catch errors
// txHandler().catch(console.error)

async function showBalance(api, from, to) {
    let balance = await api.query.balances.freeBalance(from)
    let balance2 = await api.query.balances.freeBalance(to)
    console.log(`Sender balance: ${balance}`)
    console.log(`Recipient balance: ${balance2}`)
}