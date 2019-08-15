import nls from 'node-localstorage'
import ioClient from 'socket.io-client'
import uuid from 'uuid'
import nacl from 'tweetnacl'
nacl.util = require('tweetnacl-util')
import { generateHash as generateNonce, isFn, isStr, mapFindByKey } from '../src/utils/utils'
import { getItem as getFaucetRequest, setItem as setFaucetRequest } from './dataService'
const DATA_KEY = 'faucetRequests'
// Maximum number of requests within @TIME_LIMIT
const REQUEST_LIMIT = 5
const TIME_LIMIT = 24 * 60 * 60 * 1000 // 1 day in milliseconds
// Environment variables
const STORAGE_PATH = process.env.STORAGE_PATH || './server/local-storage'
const FAUCET_SERVER_URL = process.env.FAUCET_SERVER_URL || 'https://127.0.0.1:3002'
// Pseudo localStorage
const localStorage = new nls.LocalStorage(STORAGE_PATH)
const getItem = key => JSON.parse(localStorage.getItem(key))
const setItem = (key, value) => localStorage.setItem(key, JSON.stringify(value)) || value
const KEY_PAIR = 'KEY_PAIR'
// Key pair of this server
let keyPair = getItem(KEY_PAIR)
if (!keyPair) {
    keyPair = nacl.box.keyPair()
    setItem(KEY_PAIR, keyPair)
}
const SERVER_NAME = getItem('SERVER_NAME') || setItem('SERVER_NAME', uuid.v1())
const EXTERNAL_SERVER_PUB_KEY = getItem('EXTERNAL_SERVER_PUB_KEY')
const EXTERNAL_SERVER_NAME = getItem('EXTERNAL_SERVER_NAME')
if (!EXTERNAL_SERVER_PUB_KEY || !EXTERNAL_SERVER_NAME) {
    throw new Error('Faucet server public key (EXTERNAL_SERVER_PUB_KEY) and/or name (EXTERNAL_SERVER_NAME) file(s) not found or empty in the pseudo local storage')
}
const faucetClient = ioClient(FAUCET_SERVER_URL, { secure: true, rejectUnauthorized: false })

// Error messages
const errMsgs = {
    fauceRequestLimitReached: `Maximum ${REQUEST_LIMIT} requests allowed within 24 hour period`,
    loginOrRegister: 'Login/registration required'
}

export const faucetRequestHandler = (client, emitter, findUserByClientId) => (address, callback) => {
    if (!isFn(callback)) return;
    const user = findUserByClientId(client.id)
    if (!user) return callback(errMsgs.loginOrRegister)
    getFaucetRequest(DATA_KEY, user.id)
        .then(userRequests => {
            userRequests = userRequests || []
            const numReqs = userRequests.length
            let fifthTS = (userRequests[numReqs - 5] || {}).timestamp
            fifthTS = isStr(fifthTS) ? Date.parse(fifthTS) : fifthTS
            if (numReqs >= REQUEST_LIMIT && Math.abs(new Date() - fifthTS) < TIME_LIMIT) {
                // prevents adding more than maximum number of requests within the given duration
                return callback(errMsgs.fauceRequestLimitReached, fifthTS)
            }

            const signedMessage = nacl.sign(EXTERNAL_SERVER_NAME + address, secretKey)
            const nonce = generateNonce(uuid.v1())
            const box = nacl.box(signedMessage, nonce, EXTERNAL_SERVER_PUB_KEY, keyPair.secretKey)
            faucetClient.emit('faucet', box, (err) => {
                //////////////////////////////
            })

            userRequests.push({
                address,
                timestamp: new Date(),
                funded: false
            })

            if (numReqs >= REQUEST_LIMIT) {
                userRequests = userRequests.slice(numReqs - REQUEST_LIMIT)
            }
            setFaucetRequest(DATA_KEY, user.id, userRequests)
            emitter([], 'faucet-request', [user.id, address])
            callback()
        })
        .catch(callback)
}