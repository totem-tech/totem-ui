import https from 'https'
import fs from 'fs'
import socket from 'socket.io'
import uuid from 'uuid'
import nls from 'node-localstorage'
import { decrypt, encryptionKeypair, signingKeyPair, verifySignature } from '../src/utils/naclHelper'
// import { post, secretStore } from 'oo7-substrate'
// Environment variables
const FAUCET_PORT = process.env.FAUCET_PORT || 3002
const FAUCET_CERT_PATH = process.env.FAUCET_CERT_PATH || './sslcert/fullchain.pem'
const FAUCET_KEY_PATH = process.env.FAUCET_KEY_PATH || './sslcert/privkey.pem'
// const FAUCET_STORAGE_PATH = process.env.FAUCET_STORAGE_PATH || './server-faucet/local-storage'
// // Pseudo localStorage
// const localStorage = new nls.LocalStorage(FAUCET_STORAGE_PATH)
// const getItem = key => JSON.parse(localStorage.getItem(key))
// const setItem = (key, value) => localStorage.setItem(key, JSON.stringify(value)) || value
let keyData, walletAddress, publicKey, secretKey, serverName, external_publicKey, external_signPublicKey, external_serverName

// Reads environment variables and generate keys if needed
const setVariables = () => {
    serverName = process.env.serverName
    if (!serverName) return 'Missing environment variable: "serverName"'

    external_publicKey = process.env.external_publicKey
    external_signPublicKey = process.env.external_signPublicKey
    external_serverName = process.env.external_serverName
    if (!external_publicKey || !external_serverName || !external_signPublicKey) {
        return 'Missing environment variable(s): "external_publicKey", "external_signPublicKey" or "external_serverName"'
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
}

const err = setVariables()
if (err) throw new Error(err)
console.log('keyData: ', keyData)
console.log('walletAddress: ', walletAddress)
console.log('Encryption KeyPair: \n' + JSON.stringify({ publicKey, secretKey }, null, 4))
console.log('serverName: ', serverName)
console.log('external_publicKey: ', external_publicKey)
console.log('external_serverName: ', external_serverName)

// Setup server to use SSL certificate
const server = https.createServer({
    cert: fs.readFileSync(FAUCET_CERT_PATH),
    key: fs.readFileSync(FAUCET_KEY_PATH)
})
const io = socket.listen(server)
// Queue transactions
const faucetQueue = []

// Authentication middleware: prevent conneting if authentication fails
// io.use((socket, next) => {
//     let token = socket.handshake.query.token //socket.handshake.headers['x-auth-token']
//     if (token === 'this_is_a_test_token') { //isValid(token)
//         console.log('Authentication success. Token', token)
//         return next()
//     }
//     console.log('Authentication failed. Token', token)
//     return next(new Error('authentication error'))
// })

// Setup websocket request handlers
io.on('connection', client => {
    console.log('Connected to', client.id)
    client.on('disonnect', () => { console.log('Client disconnected', client.id) })

    client.on('faucet', (encryptedMsg, nonce, callback) => {
        const err = setVariables()
        if (err) return callback(err) | console.log(err);
        const decrypted = decrypt(
            encryptedMsg,
            nonce,
            external_publicKey,
            secretKey
        )
        console.log('\n\ndecrypted', decrypted, '\n\n')
        if (!decrypted) return callback('Decryption failed')

        const minLength = 9
        const decryptedArr = decrypted.split('')
        const dataStart = minLength + serverName.length
        const sigStart = dataStart + parseInt(decryptedArr.slice(0, minLength).join(''))
        const msgServerName = decryptedArr.slice(minLength, dataStart).join('')
        if (serverName !== msgServerName) return callback('Invalid data', msgServerName, serverName)
        const signature = decryptedArr.slice(sigStart).join('')
        console.log('\n\n\nSignature:\n', signature)
        console.log('\n\n\nexternal_signPublicKey:\n', external_signPublicKey)
        const data = decryptedArr.slice(dataStart, sigStart).join('')
        console.log('\n\nData:\n', data)
        if (!verifySignature(data, signature, external_signPublicKey)) return callback('Signature verification failed')
        //
        // TODO: extract and match signature data
        //
        const faucetRequest = JSON.parse(data)
        if (faucetRequest.funded) return callback('Request already funded')
        if (!faucetRequest.address) return callback('Invalid address')

        faucetQueue.push({
            faucetRequest,
            status: undefined,
            callback // on success: callback(null, true)
        })
        callback(null)
    })
})

// Start server
server.listen(FAUCET_PORT, () => console.log('\nFaucet server websocket listening on port ', FAUCET_PORT))