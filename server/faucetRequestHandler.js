
import ioClient from 'socket.io-client'
import { encrypt, encryptionKeypair, signingKeyPair, newNonce, newSignature, verifySignature } from '../src/utils/naclHelper'
import { isFn, isStr } from '../src/utils/utils'
import DataStorage from '../src/utils/DataStorage'
// import { secretStore } from 'oo7-substrate'
const faucetStorage = new DataStorage('faucet-requests.json', true)
// Maximum number of requests within @TIME_LIMIT
const REQUEST_LIMIT = 5555
const TIME_LIMIT = 24 * 60 * 60 * 1000 // 1 day in milliseconds
// Environment variables
const FAUCET_SERVER_URL = process.env.FAUCET_SERVER_URL || 'https://127.0.0.1:3002'

let keyData, walletAddress, publicKey, secretKey, signPublicKey, signSecretKey, serverName, external_publicKey, external_serverName

// Error messages
const errMsgs = {
    fauceRequestLimitReached: `Maximum ${REQUEST_LIMIT} requests allowed within 24 hour period`,
    loginOrRegister: 'Login/registration required'
}

// Reads environment variables and generate keys if needed
const setVariables = () => {
    serverName = process.env.serverName
    if (!serverName) return 'Missing environment variable: "serverName"'

    external_publicKey = process.env.external_publicKey
    external_serverName = process.env.external_serverName
    if (!external_publicKey || !external_serverName) {
        return 'Missing environment variable(s): "external_publicKey" and/or "external_serverName"'
    }

    if (!process.env.keyData) return 'Missing environment variable: "keyData"'

    // Prevent generating keys when not needed
    if (keyData === process.env.keyData) return

    // Key pairs of this server
    keyData = process.env.keyData
    const keyPair = encryptionKeypair(keyData)
    walletAddress = keyPair.walletAddress
    publicKey = keyPair.publicKey
    secretKey = keyPair.secretKey

    const signKeyPair = signingKeyPair(keyData)
    signPublicKey = signKeyPair.publicKey
    signSecretKey = signKeyPair.secretKey
}

const err = setVariables()
if (err) throw new Error(err)
console.log('keyData: ', keyData)
console.log('walletAddress: ', walletAddress)
console.log('Encryption KeyPair: \n' + JSON.stringify({ publicKey, secretKey }, null, 4))
console.log('Signing KeyPair: \n' + JSON.stringify({ signPublicKey, signSecretKey }, null, 4))
console.log('serverName: ', serverName)
console.log('external_publicKey: ', external_publicKey)
console.log('external_serverName: ', external_serverName)

const faucetClient = ioClient(FAUCET_SERVER_URL, { secure: true, rejectUnauthorized: false })

export const faucetRequestHandler = (client, emitter, findUserByClientId) => (address, callback) => {
    try {
        if (!isFn(callback)) return
        const err = setVariables()
        if (err) return callback(err) | console.log(err)

        const user = findUserByClientId(client.id)
        if (!user) return callback(errMsgs.loginOrRegister)
        let userRequests = faucetStorage.get(user.id) || []
        const index = userRequests.length
        const numReqs = userRequests.length
        let fifthTS = (userRequests[numReqs - 5] || {}).timestamp
        fifthTS = isStr(fifthTS) ? Date.parse(fifthTS) : fifthTS
        if (numReqs >= REQUEST_LIMIT && Math.abs(new Date() - fifthTS) < TIME_LIMIT) {
            // prevents adding more than maximum number of requests within the given duration
            return callback(errMsgs.fauceRequestLimitReached)
        }
        const request = {
            address,
            timestamp: new Date(),
            funded: false
        }
        userRequests.push(request)

        if (numReqs >= REQUEST_LIMIT) {
            userRequests = userRequests.slice(numReqs - REQUEST_LIMIT)
        }
        // save request data
        faucetStorage.set(user.id, userRequests)

        // Send public chat messge with facuet request | REMOVE ?
        // emitter([], 'faucet-request', [user.id, address])
        const data = JSON.stringify(request)
        const minLength = 9
        // Length of stringified data
        let lenStr = JSON.stringify(data.length)
        // Make sure to have fixed length
        lenStr = lenStr.padStart(minLength)

        // Generate new signature
        const signature = newSignature(data, signSecretKey)
        console.log('\n\n\nsignSecretKey:\n', signSecretKey)
        console.log('\n\n\nSignature:\n', signature)
        const valid = verifySignature(data, signature, signPublicKey)
        if (!valid) return callback('Signature pre-verification failed')

        const nonce = newNonce()
        const message = lenStr + external_serverName + data + signature
        const encryptedMsg = encrypt(
            message,
            nonce,
            external_publicKey,
            secretKey
        )
        faucetClient.emit('faucet', encryptedMsg, nonce, (err, hash) => {
            callback(err, hash)
            userRequests[index].funded = !err
            userRequests[index].hash = hash
            // update request data
            faucetStorage.set(user.id, userRequests)
        })

    } catch (err) {
        console.log('Faucet request failed. Error:', err)
        callback('Faucet request failed. Please try again later.')
    }
}
