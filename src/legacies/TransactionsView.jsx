import React, { Component } from 'react'
import { Bond } from 'oo7'
import { hexToBytes } from '../utils/convert'
import { TransactButton } from './TransactButton'
import { InputBond } from './InputBond'

class TransactionsView extends Component {
	constructor() {
		super()
		this.txhex = new Bond
	}

	render() {
		return (
			<div>
				<div style={{ paddingBottom: '1em' }}>
					<div style={{ fontSize: 'small' }}>Custom Transaction Data</div>
					<InputBond bond={this.txhex} />
				</div>
				<TransactButton tx={this.txhex.map(hexToBytes)} content="Publish" icon="sign in" />
			</div>
		)
	}
}

export default TransactionsView