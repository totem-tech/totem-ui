import nls from 'node-localstorage'
import ioClient from 'socket.io-client'
import { encrypt, decrypt, keyDataToPair, newNonce } from '../src/utils/naclHelper'
import { generateHash as generateNonce, isFn, isStr, mapFindByKey, objCopy } from '../src/utils/utils'
import { getItem as getFaucetRequest, setItem as setFaucetRequest, getAll } from './dataService'
// import { secretStore } from 'oo7-substrate'
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

// Key pair of this server
// const keyData = getItem('keyData')
// console.log(keyDataToPair(keyData))

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

const faucetClient = ioClient(FAUCET_SERVER_URL, { secure: true, rejectUnauthorized: false })

// Error messages
const errMsgs = {
    fauceRequestLimitReached: `Maximum ${REQUEST_LIMIT} requests allowed within 24 hour period`,
    loginOrRegister: 'Login/registration required'
}

export const faucetRequestHandler = (client, emitter, findUserByClientId) => (address, callback) => {
    if (!isFn(callback)) return
    const user = findUserByClientId(client.id)
    if (!user) return callback(errMsgs.loginOrRegister)
    getFaucetRequest(DATA_KEY, user.id).then(userRequests => {
        userRequests = userRequests || []
        const numReqs = userRequests.length
        let fifthTS = (userRequests[numReqs - 5] || {}).timestamp
        fifthTS = isStr(fifthTS) ? Date.parse(fifthTS) : fifthTS
        if (numReqs >= REQUEST_LIMIT && Math.abs(new Date() - fifthTS) < TIME_LIMIT) {
            // prevents adding more than maximum number of requests within the given duration
            return callback(errMsgs.fauceRequestLimitReached, fifthTS)
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
        setFaucetRequest(DATA_KEY, user.id, userRequests).catch(err => console.log('Failed to save faucet request. Error:', err))

        // Send public chat messge with facuet request | REMOVE ?
        emitter([], 'faucet-request', [user.id, address])

        const data = external_serverName + JSON.stringify(request)
        const nonce = newNonce()
        const encryptedMsg = encrypt(
            data,
            nonce,
            external_publicKey,
            secretKey
        )
        faucetClient.emit('faucet', encryptedMsg, nonce, (err, success) => {
            callback(err, fifthTS)
        })

    }).catch(err => console.log('failed to read faucet request. err:', err) || callback(err))
}
