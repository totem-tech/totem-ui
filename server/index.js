import express from 'express'
import http from 'http'
import https from 'https'
import fs from 'fs'
import { initChatServer } from './chatServer'
let app = express()

const HTTP_PORT = process.env.HTTP_PORT || 80
const HTTPS_PORT = process.env.HTTPS_PORT || 443
const SUBDOMAIN = process.env.SUBDOMAIN || ''
const EXECUTION_MODE = process.env.EXECUTION_MODE || 'dev'
const CHAT_SERVER_PORT = process.env.CHAT_SERVER_PORT || 3001

// set up plain http server and have it listen on port 80 to redirect to https 
http.createServer(function (req, res) {
	// printHostData = process.env.printSensitiveData === "YES"
	// 	if (printHostData) {
	// 		console.log("Host : ", req.headers['host'])
	// 		console.log("URL : ", req.url)
	// 	}
	res.writeHead(307, { "Location": "https://" + SUBDOMAIN + '.' + req.headers['host'] + req.url });
	res.end();
}).listen(HTTP_PORT, () => console.log('\nApp http to https redirection listening on port ', HTTP_PORT));

app.use(express.static('dist'))

// The following code is a workaround for webpack mode which is currently broken
// Webpack mode would determine the development or production execution.
// Instead we are having to interrogate the execution script to determine which was called
let environment = JSON.parse(process.env.npm_config_argv)
const isRunningInDevMode = environment.original[1] === EXECUTION_MODE

isRunningInDevMode ? console.log('Totem UI starting in Development Mode') : console.log('Totem UI starting in Production Mode')

// Handle https certificate and key
const certFileName = 'fullchain.pem'
const keyFileName = 'privkey.pem'

const devModeCertBasePath = './sslcert/'
// Todo make this dynamic for the host
const prodModeCertBasePath = '/etc/letsencrypt/live/' + SUBDOMAIN + '.totem.live/'

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
https.createServer(options, app).listen(HTTPS_PORT, () => console.log('\nApp https web server listening on port ', HTTPS_PORT))

// Start chat & data server
initChatServer(options, app, CHAT_SERVER_PORT)