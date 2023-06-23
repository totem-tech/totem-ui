import React from 'react'
import { render } from 'react-dom'
import 'semantic-ui-css/semantic.min.css'
import '../public/styles.css' // global styles
import './utils/log' // setup debug logger // keep it above all non-NPM imports
import NewsletterSignup from './forms/NewsletterSignup'
import './services/language' // setup language for build mode 
import { getConnection } from './services/blockchain'
import client, { rxIsInMaintenanceMode, rxIsRegistered } from './utils/chatClient'
import PromisE from './utils/PromisE'
import { subjectAsPromise } from './utils/reactjs'
import storage from './utils/storageHelper'
import {
	generateHash,
	isArrLike,
	isError,
} from './utils/utils'
import { fetchNSaveTexts } from './utils/languageHelper'
import { setupDefaults } from './utils/reactjs'
import {
	getUrlParam,
	MOBILE,
	rxLayout,
} from './utils/window'
import App from './App'

// setup common components to use Semantic UI (where applicable)
setupDefaults('semantic-ui-react', require('semantic-ui-react'))

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
	// initiate connection to blockchain
	getConnection()
	let countriesHash = generateHash(
		Array.from(storage.countries.getAll()),
		'blake2',
		256
	)
	let translationChecked, countriesChecked
	client.onConnect(async () => {
		await PromisE.delay(100)
		await subjectAsPromise(rxIsInMaintenanceMode, false)[0]
		// Retrieve a list of countries and store in the browser local storage
		const countries = await client
			.countries(countriesHash)
			.catch(() => null) // retrieve failed. retry on reconnect
		if (countries !== null) {
			countriesChecked = true
			if (countries.size === 0) return

			storage.countries.setAll(countries, true)
			countriesHash = generateHash(Array.from(countries), 'blake2', 256)
			console.log('Countries list updated', countries)
		}

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
