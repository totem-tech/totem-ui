import http from 'http'
import fs from 'fs'
import socket from 'socket.io'
import express from 'express'
import nls from 'node-localstorage'
global.window = {}
import { secretStore } from 'oo7-substrate'

const WSPORT = 3002
const localStorageFile = 'local-storage'
const localStorage = new nls.LocalStorage(localStorageFile)
const SSL_CERT_PATH = './sslcert/fullchain.pem'
const SSL_KEY_PATH = './sslcert/privkey.pem'
const server = http.createServer({
    cert: fs.readFileSync(SSL_CERT_PATH),
    key: fs.readFileSync(SSL_KEY_PATH)
})
const io = socket.listen(server, express)
const faucetQueue = []
const testWallet = {
    keyData: "0887008df8c941f5ddb64e3780e5abd29cc9534bd87b59f7ce31e2ed1201eb617f786f5a863e3a2482135e618fe00732ee055080104d568a0a4a1af186190050e2ddcdc1969acb3c66423f429ffe884e1aaae05959d857ff3830a3618b8db746",
    uri: "tomato bind bus muscle chuckle rescue photo roast ski famous reflect reason",
    name: "Default",
    type: "sr25519"
}

// Authentication middleware: prevent conneting if authentication fails
io.use((socket, next) => {
    let token = socket.handshake.query.token //socket.handshake.headers['x-auth-token']
    // const ss = secretStore(localStorage) // throws: winow is not defined
    if (token === 'this_is_a_test_token') { //isValid(token)
        console.log('Authentication success. Token', token)
        return next()
    }
    console.log('Authentication failed. Token', token)
    return next(new Error('authentication error'));
});

// Setup websocket request handlers
io.on('connection', client => {
    console.log('Connected to', client.id)
    client.on('disonnect', () => { console.log('Client disconnected', client.id) })

    client.on('faucet', (address, amount, callback) => {
        faucetQueue.push({
            address,
            amount,
            status: undefined,
            callback
        })
    })
})

// Start server
server.listen(WSPORT, () => console.log('\nFaucet server websocket listening on port ', WSPORT))

console.log(localStorage)