import React from 'react'
require('semantic-ui-css/semantic.min.css')
import { Bond } from 'oo7'
import { If } from 'oo7-react'
import { calls, runtime, hexToBytes } from 'oo7-substrate'
import { InputBond } from '../InputBond'
import { TransactButton } from '../TransactButton'

class PokeView extends React.Component {
	constructor () {
		super()
		this.storageKey = new Bond;
		this.storageValue = new Bond;
    }
    
	render () {
        const content = (
            <React.Fragment>
                <InputBond bond={this.storageKey} placeholder='Storage key e.g. 0xf00baa' />
                <InputBond bond={this.storageValue} placeholder='Storage value e.g. 0xf00baa' />
                <TransactButton
                    content="Poke"
                    icon='warning'
                    tx={{
                        sender: runtime.sudo ? runtime.sudo.key : null,
                        call: calls.sudo ? calls.sudo.sudo(calls.consensus.setStorage([[this.storageKey.map(hexToBytes), this.storageValue.map(hexToBytes)]])) : null
                    }}
                />
            </React.Fragment>
        )
		return <If condition={runtime.metadata.map(m => m.modules && m.modules.some(o => o.name === 'sudo'))} then={content}/>
	}
}

export default PokeView