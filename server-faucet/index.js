import https from 'https'
import fs from 'fs'
import socket from 'socket.io'
import uuid from 'uuid'
import nls from 'node-localstorage'
import { encrypt, decrypt, newNonce } from '../src/utils/naclHelper'
// import { post, secretStore } from 'oo7-substrate'
// Environment variables
const FAUCET_PORT = process.env.FAUCET_PORT || 3002
const FAUCET_CERT_PATH = process.env.FAUCET_CERT_PATH || './sslcert/fullchain.pem'
const FAUCET_KEY_PATH = process.env.FAUCET_KEY_PATH || './sslcert/privkey.pem'
const FAUCET_STORAGE_PATH = process.env.FAUCET_STORAGE_PATH || './server-faucet/local-storage'
// Pseudo localStorage
const localStorage = new nls.LocalStorage(FAUCET_STORAGE_PATH)
const getItem = key => JSON.parse(localStorage.getItem(key))
const setItem = (key, value) => localStorage.setItem(key, JSON.stringify(value)) || value

const publicKey = getItem('publicKey')
const secretKey = getItem('secretKey')
if (!publicKey || !secretKey) throw new Error('Missing "publicKey" and/or "secretKey"');

const serverName = getItem('serverName')
if (!serverName) throw new Error('Missing "serverName"');
const external_publicKey = getItem('external_publicKey')
const external_serverName = getItem('external_serverName')
if (!external_publicKey || !external_serverName) {
    throw new Error('External server public key (external_publicKey) and/or name (external_serverName) file(s) not found or empty in the pseudo local storage path:', FAUCET_STORAGE_PATH)
}

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