import React from 'react'
import { render } from 'react-dom'
import { App } from './app.jsx'
import { setNodeUri } from 'oo7-substrate'
require('./utils/denominations')
import 'semantic-ui-css/semantic.min.css'
import client from './services/ChatClient'
import storage from './services/storage'

let hasCountries = storage.countries.getAll().size > 0
const nodes = [
    'wss://node1.totem.live', // post-upgrade node (https)
    // 'wss://165.22.72.170:443', // post-upgrade node (http)
    // 'ws://localhost:9944', // local node
    // 'ws://104.248.37.226:16181/', // pre-upgrade node
    // 'wss://substrate-rpc.parity.io/' // parity hosted node
]

setNodeUri(nodes)

// Retrieve a list of countries and store in the browser local storage
!hasCountries && client.onConnect(() => !hasCountries && client.countries((_, countries) => {
    storage.countries.setAll(countries)
    hasCountries = true
}))

render(<App />, document.getElementById('app'))
