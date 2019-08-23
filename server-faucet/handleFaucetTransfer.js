import { decrypt, encryptionKeypair, signingKeyPair, verifySignature, getKeyPair } from '../src/utils/naclHelper'
import { txHandler } from './txHandler'

// Queue transactions
let api;
let amount, uri, keyData, walletAddress, publicKey, secretKey, serverName, external_publicKey, external_signPublicKey, external_serverName
// Reads environment variables and generate keys if needed
const setVariables = () => {
    amount = eval(process.env.amount) || 100000

    serverName = process.env.serverName
    if (!serverName) return 'Missing environment variable: "serverName"'

    external_publicKey = process.env.external_publicKey
    external_signPublicKey = process.env.external_signPublicKey
    external_serverName = process.env.external_serverName
    if (!external_publicKey || !external_serverName || !external_signPublicKey) {
        return 'Missing environment variable(s): "external_publicKey", "external_signPublicKey" or "external_serverName"'
    }

    if (!process.env.keyData) return 'Missing environment variable: "keyData"'

    uri = process.env.uri
    if (!uri) return 'Missing environment variable: "uri"'

    // Prevent generating keys when not needed
    if (keyData === process.env.keyData) return
    // Key pairs of this server
    keyData = process.env.keyData
    const keyPair = encryptionKeypair(keyData)
    walletAddress = keyPair.walletAddress
    publicKey = keyPair.publicKey
    secretKey = keyPair.secretKey
}
// Set variables on start
const err = setVariables()
if (err) throw new Error(err)
console.log('keyData: ', keyData)
console.log('walletAddress: ', walletAddress)
console.log('Encryption KeyPair: \n' + JSON.stringify({ publicKey, secretKey }, null, 4))
console.log('serverName: ', serverName)
console.log('external_publicKey: ', external_publicKey)
console.log('external_serverName: ', external_serverName, '\n')
export const setApi = polkadotApi => api = polkadotApi

export const handleFaucetTransfer = (encryptedMsg, nonce, callback) => {
    if (typeof callback !== 'function') return;
    if (!api || !api.rpc) return callback('Not connected to node')
    const err = setVariables()
    if (err) return callback(err) | console.error(err);
    const decrypted = decrypt(
        encryptedMsg,
        nonce,
        external_publicKey,
        secretKey
    )
    console.log('\ndecrypted', decrypted)
    if (!decrypted) return callback('Decryption failed')

    const minLength = 9
    const decryptedArr = decrypted.split('')
    const dataStart = minLength + serverName.length
    const sigStart = dataStart + parseInt(decryptedArr.slice(0, minLength).join(''))
    const msgServerName = decryptedArr.slice(minLength, dataStart).join('')
    if (serverName !== msgServerName) return callback('Invalid data', msgServerName, serverName)
    const signature = decryptedArr.slice(sigStart).join('')
    console.log('\nSignature:\n', signature)
    console.log('\nexternal_signPublicKey:\n', external_signPublicKey)
    const data = decryptedArr.slice(dataStart, sigStart).join('')
    console.log('\nData:\n', data)
    if (!verifySignature(data, signature, external_signPublicKey)) return callback('Signature verification failed')

    const faucetRequest = JSON.parse(data)
    if (faucetRequest.funded) return callback('Request already funded')
    if (!faucetRequest.address) return callback('Invalid address')

    txHandler(api, process.env.uri, faucetRequest.address, amount, getKeyPair(keyData).secretKey32)
        .catch(err => console.error('txHandler error: ', err) | callback(err))
    callback()
}