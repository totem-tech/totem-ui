import React, { useEffect } from 'react'
import { Icon, Grid, GridRow, GridColumn } from 'semantic-ui-react'
// import Identicon from 'polkadot-identicon'
import { translated } from '../services/language'
import { isFn, objCreate } from '../utils/utils'
import { getConnection, query } from '../services/blockchain'
import { iUseReducer } from '../services/react'

const [texts, textsCap] = translated({
	blockchainRuntime: 'Connected Host Runtime Version',
	blockNr: 'Block Nr.',
	chainType: 'Chain type',
	hostConneced: 'Connected to host',
	hostDisconnected: 'Disconnected from host',
	lag: 'lag',
	networkVersion: 'Current Hot Upgrade',
	no: 'no',
	offline: 'offline',
	online: 'online',
	peers: 'peers',
	syncing: 'syncing',
	yes: 'yes',
}, true)

export default function SystemStatus() {
	const [state, setState] = iUseReducer(null, {})
	const {
		newHead = { number: 0 },
		finalizedHead = { number: 0 },
		chain_lag = newHead.number - finalizedHead.number, // source: /node_modules/oo7-substrate/src/bonds.js: line 16
		health = { isSyncing: false, peers: undefined },
		isConnected = false,
		nodeUrl,
		rpcSystemChain,
		rpcSystemVersion,
		runtimeVersion = {}
	} = state
	const {
		specName = '',
		// implName = '',
		authoringVersion = '',
		specVersion = '',
		implVersion = '',
	} = runtimeVersion

	useEffect(() => {
		let mounted = true
		let unsubFnArr = []
		const x = {
			finalizedHead: 'api.rpc.chain.subscribeFinalizedHeads',
			health: 'api.rpc.system.health',
			newHead: 'api.rpc.chain.subscribeNewHeads',
			rpcSystemChain: 'api.rpc.system.chain',
			rpcSystemVersion: 'api.rpc.system.version',
			// rpcSystemName: 'api.rpc.system.name',
			// totalIssuance: 'api.query.balances.totalIssuance',
		}

		getConnection().then(
			({ api, nodeUrl, provider }) => {
				setState({
					isConnected: true,
					nodeUrl,
					runtimeVersion: JSON.parse(JSON.stringify(api.runtimeVersion))
				})
			},
			() => setState({ isConnected: false, nodeUrl: '' }),
		)

		Object.keys(x).forEach(async (key) =>
			unsubFnArr[key] = await query(x[key], value => mounted && setState(objCreate(key, value)))
		)

		return () => {
			mounted = false
			// unsubscribe here
			unsubFnArr.forEach(fn => isFn(fn) && fn())
			unsubFnArr = []
		}
	}, [])

	return (
		<Grid celled stackable>
			<GridRow>
				<GridColumn width={2}>
					<Icon
						name="circle"
						color={isConnected ? 'green' : 'red'} />
					{!!isConnected ? textsCap.online : textsCap.offline}
				</GridColumn>
				<GridColumn width={7}>
					{texts.networkVersion} : {rpcSystemChain} v{authoringVersion}.{specVersion}.{implVersion}
				</GridColumn>
				<GridColumn width={7}>
					{texts.chainType} : {specName}
				</GridColumn>
			</GridRow>
			<GridRow>
				<GridColumn width={2}>
					<Icon
						name="circle"
						color={health.isSyncing ? 'green' : 'yellow'}
					/>
					{textsCap.syncing} - {health.isSyncing ? textsCap.yes : textsCap.no}
				</GridColumn>
				<GridColumn width={7}>
					{isConnected ? texts.hostConneced : texts.hostDisconnected} : {isConnected && nodeUrl}
				</GridColumn>
				<GridColumn width={7}>
					{texts.blockchainRuntime} : v{rpcSystemVersion}

				</GridColumn>
			</GridRow>
			<GridRow>
				<GridColumn width={2}>
					<Icon
						name="circle"
						color={health.peers > 0 ? 'green' : 'red'}
					/>
					{textsCap.peers} #{health.peers}
				</GridColumn>
				<GridColumn width={5}>
					{texts.blockNr} : {newHead.number}
				</GridColumn>
				<GridColumn width={5}>
					{textsCap.lag} : {chain_lag}
				</GridColumn>
			</GridRow>
		</Grid>
	)
}