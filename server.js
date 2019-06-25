import express from 'express'

const httpPort = 80
const httpsPort = 443
let app = express()
app.use(express.static('dist'))

const http = require('http')
const https = require('https-browserify')
const fs = require('fs')

const options = {
  cert: fs.readFileSync('./sslcert/fullchain.pem'),
  key: fs.readFileSync('./sslcert/privkey.pem')
};

http.createServer(app).listen(httpPort, () => console.log('App http web server listening on port ', httpPort))
https.createServer(options, app).listen(httpsPort, () => console.log('App https web server listening on port ', httpsPort))

// app.listen(httpPort, () => {
//   console.log('Web server listening on port 80')
// })

/*
 * Chat server
 */
// const server = http.createServer(app)
const server = https.createServer(options, app)
const io = require('socket.io').listen(server)
const wsPort = 3001
const isFn = fn => typeof(fn) === 'function'
let users = new Map()
const usersFile = './users.json'
const clients = new Map()
const isValidId = id => /^[a-z][a-z0-9]+$/.test(id)
const idMaxLength = 16
const msgMaxLength = 160
const idMinLength = 3
let faucetRequests = new Map()
const faucetRequestsFile = './faucet-requests.json'
const fauceRequstLimit = 5
const faucetRequestTimeLimit = 60*60*1000 // milliseconds
const findClientIndex = (user, clientId) => user.clientIds.findIndex(cid => cid === clientId)
const findUserByClientId = clientId => {
  for (let [_, user] of users.entries()) {
    if( user.clientIds.indexOf(clientId) >= 0 ) return user;
  }
}

// Error messages
const errMsgs = {
  fauceRequestLimitReached: `Maximum ${fauceRequstLimit} requests allowed within 24 hour period`,
  idInvalid: `Only alpha-numeric characters allowed and must start with an alphabet`,
  idLength: `Must be between ${idMinLength} to ${idMaxLength} characters`,
  idExists: 'User ID already taken',
  msgLengthExceeds: `Maximum ${msgMaxLength} characters allowed`,
  loginFailed: 'Credentials do not match',
  loginAgain: 'Registration/login required'
}

io.on('connection', client => {
  client.on('disconnect', () => {
    clients.delete(client.id)
    const user = findUserByClientId(client.id)
    if (!user) return;
    user.clientIds.splice(findClientIndex(user, client.id), 1)
    user.online = false
    console.info('Client disconnected: ', client.id)
  })

  client.on('message', (msg, callback) => {
    if (!msg) return; //ignore empty message
    const doCb = isFn(callback)
    if (msg.length > msgMaxLength) {
      return doCb && callback(errMsgs.msgLengthExceeds)
    }
    
    const sender = findUserByClientId(client.id)
    // Ignore message from logged out users
    if (!sender) return doCb && callback(errMsgs.loginAgain);
    emit(client.id, 'message', [msg, sender.id])
    doCb && callback()
  })

  client.on('id-exists', (userId, callback) => {
    const exists = !!users.get(userId)
    console.log('id-exists', userId, exists)
    isFn(callback) && callback(exists, userId)
  })

  client.on('register', (userId, secret, callback) => {
    const doCb = isFn(callback)
    if (users.get(userId)) {
      console.info(userId, ':', errMsgs.idExists)
      doCb && callback(errMsgs.idExists)
      return
    }
    if (!isValidId(userId)) return doCb && callback(errMsgs.idInvalid)
    if (userId.length >= idMaxLength || userId.length < idMinLength) return doCb && callback(errMsgs.idLength)

    const newUser = {
      id: userId,
      secret: secret,
      joined: new Date(),
      online: true,
      clientIds: [client.id]
    }
    users.set(userId, newUser)
    clients.set(client.id, client)
    console.info('User registered:', newUser)
    doCb && callback()
    saveUsers()
  })

  client.on('login', (userId, secret, callback) => {
    const user = users.get(userId)
    const valid = user && user.secret === secret
    let err;
    if (valid) {
      user.clientIds.push(client.id)
      user.online = true
      clients.set(client.id, client)
    } else {
      err = errMsgs.loginFailed
    }

    console.info('Login ' + (err ? 'failed' : 'success') + ' | ID:', userId, '| Client ID: ', client.id)
    isFn(callback) && callback(err)
    emit()
  })

  client.on('faucet-request', (address, callback) => {
    const doCb = isFn(callback)
    const user = findUserByClientId(client.id)
    if (!user) return doCb && callback(errMsgs.loginAgain)

    let userRequests = faucetRequests.get(user.id)

    userRequests = userRequests || []
    const numReqs = userRequests.length
    let fifthTS = (userRequests[numReqs - 5] || {}).timestamp
    fifthTS = fifthTS && typeof(fifthTS) === 'string' ? Date.parse(fifthTS) : fifthTS
    if (numReqs >= fauceRequstLimit && Math.abs(new Date() - fifthTS) < faucetRequestTimeLimit) {
      // prevents adding more than maximum number of requests within the given duration
      return doCb && callback(errMsgs.fauceRequestLimitReached, fifthTS)
    }

    userRequests.push({
      address,
      timestamp: new Date(),
      funded: false
    })
    
    if (numReqs >= faucetRequestTimeLimit) {
      userRequests = userRequests.slice(numReqs - faucetRequestTimeLimit)
    }
    faucetRequests.set(user.id, userRequests)
    // console.log(user.id, faucetRequests.get(user.id))
    // console.log('User Requests', userRequests)
    saveFaucetRequests()
    // console.info('faucet-request from @' + user.id, address)
    emit([], 'faucet-request', [user.id, address])
    doCb && callback()
  })
})

// Load user data from json file
fs.readFile(usersFile, (err, data) => {
  if (err) {
    // File doesn't exists. Create new file
    saveUsers()
  } else {
    // Load existing user list
    users = new Map(JSON.parse(data))
  }

  server.listen(wsPort, () => console.log('Chat app https Websocket listening on port ', wsPort))
})

const saveUsers = () => saveMapToFile(usersFile, users)
const saveFaucetRequests = () => saveMapToFile(faucetRequestsFile, faucetRequests)
const saveMapToFile = (file, map) => {
  console.log(file)
  console.log(Array.from(map.entries()))
  file && fs.writeFile(
    file,
    JSON.stringify(Array.from(map.entries())),
    { flag: 'w' },
    err => err && console.log(`Failed to save ${file}. ${err}`)
  )
}

// Broadcast message to all users except ignoreClientIds
const emit = (ignoreClientIds, eventName, cbParams) => {
  ignoreClientIds = Array.isArray(ignoreClientIds) ? ignoreClientIds : [ignoreClientIds]
  cbParams = cbParams || []
  cbParams.splice(0, 0, eventName)
  for (const [_, iClient] of clients) {
    if (ignoreClientIds.indexOf(iClient.id) >= 0) continue; // ignore sender client
    // iClient.emit('message', msg, sender.id)
    iClient.emit.apply(iClient, cbParams)
  }
}