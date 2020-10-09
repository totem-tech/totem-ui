import React from 'react'
import { render } from 'react-dom'
import 'semantic-ui-css/semantic.min.css'
import PromisE from './utils/PromisE'
import { generateHash, isObj, isStr } from './utils/utils'
import App from './App'
import NewsletterSignup from './forms/NewsletterSignup'
// services
import { getConnection } from './services/blockchain'
import client from './modules/chat/ChatClient'
import { fetchNSaveTexts } from './services/language'
import storage from './services/storage'
import { getUrlParam } from './services/window'

const isSignUp = getUrlParam('NewsletterSignup').toLowerCase() === 'true'
const isDebug = getUrlParam('debug').toLowerCase() === 'true'
window.isInIFrame = isSignUp || true
if (isDebug) {
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
                    str = isStr(x) ? x : isObj(x) && x.stack || JSON.stringify(x, null, 4)
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

const init = () => PromisE.timeout((resolve, reject) => {
    const countries = storage.countries.getAll()
    let hasCountries = countries.size > 0
    let translationChecked = false
    client.onConnect(async () => {
        // Retrieve a list of countries and store in the browser local storage
        !hasCountries && client.countries(generateHash(countries), (_, countries) => {
            countries && storage.countries.setAll(countries)
            hasCountries = true
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
}, 2000)
const doRender = () => {
    if (isSignUp) {
        render(<NewsletterSignup />, document.getElementById('app'))
        setTimeout(() => document.querySelector('body').classList.add('iframe'), 100)
        return
    }
    render(<App />, document.getElementById('app'))
}

// initiate connection to blockchain
getConnection()
init().then(doRender).catch(doRender)
