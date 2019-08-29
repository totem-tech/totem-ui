import express from 'express'
import { isArr, isFn, isObj, isStr, isValidNumber, hasValue, mapCopy, mapFindByKey, mapSearch, objClean, objCopy } from '../src/utils/utils'
const httpPort = 80
const httpsPort = 443
const http = require('http')
const https = require('https')
const fs = require('fs')

let app = express()

// set up plain http server and have it listen on port 80 to redirect to https 
http.createServer(function (req, res) {
	res.writeHead(307, { "Location": "https://" + req.headers['host'] + req.url });
	res.end();
}).listen(httpPort, () => console.log('\nApp http to https redirection listening on port ', httpPort));

app.use(express.static('dist'))

// The following code is a workaround for webpack mode which is currently broken
// Webpack mode would determine the development or production execution.
// Instead we are having to interrogate the execution script to determine which was called
let environment = JSON.parse(process.env.npm_config_argv)
const isRunningInDevMode = environment.original[1] === 'dev'

isRunningInDevMode ? console.log('Totem UI starting in Development Mode') : console.log('Totem UI starting in Production Mode')

// Handle https certificate and key
const certFileName = 'fullchain.pem'
const keyFileName = 'privkey.pem'

const devModeCertBasePath = './sslcert/'
// Todo make this dynamic for the host
const prodModeCertBasePath = '/etc/letsencrypt/live/totem.live/'

let certPath = devModeCertBasePath
let keyPath = devModeCertBasePath

if (!isRunningInDevMode) {
	certPath = prodModeCertBasePath
	keyPath = prodModeCertBasePath
}

certPath = certPath + certFileName
keyPath = keyPath + keyFileName

const options = {
	cert: fs.readFileSync(certPath),
	key: fs.readFileSync(keyPath)
}

// create main https app server
https.createServer(options, app).listen(httpsPort, () => console.log('\nApp https web server listening on port ', httpsPort))

// Chat server also running on https
const server = https.createServer(options, app)
const io = require('socket.io').listen(server)
const wsPort = 3001
let users = new Map()
const usersFile = './server/data/users.json'
const clients = new Map()
const isValidId = id => /^[a-z][a-z0-9]+$/.test(id)
const idMaxLength = 16
const msgMaxLength = 160
const idMinLength = 3

const findUserByClientId = clientId => mapFindByKey(users, 'clientIds', clientId)

// Error messages
const errMsgs = {
	idInvalid: `Only alpha-numeric characters allowed and must start with an alphabet`,
	idLength: `Must be between ${idMinLength} to ${idMaxLength} characters`,
	idExists: 'User ID already taken',
	msgLengthExceeds: `Maximum ${msgMaxLength} characters allowed`,
	loginFailed: 'Credentials do not match',
	loginOrRegister: 'Login/registration required'
}

/* 
 new
*/
import { faucetRequestHandler } from './faucetRequestHandler'
import { projectAddOrUpdate, projectUpdateStatus, projectsByHashes, projectsByWallets, projectsSearch } from './projects'
import { company, companySearch } from './companies'

io.on('connection', client => {
	client.on('disconnect', () => {
		clients.delete(client.id)
		const user = findUserByClientId(client.id)
		if (!user) return;
		const clientIdIndex = user.clientIds.findIndex(cid => cid === client.id)
		user.clientIds.splice(clientIdIndex, 1)
		console.info('Client disconnected: ', client.id)
		saveUsers()
	})

	client.on('message', (msg, callback) => {
		if (!msg) return; //ignore empty message
		const doCb = isFn(callback)
		if (msg.length > msgMaxLength) {
			return doCb && callback(errMsgs.msgLengthExceeds)
		}

		const sender = findUserByClientId(client.id)
		// Ignore message from logged out users
		if (!sender) return doCb && callback(errMsgs.loginOrRegister);
		emitter(client.id, 'message', [msg, sender.id])
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
			clients.set(client.id, client)
			saveUsers()
		} else {
			err = errMsgs.loginFailed
		}

		console.info('Login ' + (err ? 'failed' : 'success') + ' | ID:', userId, '| Client ID: ', client.id)
		isFn(callback) && callback(err)
	})
	
	client.on('faucet-request', faucetRequestHandler(client, emitter, findUserByClientId))

	// Project related handlers
	client.on('project', projectAddOrUpdate)
	client.on('project-status', projectUpdateStatus)
	client.on('projects', projectsByWallets)
	client.on('projects-by-hashes', projectsByHashes)
	client.on('projects-search', projectsSearch)

	client.on('company', company)
	client.on('company-search', companySearch)
})

const saveUsers = () => saveMapToFile(usersFile, users)
const saveMapToFile = (filepath, map) => {
	if (!isStr(filepath)) return console.log('Invalid file path', filepath);
	return fs.writeFile(
		filepath,
		JSON.stringify(Array.from(map.entries())),
		{ flag: 'w' },
		err => err && console.log(`Failed to save ${filepath}. ${err}`)
	)
}

// Broadcast message to all users except ignoreClientIds
const emitter = (ignoreClientIds, eventName, params) => {
	if (!isStr(eventName)) return;
	ignoreClientIds = Array.isArray(ignoreClientIds) ? ignoreClientIds : [ignoreClientIds]
	params = params || []
	params.splice(0, 0, eventName)
	for (const [_, iClient] of clients) {
		if (ignoreClientIds.indexOf(iClient.id) >= 0) continue; // ignore sender client
		// iClient.emit('message', msg, sender.id)
		iClient.emit.apply(iClient, params)
	}
}

// load all files required
var promises = [
	{ type: 'users', path: usersFile, saveFn: saveUsers },
].map(item => new Promise((resolve, reject) => {
	const { type, path, saveFn } = item
	if (!isStr(path)) return console.log('Invalid file path', path);
	console.info('Reading file', path)
	return fs.readFile(path, 'utf8', (err, data) => {
		// Create empty file if does already not exists 
		if (!!err) {
			console.log(path, 'file does not exist. Creating new file.')
			setTimeout(saveFn)
		} else {
			const map = new Map(JSON.parse(data || '[]'))
			switch (type) {
				case 'faucetRequests':
					faucetRequests = map
					break
				case 'users':
					users = map
					break
			}
		}
		resolve(true)
	})
}))
// Start chat server
Promise.all(promises).then(function (results) {
	server.listen(wsPort, () => console.log('\nChat app https Websocket listening on port ', wsPort))
}).catch(err => err && console.log('Promise error:', err)) 