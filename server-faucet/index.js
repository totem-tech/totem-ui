import https from 'https'
import fs from 'fs'
import socket from 'socket.io'
import uuid from 'uuid'
import nls from 'node-localstorage'
// import { post, secretStore } from 'oo7-substrate'
import nacl, { box, sign } from 'tweetnacl'
nacl.util = require('tweetnacl-util')
// Environment variables
const FAUCET_PORT = process.env.FAUCET_PORT || 3002
const FAUCET_CERT_PATH = process.env.FAUCET_CERT_PATH || './sslcert/fullchain.pem'
const FAUCET_KEY_PATH = process.env.FAUCET_KEY_PATH || './sslcert/privkey.pem'
const FAUCET_STORAGE_PATH = process.env.FAUCET_STORAGE_PATH || './server-faucet/local-storage'
// Pseudo localStorage
const localStorage = new nls.LocalStorage(FAUCET_STORAGE_PATH)
const getItem = key => JSON.parse(localStorage.getItem(key))
const setItem = (key, value) => localStorage.setItem(key, JSON.stringify(value)) || value
// Key pair of this server
let publicKey = getItem('publicKey')
let secretKey = getItem('secretKey')
if (!secretKey || !publicKey) {
    const keyPair = nacl.box.keyPair()
    publicKey = setItem('publicKey', nacl.util.encodeBase64(keyPair.publicKey))
    secretKey = setItem('secretKey', nacl.util.encodeBase64(keyPair.secretKey))
}
const serverName = getItem('serverName') || setItem('serverName', uuid.v1())
const external_publicKey = getItem('external_publicKey')
const external_serverName = getItem('external_serverName')
if (!external_publicKey || !external_serverName) {
    throw new Error('External server public key (external_publicKey) and/or name (external_serverName) file(s) not found or empty in the pseudo local storage path:', FAUCET_STORAGE_PATH)
}
// const testWallet = {
//     keyData: "0887008df8c941f5ddb64e3780e5abd29cc9534bd87b59f7ce31e2ed1201eb617f786f5a863e3a2482135e618fe00732ee055080104d568a0a4a1af186190050e2ddcdc1969acb3c66423f429ffe884e1aaae05959d857ff3830a3618b8db746",
//     uri: "tomato bind bus muscle chuckle rescue photo roast ski famous reflect reason",
//     name: "Default",
//     type: "sr25519"
// }

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

    client.on('faucet', (box, callback) => {
        // faucetQueue.push({
        //     address,
        //     status: undefined,
        //     callback
        // })
    })
})

// Start server
server.listen(FAUCET_PORT, () => console.log('\nFaucet server websocket listening on port ', FAUCET_PORT))