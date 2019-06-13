import React from 'react'
import { If, ReactiveComponent, Rspan} from 'oo7-react'
import { bytesToHex } from 'oo7-substrate'
import Identicon from 'polkadot-identicon'
import { Label } from 'semantic-ui-react'
import { Pretty } from '../Pretty'
import { subscribeAllNSetState, unsubscribeAll } from '../services/data'

class ChainInfoBar extends ReactiveComponent {
	constructor() {
		super([])

		this.state = { watchers: new Map() }
	}

	componentDidMount() {
		this.setState({ watchers: subscribeAllNSetState(this, [
			// the following state variables will be set once value is resolved
			'chain_height',
			'chain_lag',
			'nodeService_status',
			'system_chain',
			'system_name',
			'system_version',
			'runtime_balances_totalIssuance',
			'runtime_core_authorities',
			'runtime_totem_claimsCount',
			'runtime_version_implName',
			'runtime_version_implVersion',
			'runtime_version_specName',
			'runtime_version_specVersion'
		])})

	}

	componentWillUnmount() {
		unsubscribeAll(this.state.watchers)
	}	

	render() {
		const isConnected = !!(this.state.nodeService_status||{}).connected
		const connected = (
			<Label color="black">
				Connected
				<Label.Detail>
					<Pretty className="value" value={(this.state.nodeService_status||{}).connected} />
				</Label.Detail>
			</Label>
		)
		return (
			<div>
				<If condition={isConnected} then={connected} else={<Label>Not connected</Label>} />
				<Label color="black">
					Name 
					<Label.Detail>
					{this.state.system_name} v{this.state.system_version}
						{/* <Pretty className="value" value={this.state.system_name} /> v */}
						{/* <Pretty className="value" value={this.state.system_version} /> */}
					</Label.Detail>
				</Label>
				<Label>
					Chain 
					<Label.Detail>
					<Pretty className="value" value={this.state.system_chain} />
					</Label.Detail>
				</Label>
				<Label>Runtime 
					<Label.Detail>
						<Pretty className="value" value={this.state.runtime_version_specName} /> v
						<Pretty className="value" value={this.state.runtime_version_specVersion} />
						<Pretty className="value" value={this.state.runtime_version_implName} /> v&nbsp;
						<Pretty className="value" value={this.state.runtime_version_implVersion} />
					</Label.Detail>
				</Label>
				<Label>
					Height
					<Label.Detail>
						<Pretty className="value" value={this.state.chain_height || 0} />
						&nbsp;(with <Pretty className="value" value={this.state.chain_lag || 0} /> lag)
					</Label.Detail>
				</Label>
				<Label>
					Authorities 
					<Label.Detail>
						<Rspan className="value">
							{(this.state.runtime_core_authorities || []).map((a, i) => 
									<Identicon key={bytesToHex(a) + i} account={a} size={16} />)}
						</Rspan>
					</Label.Detail>
				</Label>
				<Label>
					Total issuance 
					<Label.Detail>
						<Pretty className="value" value={this.state.runtime_balances_totalIssuance || 0} />
					</Label.Detail>
				</Label>
			</div>
		)
	}
}

export default ChainInfoBar