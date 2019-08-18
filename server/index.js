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
let faucetRequests = new Map()
const faucetRequestsFile = './server/data/faucet-requests.json'
const fauceRequstLimit = 5
const faucetRequestTimeLimit = 60 * 60 * 1000 // milliseconds
const projectsFile = './server/data/projects.json'
let projects = new Map()
const companiesFile = './server/data/companies.json'
let companies = new Map()

const findUserByClientId = clientId => mapFindByKey(users, 'clientIds', clientId)

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

/* 
 new
*/
import { faucetRequestHandler } from './faucetRequestHandler'

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
	// client.on('faucet-request', (address, callback) => {
	// 	const doCb = isFn(callback)
	// 	const user = findUserByClientId(client.id)
	// 	if (!user) return doCb && callback(errMsgs.loginOrRegister)

	// 	let userRequests = faucetRequests.get(user.id)

	// 	userRequests = userRequests || []
	// 	const numReqs = userRequests.length
	// 	let fifthTS = (userRequests[numReqs - 5] || {}).timestamp
	// 	fifthTS = fifthTS && typeof (fifthTS) === 'string' ? Date.parse(fifthTS) : fifthTS
	// 	if (numReqs >= fauceRequstLimit && Math.abs(new Date() - fifthTS) < faucetRequestTimeLimit) {
	// 		// prevents adding more than maximum number of requests within the given duration
	// 		return doCb && callback(errMsgs.fauceRequestLimitReached, fifthTS)
	// 	}

	// 	userRequests.push({
	// 		address,
	// 		timestamp: new Date(),
	// 		funded: false
	// 	})

	// 	if (numReqs >= faucetRequestTimeLimit) {
	// 		userRequests = userRequests.slice(numReqs - faucetRequestTimeLimit)
	// 	}
	// 	faucetRequests.set(user.id, userRequests)
	// 	saveFaucetRequests()
	// 	emit([], 'faucet-request', [user.id, address])
	// 	doCb && callback()
	// })

	// Create/update project
	client.on('project', (hash, project, create, callback) => {
		const doCb = isFn(callback)
		const existingProject = projects.get(hash)
		if (create && !!existingProject) {
			return doCb && callback('Project already exists. Please use a different owner address and/or name')
		}

		// check if project contains all the required properties
		const requiredKeys = ['name', 'ownerAddress', 'description']
		// All the acceptable keys
		const validKeys = [...requiredKeys, 'status']
		const invalid = !hash || !project || requiredKeys.reduce((invalid, key) => invalid || !project[key], false)
		if (invalid) return doCb && callback(
			'Project must contain all of the following properties: ' +
			requiredKeys.join() + ' and an unique hash'
		)
		if (project.description.length > 160) {
			doCb && callback('Project description must not exceed 160 characters')
		}
		// exclude any unwanted data 
		project = objCopy(objClean(project, validKeys), existingProject, true)
		project.status = isValidNumber(project.status) ? project.status : 0
		project.tsCreated = project.createdAt || new Date()

		// Add/update project
		projects.set(hash, project)
		saveProjects()
		doCb && callback(null)
		console.log(`Project ${create ? 'created' : 'updated'}: ${hash}`)
	})

	// update project status
	// Statuses:
	// 0 : open
	// 1 : reopened
	// 2 : closed
	// 99: deleted
	client.on('project-status', (hash, status, callback) => {
		if (!isFn(callback)) return;
		const project = projects.get(hash)
		if (!project) return callback('Project not found');
		console.log('Status update: ', hash, project.status, '>>', status)
		project.status = status
		projects.set(hash, project)
		saveProjects()
		callback()
	})

	// user projects by list of wallet addresses
	// Params
	// @walletAddrs	array
	// @callback	function: 
	//						Params:
	//						@err	string, 
	//						@result map, 
	client.on('projects', (walletAddrs, callback) => {
		if (!isFn(callback)) return;
		if (!isArr(walletAddrs)) return callback('Array of wallet addresses required')
		// Find all projects by supplied addresses and return Map
		const result = walletAddrs.reduce((res, address) => (
			mapCopy(mapSearch(projects, { ownerAddress: address }), res)
		), new Map())
		callback(null, result)
	})

	// user projects by list of project hashes
	// Params
	// @hashArr	array
	// @callback	function: 
	//						Params:
	//						@err	string, 
	//						@result map, 
	client.on('projects-by-hashes', (hashArr, callback) => {
		if (!isFn(callback)) return;
		if (!isArr(hashArr)) return callback('Array of project hashes required')
		const hashesNotFound = new Array()
		// Find all projects by supplied hash and return Map
		const result = hashArr.reduce((res, hash) => {
			const project = projects.get(hash)
			!!project ? res.set(hash, project) : hashesNotFound.push(hash)
			return res
		}, new Map())
		callback(null, result, hashesNotFound)
	})

	// search all projects
	client.on('project-search', (keyword, key, callback) => {
		if (!isFn(callback)) return
		callback('Not implemented')
		// const user = findUserByClientId(client.id)
		// if (!user) return callback(errMsgs.loginOrRegister)
		// callback('', mapSearch(projects, ....))
	})

	// add/get company by walletAddress
	client.on('company', (walletAddress, company, callback) => {
		if (!isFn(callback)) return console.log('no callback');
		if (!isObj(company)) {
			company = companies.get(walletAddress)
			return callback(!company ? 'Company not found' : company)
		}
		// required keys
		const keys = ['country', 'name', 'registrationNumber', 'walletAddress']
		// make sure all the required keys are supplied
		if (keys.reduce((invalid, key) => invalid || !hasValue(company[key]), !walletAddress)) {
			return callback('Company must be a valid object and contain the following: ' + keys.join())
		}
		const { country, name, registrationNumber } = company
		// Check if company with wallet address already exists
		if (!!companies.get(walletAddress)) {
			return callback('Wallet address is already associated with a company')
		}
		// check if company with combination of name, registration number and country already exists
		// PS: same company name can have different registration number in different countries
		if (mapSearch(companies, { name, registrationNumber, country }, true, true, true).size > 0) {
			return callback('Company already exists')
		}

		console.log('Company created: ', JSON.stringify(company))
		delete company.walletAddress;
		companies.set(walletAddress, company)
		callback()
		saveCompanies()
	})

	// Find companies by key-value pair(s)
	client.on('company-search', (keyValues, callback) => {
		if (!isFn(callback)) return;
		const keys = ['name', 'walletAddress', 'registrationNumber', 'country']
		keyValues = objClean(keyValues, keys)
		if (Object.keys(keyValues).length === 0) {
			return callback('Please supply one or more of the following keys: ' + keys.join())
		}

		callback(null, mapSearch(companies, keyValues))
	})
})

const saveCompanies = () => saveMapToFile(companiesFile, companies)
const saveFaucetRequests = () => saveMapToFile(faucetRequestsFile, faucetRequests)
const saveProjects = () => saveMapToFile(projectsFile, projects)
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
	{ type: 'companies', path: companiesFile, saveFn: saveCompanies },
	{ type: 'faucetRequests', path: faucetRequestsFile, saveFn: saveFaucetRequests },
	{ type: 'projects', path: projectsFile, saveFn: saveProjects },
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
				case 'companies':
					companies = map
					break
				case 'faucetRequests':
					faucetRequests = map
					break
				case 'projects':
					projects = map
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