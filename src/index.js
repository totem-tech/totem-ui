import React from 'react'
import { render } from 'react-dom'
import 'semantic-ui-css/semantic.min.css'
import '../public/styles.css'
import './utils/log'
import { rxIsRegistered } from './utils/chatClient'
import PromisE from './utils/PromisE'
import storage from './utils/storageHelper'
import { subjectAsPromise } from './utils/reactjs'
import { generateHash, isArrLike, isError } from './utils/utils'
import App from './App'
import NewsletterSignup from './forms/NewsletterSignup'
// services
import { getConnection } from './services/blockchain'
import client from './utils/chatClient'
import './services/language'
import { fetchNSaveTexts } from './utils/languageHelper'
import { getUrlParam, MOBILE, rxLayout } from './services/window'
import { setupDefaults } from './components/Message'

const urlParams = getUrlParam()
const isSignUp = urlParams.hasOwnProperty('NewsletterSignup')
const debug = getUrlParam('debug').toLowerCase()
window.isDebug = debug === 'force'
	|| (debug === 'true' && rxLayout.value === MOBILE)
window.isInIFrame = isSignUp
if (!window.isInIFrame && window.isDebug) {
	// for debugging purposes only, when on a mobile device
	// adds interceptors to below console functions and prints all logs into a DOM element above page contents
	const loggers = [
		['log', console.log],
		['info', console.info, 'teal'],
		['error', console.error, 'red'],
		['trace', console.error, 'blue'],
		['warn', console.warn, 'orange'],
	]
	document.body.insertAdjacentHTML(
		'afterbegin',
		'<div id="error-container" style="height: auto;max-height:200px;width:100%;overflow-y:auto;"></div>'
	)
	loggers.forEach(([key, fn, color = '']) => {
		console[key] = (...args) => {
			fn.apply(console, args)
			const errContainer = document.getElementById('error-container')
			let content = args
				.map(x => {
					let str = x
					try {
						str = isError(x)
							? x.stack
							: JSON.stringify(
								isArrLike(x) ? Array.from(x) : x,
								null,
								4
							)
					} catch (e) {
						// in case of Object circular dependency
						str = `${x}`
					}
					return `${str}`.replace(/\\n/g, '<br />')
				})
				.join(' ')
			const style = `white-space:pre-wrap;margin:0;padding:5px 15px;border-bottom:1px solid #ccc;color:${color}`
			content = `<pre style="${style}">${content}</pre>`
			errContainer.insertAdjacentHTML('afterbegin', content)
		}
	})
}

const initPromise = PromisE.timeout((resolve, reject) => {
	// setup Message component
	setupDefaults('semantic-ui-react', require('semantic-ui-react'))
	// initiate connection to blockchain
	getConnection()
	let countriesHash = generateHash(
		Array.from(storage.countries.getAll()),
		'blake2',
		256
	)
	let translationChecked, countriesChecked
	client.onConnect(async () => {
		// Retrieve a list of countries and store in the browser local storage
		client.countries(countriesHash, (err, countries) => {
			countriesChecked = true
			if (err || countries.size === 0) return

			storage.countries.setAll(countries, true)
			countriesHash = generateHash(Array.from(countries), 'blake2', 256)
			console.log('Countries list updated', countries)
		})

		// check and update selected language texts
		if (translationChecked) return
		try {
			await fetchNSaveTexts(client)
			translationChecked = true
			resolve()
		} catch (err) {
			console.log('Language translations check failed:', err)
			reject() // continue on rendering the application
		}
	})
}, 3000)

const doRender = () => {
	if (isSignUp) {
		const El = NewsletterSignup
		document.body.classList.add('iframe')
		render(<El />, document.getElementById('app'))
		return
	}
	render(<App />, document.getElementById('app'))
}

initPromise.then(doRender).catch(doRender)

// after registration is complete remove the "unregistered" class
subjectAsPromise(rxIsRegistered, true)[0].then(() =>
	document.body.classList.remove('unregistered')
)
