import React from 'react'
import { ReactiveComponent, Rspan } from 'oo7-react'
import { bytesToHex, pretty } from 'oo7-substrate'
import { Icon, Grid, GridRow, GridColumn } from 'semantic-ui-react'
// import Identicon from 'polkadot-identicon'
import { subscribeAllNSetState, unsubscribeAll } from '../services/data'
import { translated } from '../services/language'

const [texts, textsCap] = translated({
	blockchainRuntime: 'Blockchain Runtime',
	blockNr: 'Block Nr.',
	chainType: 'Chain type',
	hostConneced: 'Connected to host',
	hostDisconnected: 'Disconnected from host',
	lag: 'lag',
	networkVersion: 'Totem Network Version',
	no: 'no',
	offline: 'offline',
	online: 'online',
	peers: 'peers',
	syncing: 'syncing',
	yes: 'yes',
}, true)
export default class SystemStatus extends ReactiveComponent {
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
						{!!isConnected ? textsCap.online : textsCap.offline}
					</GridColumn>
					<GridColumn width={7}>
						{texts.networkVersion} : V{this.state.runtime_version_specVersion}
					</GridColumn>
					<GridColumn width={7}>
						{texts.chainType} : {this.state.system_chain}
					</GridColumn>
				</GridRow>
				<GridRow>
					<GridColumn width={2}>
						<Icon
							name="circle"
							color={this.state.system_health_is_syncing ? 'green' : 'yellow'}
						/>
						{textsCap.syncing} - {this.state.system_health_is_syncing ? textsCap.yes : textsCap.no}
					</GridColumn>
					<GridColumn width={7}>
						{isConnected ? texts.hostConneced : texts.hostDisconnected} : {isConnected && status.connected.split('ws://').join('')}
					</GridColumn>
					<GridColumn width={7}>
						{texts.blockchainRuntime} : {this.state.runtime_version_specName} v{this.state.runtime_version_specVersion}
					</GridColumn>
				</GridRow>
				<GridRow>
					<GridColumn width={2}>
						<Icon
							name="circle"
							color={this.state.peers > 0 ? 'green' : 'red'}
						/>
						{textsCap.peers} #{this.state.system_health_peers}
					</GridColumn>
					<GridColumn width={5}>
						{texts.blockNr} : {pretty(this.state.chain_height) || 0}
					</GridColumn>
					<GridColumn width={5}>
						{textsCap.lag} : {pretty(this.state.chain_lag) || 0}
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