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


				{/* <button onClick={()=>showForm(CompanyForm, {
					modal: true
				})}>Add Company</button> */}
			</React.Fragment>
		)
	}
}
export default WalletView
