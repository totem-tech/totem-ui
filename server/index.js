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
// value set in `webpack --mode`. Expected value: 'production' or 'developement'
const mode = process.env.NODE_ENV
const isProd = mode === 'production'

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

/*
 * Automate building list of files for translation
 */
const src = './src'
const exts = ['js', 'jsx']
const exclude = [
	'./src/assets',
	'./src/legacies',
	'./src/utils',
]
const destFile = './src/services/languageFiles.js'
const getPaths = async (dir, extensions, exclude = []) => {
	let result = []
	if (exclude.includes(dir)) return []
	if (!isDir(dir)) return [dir]

	const files = fs.readdirSync(dir)
	for (let i = 0; i < files.length; i++) {
		result.push(await getPaths(
			`${dir}/${files[i]}`,
			extensions,
			exclude,
		))
	}

	return result.flat().filter(hasExtension(extensions))
}
const isDir = path => fs.lstatSync(path).isDirectory()
const hasExtension = (extensions = []) => (path = '') => {
	if (!path) return false
	for (let i = 0; i < extensions.length; i++) {
		if (path.endsWith(extensions[i])) return true
	}
	return false
}
!isProd && getPaths(src, exts, exclude).then(files => {
	const fileContents = `export default ${JSON.stringify(files, null, 4)}`
	// create a js file that exports the files array 
	fs.writeFileSync(destFile, fileContents)
})