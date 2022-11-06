// import React from 'react'
// import { Label } from 'semantic-ui-react'
// import { Bond } from 'oo7'
// import { calls, runtime, runtimeUp } from 'oo7-substrate'
// import { If, ReactiveComponent } from 'oo7-react'
// import { AccountIdBond, SignerBond } from './AccountIdBond.jsx'
// import { BalanceBond } from './BalanceBond.jsx'
// import { TransactButton } from './TransactButton.jsx'
// import { Pretty } from './Pretty'

// class SendFundsView extends ReactiveComponent {
// 	constructor() {
// 		super([], { ensureRuntime: runtimeUp })

// 		this.source = new Bond()
// 		this.amount = new Bond()
// 		this.destination = new Bond()
// 	}

// 	render() {
// 		const sourceDetails = (
// 			<span>
// 				<Label>
// 					Balance
// 					<Label.Detail>
// 						<Pretty value={runtime.balances.balance(this.source)} />
// 					</Label.Detail>
// 				</Label>
// 				<Label>
// 					Nonce
// 					<Label.Detail>
// 						<Pretty value={runtime.system.accountNonce(this.source)} />
// 					</Label.Detail>
// 				</Label>
// 			</span>
// 		)

// 		const destDetails = (
// 			<Label>
// 				Balance
// 				<Label.Detail>
// 					<Pretty value={runtime.balances.balance(this.destination)} />
// 				</Label.Detail>
// 			</Label>
// 		)

// 		return (
// 			<React.Fragment>
// 				<div style={{ paddingBottom: '1em' }}>
// 					<div style={{ fontSize: 'small' }}>from</div>
// 					<SignerBond bond={this.source} />
// 					<If condition={this.source.ready()} then={sourceDetails} />
// 				</div>
// 				<div style={{ paddingBottom: '1em' }}>
// 					<div style={{ fontSize: 'small' }}>to</div>
// 					<AccountIdBond bond={this.destination} />
// 					<If condition={this.destination.ready()} then={destDetails} />
// 				</div>
// 				<div style={{ paddingBottom: '1em' }}>
// 					<div style={{ fontSize: 'small' }}>amount</div>
// 					<BalanceBond bond={this.amount} />
// 				</div>
// 				<TransactButton
// 					content="Send"
// 					icon="send"
// 					tx={{
// 						sender: runtime.indices.tryIndex(this.source),
// 						call: calls.balances.transfer(runtime.indices.tryIndex(this.destination), this.amount),
// 						compact: false,
// 						longevity: true
// 					}}
// 				/>
// 			</React.Fragment>
// 		)
// 	}
// }

// export default SendFundsView
