import React from 'react'
import { render } from 'react-dom'
import 'semantic-ui-css/semantic.min.css'
import { generateHash } from './utils/utils'
import { App } from './app.jsx'
// services
import { getConnection } from './services/blockchain'
import client from './services/chatClient'
import { fetchNSaveTexts } from './services/language'
import storage from './services/storage'
import PromisE from './utils/PromisE'

const init = () => new Promise((resolve, reject) => {
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

    // set Polkadot blockchain types and initiate connection to blockchain
    getConnection()
})
const doRender = () => render(<App />, document.getElementById('app'))

PromisE.timeout(init(), 2000)
    .then(doRender)
    // force resolve in case messaging service is not connected yet
    .catch(doRender)

