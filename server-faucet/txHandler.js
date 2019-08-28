import Keyring from '@polkadot/keyring/'
import hexToU8a from '@polkadot/util/hex/toU8a'

export async function txHandler(api, uri, toAddress, amount, secretKey) {
    // create an instance of our testing keyring
    // If you're using ES6 module imports instead of require, just change this line to:
    const keyring = new Keyring({ type: 'sr25519' })

    // Restore funding wallet 
    // Use first 32 byte secret key as hex......................
    const sender = keyring.addFromUri(uri, undefined, 'sr25519')
    console.log('sender.address:', sender.address)
    showBalance(api, sender.address, toAddress)
    let balance = await api.query.balances.freeBalance(sender.address)
    if (balance <= amount) throw new Error('Insufficient balance')
     // Create a extrinsic, transferring 12345 units to Bob
    const transfer = api.tx.balances.transfer(toAddress, amount);

    // Sign and send the transaction using our account
    const hash = await transfer.signAndSend(sender);

    console.log('Transfer sent with hash', hash.toHex());
    console.log('Balance after transfer:')
    showBalance(api, sender.address, toAddress)
}
// Make sure to catch errors
// txHandler().catch(console.error)

async function showBalance(api, from, to) {
    let balance = await api.query.balances.freeBalance(from)
    let balance2 = await api.query.balances.freeBalance(to)
    console.log(`Sender balance: ${balance}`)
    console.log(`Recipient balance: ${balance2}`)
}