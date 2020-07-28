import React from 'react'
import { render } from 'react-dom'
import 'semantic-ui-css/semantic.min.css'
import { setDefaultConfig } from './utils/polkadotHelper'
import { generateHash } from './utils/utils'
import { App } from './app.jsx'
// services
import { getTypes, nodes, setConfig, getConnection } from './services/blockchain'
import client from './services/chatClient'
import { getSelected, getTexts, setTexts } from './services/language'
import storage from './services/storage'

const init = () => new Promise((resolve, reject) => {
    // set denomnination info
    setConfig()

    const countries = storage.countries.getAll()
    const countriesHash = generateHash(countries)
    let hasCountries = countries.size > 0
    let translationChecked = false
    client.onConnect(() => {
        // Retrieve a list of countries and store in the browser local storage
        !hasCountries && client.countries(countriesHash, (_, countries) => {
            countries && storage.countries.setAll(countries)
            hasCountries = true
        })

        // check and update selected language texts
        if (translationChecked) return
        const EN = 'EN'
        const engHash = generateHash(getTexts(EN))
        const selected = getSelected()
        const selectedHash = selected !== EN && generateHash(getTexts(selected) || '')
        // retrieve list of application texts in English
        client.languageTranslations(EN, engHash, (err, texts) => {
            if (err) return console.log('Language check failed:', EN, { texts }) | resolve()
            // update english text list
            if (texts !== null) setTexts(EN, texts)
            if (!selectedHash) {
                translationChecked = true
                resolve()
                return
            }
            // retrieve list of application texts in selected language, if not English
            client.languageTranslations(selected, selectedHash, (err, texts) => {
                if (err) return console.log('Language check failed:', selected, { texts }) | resolve()
                if (texts !== null) setTexts(selected, texts)
                translationChecked = true
                resolve()
            })
        })
    })

    // set Polkadot blockchain types
    getTypes().then(types =>
        setDefaultConfig(nodes, types) | getConnection()
    )

    // force resolve in case messaging service is not connected yet
    setTimeout(() => resolve(), 2000)
})

init().then(() => render(<App />, document.getElementById('app')))

