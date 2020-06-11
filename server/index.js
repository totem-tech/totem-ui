import express from 'express'
import http from 'http'
import https from 'https'
import fs from 'fs'
import compression from 'compression'
const app = express()
// Reverse Proxy config
// HTTPS_PORT _must not_ be 443 if it is behind a reverse proxy
const HTTPS_PORT = process.env.HTTPS_PORT || 443
const HTTP_PORT = process.env.HTTP_PORT || 80
// SSL certificate file paths
const certPath = process.env.CertPath || './sslcert/fullchain.pem'
const keyPath = process.env.KeyPath || './sslcert/privkey.pem'
// indicates whether or not reverse proxy is used
const REVERSE_PROXY = process.env.REVERSE_PROXY === 'TRUE'
const npmEnv = JSON.parse(process.env.npm_config_argv)
// value set in `webpack --mode`. Expected value: 'production' or 'developement'
const mode = npmEnv.original[1]

// compress all responses
app.use(compression())

// Serve 'dist' directory
app.use(express.static('dist'))

if (!REVERSE_PROXY) {
	// when reverse proxy is used this is not needed.
	// set up plain http server and have it listen on port 80 to redirect to https 
	http.createServer(function (req, res) {
		res.writeHead(307, { "Location": "https://" + req.headers['host'] + req.url })
		res.end()
	}).listen(HTTP_PORT, () => console.log('\nApp http to https redirection listening on port ', HTTP_PORT))
}

console.log(`Totem UI starting in ${mode.toUpperCase()} mode`)

// create main https app server 
https.createServer({
	cert: fs.readFileSync(certPath),
	key: fs.readFileSync(keyPath)
}, app).listen(HTTPS_PORT, () => console.log('\nApp https web server listening on port ', HTTPS_PORT))