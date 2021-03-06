import React from 'react'
import { render } from 'react-dom'
import { Loader } from 'semantic-ui-react'
import 'semantic-ui-css/semantic.min.css'
import PromisE from './utils/PromisE'
import { isArrLike, isError, objClean } from './utils/utils'
import App from './App'
import NewsletterSignup from './forms/NewsletterSignup'
// services
import { getConnection } from './services/blockchain'
import client from './modules/chat/ChatClient'
import { fetchNSaveTexts } from './services/language'
import storage from './services/storage'
import { getUrlParam, MOBILE, rxLayout } from './services/window'

const urlParams = getUrlParam()
const isSignUp = urlParams.hasOwnProperty('NewsletterSignup')
const debug = getUrlParam('debug').toLowerCase()
window.isDebug = debug === 'force'
    || debug === 'true'
    && rxLayout.value === MOBILE
window.isInIFrame = isSignUp
if (!window.isInIFrame && window.isDebug) {
    // for debugging purposes only, when on a mobile device
    // adds interceptors to below console functions and prints all logs into a DOM element above page contents
    const loggers = [
        ['log', console.log],
        ['info', console.info, 'teal'],
        ['error', console.error, 'red'],
        ['warn', console.warn, 'orange']
    ]
    document.body.insertAdjacentHTML(
        'afterbegin',
        '<div id="error-container" style="height: auto;max-height:200px;width:100%;overflow-y:auto;"></div>'
    )
    loggers.forEach(([key, fn, color = '']) => {
        console[key] = (...args) => {
            fn.apply(console, args)
            const errContainer = document.getElementById('error-container')
            let content = args.map(x => {
                let str = x
                try {
                    str = isError(x)
                        ? x.stack
                        : typeof x !== 'object'
                            ? x
                            : JSON.stringify(
                                isArrLike(x) ? Array.from(x) : x,
                                null,
                                4,
                            )
                } catch (e) {
                    // in case of Object circular dependency
                    str = `${x}`
                }
                return str.replace(/\\n/g, '<br />')
            }).join(' ')
            const style = `white-space:pre-wrap;margin:0;padding:5px 15px;border-bottom:1px solid #ccc;color:${color}`
            content = `<pre style="${style}">${content}</pre>`
            errContainer.insertAdjacentHTML('afterbegin', content)
        }
    })
}

const initPromise = PromisE.timeout((resolve, reject) => {
    // initiate connection to blockchain
    getConnection()
    const countries = storage.countries.getAll()
    let countriesSaved = countries.size > 0
    let translationChecked = false
    client.onConnect(async () => {
        // Retrieve a list of countries and store in the browser local storage
        !countriesSaved && client.countries(null, (err, countries) => {
            if (err) return
            // get rid of unwanted properties
            countries = new Map(Array.from(countries)
                .map(([id, country]) => [id, objClean(country, ['code', 'name'])])
            )
            storage.countries.setAll(countries)
            countriesSaved = true
        })

        // check and update selected language texts
        if (translationChecked) return
        try {
            await fetchNSaveTexts()
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

// show loading spinner if it takes longer than 100ms to initialize
PromisE.timeout(initPromise, 100)
    .catch(() => {
        const styleCenter = {
            top: 'calc( 50% - 29px )',
            left: 'calc( 50% - 29px )',
            position: 'fixed',
        }
        const loader = <Loader active style={styleCenter}>Loading...</Loader>
        render(loader, document.getElementById('app'))
    })
initPromise
    .then(doRender)
    .catch(doRender)