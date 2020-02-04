import express from 'express'
import http from 'http'
import https from 'https'
import fs from 'fs'
let app = express()

// Reverse Proxy config
// HTTPS_PORT _must not_ be 443 if it is behind a reverse proxy
const HTTPS_PORT = process.env.HTTPS_PORT || 443
// for 
const SUBDOMAIN = process.env.SUBDOMAIN


const EXECUTION_MODE = process.env.EXECUTION_MODE || 'dev'

// Uncomment this block if you are not using a reverse proxy
// This is commented as we are running a dev nodejs instance on the same server as a production instance (for testing)
// We require a reverse proxy to certificate issues hence this is not needed.

// ******************** //
const HTTP_PORT = process.env.HTTP_PORT || 80
// set up plain http server and have it listen on port 80 to redirect to https 
http.createServer(function (req, res) {
	res.writeHead(307, { "Location": "https://" + req.headers['host'] + req.url });
	res.end();
}).listen(HTTP_PORT, () => console.log('\nApp http to https redirection listening on port ', HTTP_PORT));
// ******************* //

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

// in case there is a subDomain
const subDomainDot = SUBDOMAIN ? '.' : ''

// Todo make this dynamic for the host
const prodModeCertBasePath = '/etc/letsencrypt/live/' + SUBDOMAIN + subDomainDot + 'totem.live/'

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