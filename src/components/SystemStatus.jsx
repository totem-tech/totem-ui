import React from 'react'
import { ReactiveComponent, Rspan } from 'oo7-react'
import { bytesToHex, pretty } from 'oo7-substrate'
import { Icon, Grid, GridRow, GridColumn } from 'semantic-ui-react'
// import Identicon from 'polkadot-identicon'
import { subscribeAllNSetState, unsubscribeAll } from '../services/data'

class SystemStatus extends ReactiveComponent {
	constructor(props) {
		super(props, {
			lastFinalisedBlock: 0
		})
	}

	componentDidMount() {
		this.setState({
			watchers: subscribeAllNSetState(this, [
				'runtime_version_specVersion', // network version
				'system_health_is_syncing',
				'chain_height',
				'chain_lag',
				'nodeService_status',
				'system_chain',
				'system_health_peers',
				'system_name',
				'system_version',
				'runtime_balances_totalIssuance',
				'runtime_core_authorities',
				'runtime_totem_claimsCount',
				'runtime_version_implName',
				'runtime_version_implVersion',
				'runtime_version_specName',
				'runtime_version_specVersion'
			])
		})
	}

	componentWillUnmount() {
		unsubscribeAll(this.state.watchers)
	}

	render() {
		const status = this.state.nodeService_status || {}
		const isConnected = !!status.connected
		const color = 'black'
		const items = [
			// <Grid celled stackable columns={'equal'}>
			<Grid celled stackable>
				<GridRow>
					<GridColumn width={2}>
						<Icon 
							name="circle" 
							color={isConnected ? 'green' : 'red'} />
							{!!isConnected ? 'On' : 'off'}line		
					</GridColumn>
					<GridColumn width={7}>
					Totem Network Version : V{this.state.runtime_version_specVersion}
					</GridColumn>
					<GridColumn width={7}>
					Chain type : {this.state.system_chain}
					</GridColumn>
				</GridRow>
				<GridRow>
				<GridColumn width={2}>
						<Icon 
							name="circle"
							color={this.state.system_health_is_syncing ? 'green' : 'yellow'}
						/>
						Syncing - {this.state.system_health_is_syncing ? 'Yes' : 'No'}
					</GridColumn>
					<GridColumn width={7}>
						{!isConnected && 'Not '}Connected to host : {isConnected && status.connected.split('ws://').join('')}
					</GridColumn>
					<GridColumn width={7}>
						Blockchain Runtime : {this.state.runtime_version_specName} v{this.state.runtime_version_specVersion}
					</GridColumn>
				</GridRow>
				<GridRow>
					<GridColumn width={2}>
						<Icon
							name="circle"
							color={this.state.peers > 0 ? 'green' : 'red'}
							/>
							Peers #{this.state.system_health_peers}
					</GridColumn>
					<GridColumn width={5}>
						Block Nr. : {pretty(this.state.chain_height) || 0}
					</GridColumn>
					<GridColumn width={5}>
						Lag : {pretty(this.state.chain_lag) || 0}
					</GridColumn>
					<GridColumn width={4}>
						Authorities : {
						// (this.state.runtime_core_authorities || []).map((a, i) =>
						// 	<Identicon key={bytesToHex(a) + i} account={a} size={16} />)
							}
					</GridColumn>
				</GridRow>
			</Grid>,
		]

		return (
			<React.Fragment>
					{items.map((item, i) => <div key={i}>{item}</div>)}
			</React.Fragment>
		)
	}
}

export default SystemStatus