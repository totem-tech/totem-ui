import React from 'react'
import { render } from 'react-dom'
import { App } from './app.jsx'
import { setNodeUri } from 'oo7-substrate'
require('./denominations')
import 'semantic-ui-css/semantic.min.css'
const nodes = [
    'ws://165.22.72.170:9944', // post-upgrade node
    // 'ws://localhost:9944', // local node
    // 'ws://104.248.37.226:16181/', // pre-upgrade node
    // 'wss://substrate-rpc.parity.io/' // parity hosted node
]

setNodeUri(nodes)

render(<App />, document.getElementById('app'))
