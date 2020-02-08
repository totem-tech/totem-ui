import React from 'react'
import { render } from 'react-dom'
import { App } from './app.jsx'
import { setNodeUri } from 'oo7-substrate'
import { getTypes, nodes, setConfig } from './services/blockchain'
import 'semantic-ui-css/semantic.min.css'
import client from './services/chatClient'
import { getSelected, getTexts, setTexts } from './services/language'
import storage from './services/storage'
import { setDefaultConfig } from './utils/polkadotHelper'
import { generateHash } from './utils/utils'


const init = () => new Promise((resolve, reject) => {
    // set denomnination info
    setConfig()
    // set node URLs
    setNodeUri(nodes)

    let hasCountries = storage.countries.getAll().size > 0
    let translationChecked = false
    client.onConnect(() => {
        // Retrieve a list of countries and store in the browser local storage
        !hasCountries && client.countries((_, countries) => {
            storage.countries.setAll(countries)
            hasCountries = true
        })

        // check and update selected language texts
        if (translationChecked) return
        const EN = 'EN'
        const engHash = generateHash(getTexts(EN))
        const selected = getSelected()
        const selectedHash = selected !== EN && generateHash(getTexts(selected) || '')
        client.translations(EN, engHash, (err, texts) => {
            if (err) return console.log('Language check failed:', EN, { texts }) | resolve()
            // update english text list
            if (texts !== null) setTexts(EN, texts)
            if (!selectedHash) {
                translationChecked = true
                resolve()
                return
            }
            client.translations(selected, selectedHash, (err, texts) => {
                if (err) return console.log('Language check failed:', selected, { texts }) | resolve()
                if (texts !== null) setTexts(selected, texts)
                translationChecked = true
                resolve()
            })
        })
    })
    getTypes().then(types => setDefaultConfig(nodes, types))
    // force resolve in case messaging service is not connected yet
    setTimeout(resolve, 2000)
})

init().then(() => render(<App />, document.getElementById('app')))

