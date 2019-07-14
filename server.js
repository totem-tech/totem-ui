import express from 'express'
import { resolve } from 'url';
import { isFn, isStr, isObj, objClean, objCopy } from './src/components/utils'

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
}).listen(httpPort, () => console.log('App http to https redirection listening on port ', httpPort));

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
https.createServer(options, app).listen(httpsPort, () => console.log('App https web server listening on port ', httpsPort))

// Chat server also running on https
const server = https.createServer(options, app)
const io = require('socket.io').listen(server)
const wsPort = 3001
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
const faucetRequestTimeLimit = 60 * 60 * 1000 // milliseconds
const findClientIndex = (user, clientId) => user.clientIds.findIndex(cid => cid === clientId)
const findUserByClientId = clientId => {
	for (let [_, user] of users.entries()) {
		if (user.clientIds.indexOf(clientId) >= 0) return user;
	}
}

const projectsFile = './projects.json'
let projects = new Map()
// mapFindByKey finds a specific object by supplied key and value 
const mapFindByKey = (map, key, value) => {
	for (let [_, item] of map.entries()) {
		if (item[key] === value) return item;
	}
}
// Simple full-text style partial search
const mapSearchByKey = (map, key, keyword) => {
	const result = new Map()
	for (let [itemKey, item] of map.entries()) {
		const value =  item[key]
		if (isStr(value) || isObj(value) ? value.indexOf(keyword) >= 0 : value === keyword) {
			result.set(itemKey, item)
		}
	}
	return result
}

// Error messages
const errMsgs = {
	fauceRequestLimitReached: `Maximum ${fauceRequstLimit} requests allowed within 24 hour period`,
	idInvalid: `Only alpha-numeric characters allowed and must start with an alphabet`,
	idLength: `Must be between ${idMinLength} to ${idMaxLength} characters`,
	idExists: 'User ID already taken',
	msgLengthExceeds: `Maximum ${msgMaxLength} characters allowed`,
	loginFailed: 'Credentials do not match',
	loginOrRegister: 'Login/registration required'
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
		if (!sender) return doCb && callback(errMsgs.loginOrRegister);
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
	})

	client.on('faucet-request', (address, callback) => {
		const doCb = isFn(callback)
		const user = findUserByClientId(client.id)
		if (!user) return doCb && callback(errMsgs.loginOrRegister)

		let userRequests = faucetRequests.get(user.id)

		userRequests = userRequests || []
		const numReqs = userRequests.length
		let fifthTS = (userRequests[numReqs - 5] || {}).timestamp
		fifthTS = fifthTS && typeof (fifthTS) === 'string' ? Date.parse(fifthTS) : fifthTS
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
		saveFaucetRequests()
		emit([], 'faucet-request', [user.id, address])
		doCb && callback()
	})

	// Create/update project
	client.on('project', (hash, project, callback) => {
		const doCb = isFn(callback)
		const requiredKeys = ['name', 'ownerAddress', 'description']
		const user = findUserByClientId(client.id)
		// Require login
		if (!user) return doCb && callback(errMsgs.loginOrRegister)

		// check if project contains all the required properties
		const invalid = !hash || !project || requiredKeys.reduce((invalid, key) => invalid || !project[key], false)
		if (invalid) return doCb && callback(
			'Project must contain all of the following properties: ' + 
			requiredKeys.join() + ' and an unique hash'
		)
		if (project.description.length > 160) {
			doCb && callback('Project description must not be more than 160 characters')
		}
		// exclude any unwanted data 
		project = objClean(project, requiredKeys)
		project.userId = user.id
		const existingProject = projects.get(hash)
		if(existingProject && existingProject.userId != user.id) {
			return doCb && callback('You are not allowed to update an existing project not owned by you')
		}
		
		// Add/update project
		projects.set(hash, objCopy(project, existingProject))
		saveProjects()
		doCb && callback(null, !!existingProject)
		client.emit('projects', mapSearchByKey(projects, 'userId', user.id))
	})

	// user projects
	client.on('projects', callback => {
		if (!isFn(callback)) return
		const user = findUserByClientId(client.id)
		if (!user) return callback(errMsgs.loginOrRegister)
		callback(null, mapSearchByKey(projects, 'userId', user.id))
	})

	// search all projects
	client.on('project-search', (keyword, key, callback) => {
		if (!isFn(callback)) return
		callback('Not implemented')
		// const user = findUserByClientId(client.id)
		// if (!user) return callback(errMsgs.loginOrRegister)
		// callback('', mapSearchByKey(projects, key, keyword))
	})
})

// Load user data from json file
fs.readFile(usersFile, (err, data) => {
	// File doesn't exists. Create new file
	if (err) {
		saveUsers()
	} else {
		// Load existing user list
		users = new Map(JSON.parse(data))
	}

	server.listen(wsPort, () => console.log('Chat app https Websocket listening on port ', wsPort))
})

const saveUsers = () => saveMapToFile(usersFile, users)
const saveFaucetRequests = () => saveMapToFile(faucetRequestsFile, faucetRequests)
const saveProjects = () => saveMapToFile(projectsFile, projects)
const saveMapToFile = (file, map) => {
	file && fs.writeFile(
		file,
		JSON.stringify(Array.from(map.entries())),
		{ flag: 'w' },
		err => err && console.log(`Failed to save ${file}. ${err}`)
	)
}

// Broadcast message to all users except ignoreClientIds
const emit = (ignoreClientIds, eventName, params) => {
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
	{type: 'users', path: usersFile, saveFn: saveUsers},
	{type: 'faucetRequests', path: faucetRequestsFile, saveFn: saveFaucetRequests},
	{type: 'projects', path: projectsFile, saveFn: saveProjects},
].map(item => new Promise((_, resove, reject) => {
	const { type, path, saveFn } = item
	fs.readFile(path, 'utf8', (err, data) => {
		console.info('Reading file', path)
		// Create empty file if does already not exists 
		if(err) return resolve(saveFn())
		const map = new Map(JSON.parse(data || '[]'))
		switch(type) {
			case 'users':
				users = map
				break
			case 'faucetRequests':
				faucetRequests = map
				break
			case 'projects':
				projects = map
				break
		}
		resove(true)
	})
}))
// Start chat server
Promise.all(promises).then(function(results){
	server.listen(wsPort, () => console.log('Chat app https Websocket listening on port ', wsPort))
}, (er)=> {}) 