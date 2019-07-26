import React from 'react'
import { ReactiveComponent, Rspan } from 'oo7-react'
import { bytesToHex } from 'oo7-substrate'
import { Icon, Label, Grid, GridRow, GridColumn } from 'semantic-ui-react'
import Identicon from 'polkadot-identicon'
import { Pretty } from '../Pretty'
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
			<Grid celled stackable columns={8}>
				<GridRow>
					<GridColumn>
						<Icon 
							name="circle" 
							color={isConnected ? 'green' : 'red'} />
							{!!isConnected ? 'On' : 'off'}line		
					</GridColumn>
					<GridColumn>
						<Icon 
							name="circle"
							color={this.state.system_health_is_syncing ? 'green' : 'yellow'}
						/>
						Syncing - {this.state.system_health_is_syncing ? 'Yes' : 'No'}
					</GridColumn>
					<GridColumn>
						{/* <Icon 
							name="circle" 
							color="green"
						 />
						Best Block #{this.state.chain_height} */}
					</GridColumn>
					<GridColumn>
						{/* <Icon 
							name="circle" 
							color={this.state.system_health_is_syncing ? 'green' : 'yellow'}
						/>
						Last Finalised Block #{this.state.lastFinalisedBlock} */}
					</GridColumn>
					<GridColumn>
						<Icon
							name="circle"
							color={this.state.peers > 0 ? 'green' : 'red'}
						/>
						Peers #{this.state.system_health_peers}
					</GridColumn>
					<GridColumn>

					</GridColumn>	
					<GridColumn>
		
					</GridColumn>	
					<GridColumn>

					</GridColumn>	
				</GridRow>
			</Grid>,
			// <Label className="fluid" color={color}>
			// 	<Icon name="circle" color={isConnected ? 'green' : 'red'} />
			// 	{!!isConnected ? 'On' : 'off'}line
			// </Label>,
				// <Label className="fluid" color={color} style={this.props.sidebar ? {} : styles.spaceBelow}>
			// 	<Label className="fluid" color={color}>
			// 	<Icon
			// 		name="circle"
			// 		color={this.state.system_health_is_syncing ? 'green' : 'yellow'}
			// 		style={styles.listIcon}
			// 	/>
			// 	Syncing -
			// 	<Pretty className="value" value={this.state.system_health_is_syncing ? 'Yes' : 'No'} />
			// </Label>,
			// <Label className="fluid" color={color}>
			// 	<Icon name="circle" color="green" style={styles.listIcon} />
			// 	Best Block #<Pretty className="value" value={this.state.chain_height} />
			// </Label>,
			// <Label className="fluid" color={color}>
			// 	<Icon name="circle" color={this.state.system_health_is_syncing ? 'green' : 'yellow'} style={styles.listIcon} />
			// 	Last Finalised Block #<Pretty className="value" value={this.state.lastFinalisedBlock} />
			// </Label>,
			// <Label className="fluid" color={color}>
			// 	<Icon
			// 		name="circle"
			// 		color={this.state.peers > 0 ? 'green' : 'red'}
			// 		style={styles.listIcon}
			// 	/>
			// 	Peers #
			// 	<Pretty className="value" value={this.state.system_health_peers} />
			// </Label>,
			// <Label className="fluid" color={color}>
			// 	Totem Network Version
			// 	{/* <Label.Detail style={this.props.sidebar ? {} : styles.labelDetail}> */}
			// 	<Label.Detail style={styles.labelDetail}>
			// 		V<Pretty className="value" value={this.state.runtime_version_specVersion} />
			// 	</Label.Detail>
			// </Label>,
			// <Label className="fluid" color={color}>
			// 	{!isConnected && 'Not '}Connected
			// 	{/* <Label.Detail style={this.props.sidebar ? {} : styles.labelDetail}> */}
			// 	<Label.Detail style={styles.labelDetail}>
			// 		{isConnected && status.connected.split('ws://').join('')}
			// 	</Label.Detail>
			// </Label>,
			// <Label className="fluid" color={color}>
			// 	Chain
			// 	{/* <Label.Detail style={this.props.sidebar ? {} : styles.labelDetail}>{this.state.system_chain}</Label.Detail> */}
			// 	<Label.Detail style={styles.labelDetail}>{this.state.system_chain}</Label.Detail>
			// </Label>,
			
			
			<Label className="fluid">
				Runtime
				{/* <Label.Detail style={this.props.sidebar ? {} : styles.labelDetail}> */}
				<Label.Detail style={styles.labelDetail}>
					{this.state.runtime_version_specName} v{this.state.runtime_version_specVersion}
					{/* {this.state.runtime_version_implName} v{this.state.runtime_version_implVersion} */}
				</Label.Detail>
			</Label>,
			<Label className="fluid">
				Height
				{/* <Label.Detail style={this.props.sidebar ? {} : styles.labelDetail}> */}
				<Label.Detail style={styles.labelDetail}>
					<Pretty value={this.state.chain_height || 0} />
					<span> (with <Pretty value={this.state.chain_lag || 0} /> lag)</span>
				</Label.Detail>
			</Label>,
			<Label className="fluid">
				Authorities
				{/* <Label.Detail style={this.props.sidebar ? {} : styles.labelDetail}> */}
				<Label.Detail style={styles.labelDetail}>
					<Rspan className="value">
						{(this.state.runtime_core_authorities || []).map((a, i) =>
							<Identicon key={bytesToHex(a) + i} account={a} size={16} />)}
					</Rspan>
				</Label.Detail>
			</Label>,
		]

		// return this.props.sidebar ? (
		return (
		// 	<Sidebar
		// 		as={Menu}
		// 		animation='push'
		// 		fixed="bottom"
		// 		direction='bottom'
		// 		width="very thin"
		// 		inverted
		// 		visible={this.props.visible}
		// 		color="black"
		// 	>
		// 		<Menu.Item as="h3" header>System Status</Menu.Item>
		// 		{items.map((item, i) => <Menu.Item key={i}>{item}</Menu.Item>)}
		// 	</Sidebar>
		// ) : (
			// <Segment inverted color="black">
			<React.Fragment>
				<div style={styles.spaceBelow}>
					{items.map((item, i) => <div key={i}>{item}</div>)}
					Totem Network Version : V{this.state.runtime_version_specVersion}
				</div>
				<div style={styles.spaceBelow}>
					{!isConnected && 'Not '}Connected : {isConnected && status.connected.split('ws://').join('')}
				</div>
				<div style={styles.spaceBelow}>
					Chain : {this.state.system_chain}
				</div>
			</React.Fragment>

		)
	}
}

export default SystemStatus

const styles = {
	spaceBelow: {
		marginBottom: 5
	},
	labelDetail: {
		float: 'right',
		margin: 0
	}
}