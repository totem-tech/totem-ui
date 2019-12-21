import React from 'react'
import { render } from 'react-dom'
import { App } from './app.jsx'
import { setNodeUri } from 'oo7-substrate'
import { nodes, setConfig, types } from './services/blockchain'
import 'semantic-ui-css/semantic.min.css'
import client from './services/ChatClient'
import storage from './services/storage'
import { connect } from './utils/polkadotHelper'

let hasCountries = storage.countries.getAll().size > 0

// set denomnination info
setConfig({
    primary: 'Etx',
    unit: 'Transactions',
    ticker: 'XTX'
})
// set node URLs
setNodeUri(nodes)

// Retrieve a list of countries and store in the browser local storage
!hasCountries && client.onConnect(() => !hasCountries && client.countries((_, countries) => {
    storage.countries.setAll(countries)
    hasCountries = true
}))

// attempt to connect using polkadot
connect(nodes[0], types).then(api => console.log({ api }))

render(<App />, document.getElementById('app'))
