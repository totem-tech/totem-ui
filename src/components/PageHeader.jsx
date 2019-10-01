import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { runtimeUp, secretStore, runtime, ss58Decode } from 'oo7-substrate'
import { Dropdown, Image, Menu } from 'semantic-ui-react'
import { getUser, getClient, onLogin } from '../services/ChatClient'
import { copyToClipboard } from '../utils/utils'
import { Pretty } from '../Pretty'
import { showForm } from '../services/modal'
import storage from '../services/storage'
import { setToast } from '../services/toast'
import TimeKeepingForm from '../forms/TimeKeeping'
import { WalletUpdate } from '../forms/Wallet'
import { addToQueue, QUEUE_TYPES } from '../services/queue'

class PageHeader extends ReactiveComponent {
	constructor(props) {
		super(props, {
			ensureRuntime: runtimeUp,
			secretStore: secretStore(),
			// keep UI updated when selected wallet changed
			index: storage.walletIndexBond,
			_: storage.timeKeepingBond,
		})

		const user = getUser()
		this.state = {
			id: user ? user.id : '',
		}

		// Update user ID after registration
		!this.state.id && onLogin(id => id && this.setState({id}))

		this.getSeletectedAddress = () => (this.state.secretStore.keys[storage.walletIndex()] || {}).address
		this.handleCopy = this.handleCopy.bind(this)
		this.handleEdit = this.handleEdit.bind(this)
		this.handleFaucetRequest = this.handleFaucetRequest.bind(this)
		this.handleSelection = this.handleSelection.bind(this)
	}

	handleSelection(_, data) {
		const { secretStore } = this.state
		const num = eval(data.value)
		const index = num < secretStore.keys.length ? num : 0
		storage.walletIndex(index)
	}

	handleCopy() {
		const address = this.getSeletectedAddress()
		if (!address) return;
		copyToClipboard(address)
		const msg = { content: 'Address copied to clipboard', status: 'success'}
		this.copiedMsgId = setToast(msg, 2000, this.copiedMsgId)
	}

	handleEdit() {
		showForm(WalletUpdate, {index: storage.walletIndex()})
	}

	handleFaucetRequest() {
		const address = this.getSeletectedAddress()
		if (!address) return;
		const client = getClient()
		if (!client.isConnected()) {
			const msg = {
				content: 'Connection failed!',
				status: 'error'
			}
			this.faucetMsgId = setToast(msg, 3000, this.faucetMsgId)
			return
		}
		this.faucetMsgId = setToast({content: 'Faucet request sent', status: 'loading'}, null, this.faucetMsgId)
		
		addToQueue({
			type: QUEUE_TYPES.CHATCLIENT,
			func: 'faucetRequest',
			args: [
				address,
				(err, txHash) => {
					this.faucetMsgId = setToast({
						content: err || `Faucet transfer complete. Transaction hash: ${txHash}`,
						status: !!err ? 'error' : 'success'
					}, null, this.faucetMsgId)
				},
			]
		}, null, this.faucetMsgId)
	}

	render() {
		const { id, index, secretStore } = this.state
		const { keys: wallets} = secretStore
		const addressSelected = this.getSeletectedAddress()
		const viewProps = {
			addressSelected,
			id,
			onCopy: this.handleCopy,
			onEdit: this.handleEdit,
			onFaucetRequest: () => this.handleFaucetRequest(addressSelected),
			onSelection: this.handleSelection,
			selectedIndex: index,
			timerActive: storage.timeKeeping().inprogress,
			timerOnClick: ()=> showForm(TimeKeepingForm, {}),
			wallets
		}
		return <MobileHeader {...this.props} {...viewProps} />
	}
}

PageHeader.propTypes = {
	logoSrc: PropTypes.string,
	onSidebarToggle: PropTypes.func,
	sidebarVisible: PropTypes.bool
}

PageHeader.defaultProps = {
	logoSrc: 'https://react.semantic-ui.com/images/wireframe/image.png'
}

export default PageHeader

class MobileHeader extends ReactiveComponent {
	constructor(props) {
		super(props, {
			timerValues: storage.timeKeepingBond
		})
		this.state = {
			showTools: false
		}
		this.handleToggle = this.handleToggle.bind(this)
	}

	handleToggle() {
		let { sidebarCollapsed, isMobile, onSidebarToggle, sidebarVisible } = this.props
		isMobile ? onSidebarToggle(!sidebarVisible, false) : onSidebarToggle(true, !sidebarCollapsed)
	}

	render() {
		const { showTools } = this.state
		const {
			id,
			isMobile,
			logoSrc,
			onCopy,
			onEdit,
			onFaucetRequest,
			onSelection,
			selectedIndex,
			timerActive,
			timerOnClick,
			wallets
		} = this.props

		return (
			<div>
				<Menu fixed="top" inverted>
					{isMobile && (
						<Menu.Item
							icon={{name:'sidebar', size: 'big', className: 'no-margin'}}
							onClick={this.handleToggle}
						/>
					)}
					<Menu.Item>
						<Image size="mini" src={logoSrc} />
					</Menu.Item>
					<Menu.Menu position="right">
						{id && (
							<Menu.Item
								icon={{
									className: 'no-margin',
									loading: timerActive,
									name: 'clock outline',
									size: 'big'
								}}
								onClick={timerOnClick}
							/>
						)}
						<Menu.Item>
							<Dropdown
								labeled
								value={selectedIndex}
								noResultsMessage="No wallet available"
								placeholder="Select an account"
								onChange={onSelection}
								options={wallets.map((wallet, i) => ({
									key: i,
									text: (wallet.name || '').split('').slice(0, 16).join(''),
									description: <Pretty value={runtime.balances.balance(ss58Decode(wallet.address))} />,
									value: i
								}))}
							/>
						</Menu.Item>
					</Menu.Menu>
					<Menu.Menu fixed="right">
						<Dropdown
							item
							icon={{
								name: 'chevron circle ' + (showTools ? 'up' : 'down'),
								size: 'large',
								className: 'no-margin'
							}}
							onClick={() => this.setState({showTools: !showTools})}
						>
							<Dropdown.Menu className="left">
								<Dropdown.Item
									icon="pencil"
									content="Edit Address Name"
									onClick={onEdit}
								/>
								<Dropdown.Item
									icon="copy"
									content="Copy Address"
									onClick={onCopy}
								/>
								{id && [
									<Dropdown.Item
									key="0"
									icon="gem"
									content="Request Funds"
									onClick={onFaucetRequest}
									/>
								]}
							</Dropdown.Menu>
						</Dropdown>
					</Menu.Menu>
				</Menu>
			</div>
		)
	}
}
