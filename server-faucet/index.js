import http from 'http'
import fs from 'fs'
import socket from 'socket.io'
import express from 'express'

const WSPORT = 3002
const SSL_CERT_PATH = './sslcert/fullchain.pem'
const SSL_KEY_PATH = './sslcert/privkey.pem'
const server = http.createServer({
    cert: fs.readFileSync(SSL_CERT_PATH),
    key: fs.readFileSync(SSL_KEY_PATH)
})
const io = socket.listen(server, express)
const faucetQueue = []

// Authentication middleware: prevent conneting if authentication fails
io.use((socket, next) => {
    let token = socket.handshake.query.token //socket.handshake.headers['x-auth-token']
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