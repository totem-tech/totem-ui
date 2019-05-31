import express from 'express';

const port = 8000;
let app = express();
app.use(express.static('dist'));

app.listen(port, () => {
  console.log('Web server listening on port 8000');
});

/*
 * Chat server
 */
const http = require('http')
const server = http.createServer(app)
const io = require('socket.io').listen(server)
const fs = require('fs');
const usersFile = './users.json'
const wsPort = 3001
const isFn = fn => typeof(fn) === 'function'
let users = new Map()
const clients = new Map();
const isValidId = id => /^[a-z][a-z0-9]+$/.test(id);
const idMaxLength = 16
const msgMaxLength = 160
const idMinLength = 3
const findClientIndex = (user, clientId) => user.clientIds.findIndex(cid => cid === clientId)
const findUserByClientId = clientId => {
  for (let [_, user] of users.entries()) {
    if( user.clientIds.indexOf(clientId) >= 0 ) return user;
  }
}

// Error messages
const errMsgs = {
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

  client.on('faucet-request', (address, amount, callback) => {
    const doCb = isFn(callback)
    const sender = findUserByClientId(client.id)
    if (!sender) return doCb && callback(errMsgs.loginAgain)
    console.info('faucet-request from @' + sender.id, address, amount)
    emit([], 'faucet-request', [sender.id, address, amount])
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

  server.listen(wsPort, () => console.log('Websocket listening on port ', wsPort))
});

const saveUsers = () => {
  const data = Array.from(users.entries()).map(u => [
    u[0],
    {
      id: u[1].id,
      secret: u[1].secret,
      joined: u[1].joined,
      // remove obsolete client IDs
      clientIds: []
    }
  ])

  fs.writeFile(
    usersFile,
    JSON.stringify(data),
    { flag: 'w' },
    err => err && console.log('Failed to save user data. ' + err)
  )
}

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