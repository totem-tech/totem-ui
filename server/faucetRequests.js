
import ioClient from 'socket.io-client'
import { encrypt, encryptionKeypair, signingKeyPair, newNonce, newSignature, verifySignature, keyInfoFromKeyData } from '../src/utils/naclHelper'
import { isFn, isStr } from '../src/utils/utils'
import DataStorage from '../src/utils/DataStorage'
import { getUserByClientId } from './users'
const faucetRequests = new DataStorage('faucet-requests.json', true)
// Maximum number of requests within @TIME_LIMIT
const REQUEST_LIMIT = 5
const TIME_LIMIT = 24 * 60 * 60 * 1000 // 1 day in milliseconds
// Duration to disallow user from creating a new faucet request if there is already one in progress (neither success nor error).
// After timeout, assume something went wrong and allow user to create a new request
const TIMEOUT_DURATION = 15 * 60 * 1000 // 15 minutes in milliseconds
// Environment variables
const FAUCET_SERVER_URL = process.env.FAUCET_SERVER_URL || 'https://127.0.0.1:3002'

let keyData, walletAddress, secretKey, signPublicKey, signSecretKey, encryption_keypair, signature_keypair, serverName, external_publicKey, external_serverName, printSensitiveData

// Error messages
const errMsgs = {
    fauceRequestLimitReached: `Maximum ${REQUEST_LIMIT} requests allowed within 24 hour period`,
    loginOrRegister: 'Login/registration required',
    faucetTransferInProgress: `You already have a faucet request in-progress. Please wait until it is finished or times out in ${TIMEOUT_DURATION / 60 / 1000} minutes from request time.`
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
    const keyDataBytes = keyInfoFromKeyData(keyData)

    walletAddress = keyDataBytes.walletAddress
    // walletAddress = keyPair.walletAddress

    const encryptionKeyPair = encryptionKeypair(keyData)
    // const keyPair = encryptionKeypair(keyData)
    // publicKey = encryptionKeyPair.publicKey
    secretKey = encryptionKeyPair.secretKey

    const signatureKeyPair = signingKeyPair(keyData)
    // const signKeyPair = signingKeyPair(keyData)
    signPublicKey = signatureKeyPair.publicKey
    signSecretKey = signatureKeyPair.secretKey

    encryption_keypair = encryptionKeyPair
    signature_keypair = signatureKeyPair

    // only print sensitive data if "printSensitiveData" environment variable is set to "YES" (case-sensitive)
    printSensitiveData = process.env.printSensitiveData === "YES"
    if (!printSensitiveData) return

    console.log('serverName: ', serverName, '\n')
    console.log('keyData: ', keyData, '\n')
    console.log('walletAddress: ', walletAddress, '\n')
    console.log('Encryption KeyPair base64 encoded: \n' + JSON.stringify(encryption_keypair, null, 4), '\n')
    console.log('Signature KeyPair base64 encoded: \n' + JSON.stringify(signature_keypair, null, 4), '\n')
    console.log('external_serverName: ', external_serverName)
    console.log('external_publicKey base64 encoded: ', external_publicKey, '\n')

}

const err = setVariables()
if (err) throw new Error(err)
// connect to faucet server
const faucetClient = ioClient(FAUCET_SERVER_URL, { secure: true, rejectUnauthorized: false })

export function handleFaucetRequest(address, callback) {
    const client = this
    try {
        console.log('faucetClient.connected', faucetClient.connected)
        if (!isFn(callback)) return
        const err = setVariables()
        if (err) return callback(err) | console.log(err)

        const user = getUserByClientId(client.id)
        if (!user) return callback(errMsgs.loginOrRegister)
        let userRequests = faucetRequests.get(user.id) || []
        const last = userRequests[userRequests.length - 1]
        if (last && last.inProgress) {
            const lastTs = isStr(last.timestamp) ? Date.parse(last.timestamp) : last.timestamp
            // Disallow user from creating a new faucet request if there is already one in progress (neither success nor error) and hasn't timed out
            if (Math.abs(new Date() - lastTs) < TIMEOUT_DURATION) return callback(errMsgs.faucetTransferInProgress)
        }
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
            // remove older requests ???
            userRequests = userRequests.slice(numReqs - REQUEST_LIMIT)
        }

        const index = userRequests.length - 1
        const data = JSON.stringify(request)
        const minLength = 9
        // Length of stringified data
        let lenStr = JSON.stringify(data.length)
        // Make sure to have fixed length
        lenStr = lenStr.padStart(minLength)

        // Generate new signature
        const signature = newSignature(data, signSecretKey)
        printSensitiveData && console.log('\n\n\nsignSecretKey:\n', signSecretKey)
        printSensitiveData && console.log('\n\n\nSignature:\n', signature)
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
        userRequests[index].inProgress = true
        // save request data
        faucetRequests.set(user.id, userRequests)
        faucetClient.emit('faucet', encryptedMsg, nonce, (err, hash) => {
            userRequests[index].funded = !err
            userRequests[index].hash = hash
            userRequests[index].inProgress = false
            // update request data
            faucetRequests.set(user.id, userRequests)
            callback(err, hash)
        })

    } catch (err) {
        console.log('Faucet request failed. Error:', err)
        callback('Faucet request failed. Please try again later.')
    }
}
