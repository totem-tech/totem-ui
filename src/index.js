import React from 'react'
import { render } from 'react-dom'
import { App } from './app.jsx'
import { setNodeUri } from 'oo7-substrate'
import { getTypes, nodes, setConfig } from './services/blockchain'
import 'semantic-ui-css/semantic.min.css'
import client from './services/chatClient'
import storage from './services/storage'
import { setDefaultConfig } from './utils/polkadotHelper'

let hasCountries = storage.countries.getAll().size > 0

// set denomnination info
setConfig()
// set node URLs
setNodeUri(nodes)

// Retrieve a list of countries and store in the browser local storage
!hasCountries && client.onConnect(() => !hasCountries && client.countries((_, countries) => {
    storage.countries.setAll(countries)
    hasCountries = true
}))

getTypes().then(types => {
    setDefaultConfig(nodes, types)
    render(<App />, document.getElementById('app'))
})
