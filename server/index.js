const express = require('express')
const http = require('http')
const https = require('https')
const fs = require('fs')
const compression = require('compression')
const { spawnSync } = require('child_process')

const app = express()
const APP_NAME = process.env.APP_NAME || 'Totem UI'
const DIST_DIR = process.env.DIST_DIR || 'dist'
const GENERATE_LIST = process.env.GENERATE_LIST !== 'FALSE'
// Reverse Proxy config
// HTTPS_PORT _must not_ be 443 if it is behind a reverse proxy
const HTTPS_PORT = process.env.HTTPS_PORT || 443
const HTTP_PORT = process.env.HTTP_PORT || 80
// SSL certificate file paths
const certPath = process.env.CertPath || './sslcert/fullchain.pem'
const keyPath = process.env.KeyPath || './sslcert/privkey.pem'
// indicates whether or not reverse proxy is used
const REVERSE_PROXY = process.env.REVERSE_PROXY === 'TRUE'
const HTTP_REDIRECT = process.env.HTTP_REDIRECT !== 'FALSE'
// value set in `webpack --mode`. Expected value: 'production' or 'developement'
const mode = process.env.NODE_ENV
// const isProd = mode === 'production'
const pullEndpoints = process.env.GIT_PULL_ENDPOINTS
const secondaryPages = (process.env.PAGES || '')
	.split(',')
	.filter(Boolean)
	.map(x => x.trim().split(':'))

// compress all responses
app.use(compression())

// Serve 'dist' directory
app.use('/', express.static(DIST_DIR))

// parse request body as application/json
app.use(express.json())

secondaryPages
	.forEach(([urlPath, distPath]) =>
		urlPath && app.use(
			`${urlPath.startsWith('/') ? '' : '/'}${urlPath}`,
			express.static(distPath),
		)
	)

if (!REVERSE_PROXY) {
	// when reverse proxy is used this is not needed.
	// set up plain http server and have it listen on port 80 to redirect to https 
	let cbRedirect = function (req, res) {
		res.writeHead(307, {
			Location: `https://${req.headers['host']}${req.url}`
		})
		res.end()
	}
	let httpApp = undefined
	if (!HTTP_REDIRECT) {
		cbRedirect = undefined
		httpApp = app
	}
	http.createServer(cbRedirect, httpApp)
		.listen(HTTP_PORT, () =>
			console.log(
				`\nApp http${HTTP_REDIRECT ? ' to https redirection' : ''} listening on port `,
				HTTP_PORT,
			)
		)
}

console.log(`${APP_NAME} starting in ${mode.toUpperCase()} mode`)

// create main https app server 
const serverApp = https.createServer(
	{
		cert: fs.readFileSync(certPath),
		key: fs.readFileSync(keyPath)
	},
	app
)
serverApp.listen(
	HTTPS_PORT,
	() => console.log('\nApp https web server listening on port ', HTTPS_PORT)
)

const executeCmd = async (cmd, args) => {
	const result = spawnSync(cmd, args)
	const { error, stderr } = result
	const err = error
		? error.message
		: '' //stderr.toString()
	if (err) throw new Error(err.replace('Error: ', ''))
	return result
}


const setupPullEndpoints = () => {
	const endpoints = (pullEndpoints || '')
		.split(',')
		.map(x => x.trim())
		.filter(Boolean)
	if (!endpoints.length) return

	for (let endpoint of endpoints) {
		endpoint = endpoint.split(':')
		let [
			pullURLSuffix,
			pullSecret,
			pullBaseDir = '~/',
		] = endpoint
		// projects valid for this endpoint configuration
		const projects = endpoint
			.slice(3)
			.filter(Boolean)

		const pullUrl = `/pull/${pullURLSuffix}`
		// hash the secret for github
		const handlePull = async (request, response, next) => {
			try {
				let valid
				const githubSecret = request.header('X-Hub-Signature-256')
				if (!!githubSecret) {
					valid = verifySignature(pullSecret, githubSecret, request.body)
					if (!valid) throw new Error('Invalid secret')
				}

				const gitlabToken = request.header('X-Gitlab-Token')
				if (!valid && pullSecret !== gitlabToken) throw new Error('Invalid token')

				const project = typeof request.query === 'function'
					? request.query('project')
					: request.query['project']
				const dir = `${pullBaseDir}${project}`
				valid = !projects.length || projects.includes(project)
				if (!valid || !fs.existsSync(dir)) throw new Error(`Invalid project: ${project}`)

				const result = await executeCmd('git', ['-C', dir, 'pull'])
				console.log(new Date().toISOString(), `[PullResult] [${project}] ${result.stdout.toString()}`)
				response.json({ success: true })
			} catch (err) {
				console.log(new Date().toISOString(), '[PullError]', err.message)
				response.json({
					error: err
						.message
						.replace('Error: ', ''),
					success: false,
				})
			}
		}
		app.post(pullUrl, handlePull)
		console.log('Listening for GIT webhooks on', pullUrl)
	}
}
setupPullEndpoints()

GENERATE_LIST && require('./generateFilesList')

async function verifySignature(secret, header, payload) {
	let encoder = new TextEncoder()
	let parts = header.split('=')
	let sigHex = parts[1]

	let algorithm = {
		name: 'HMAC',
		hash: { name: 'SHA-256' },
	}

	let keyBytes = encoder.encode(secret)
	let extractable = false
	let key = await crypto.subtle.importKey(
		'raw',
		keyBytes,
		algorithm,
		extractable,
		['sign', 'verify'],
	)

	let sigBytes = hexToBytes(sigHex)
	let dataBytes = encoder.encode(payload)
	let equal = await crypto.subtle.verify(
		algorithm.name,
		key,
		sigBytes,
		dataBytes,
	)

	return equal
}

function hexToBytes(hex) {
	let len = hex.length / 2
	let bytes = new Uint8Array(len)

	let index = 0
	for (let i = 0;i < hex.length;i += 2) {
		let c = hex.slice(i, i + 2)
		let b = parseInt(c, 16)
		bytes[index] = b
		index += 1
	}

	return bytes
}