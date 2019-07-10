import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import WalletList from './lists/WalletList'
import WalletForm from './forms/Wallet'

class WalletView extends ReactiveComponent {
	constructor() {
		super([])
	}

	render() {
		return (
			<React.Fragment>
				<WalletForm />
				<div style={{ paddingBottom: '1em' }}>
					<WalletList itemsPerRow={1} />
				</div>
			</React.Fragment>
		)
	}
}
export default WalletView
