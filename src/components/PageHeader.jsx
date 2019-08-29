import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { runtimeUp, secretStore, runtime, ss58Decode } from 'oo7-substrate'
import { Dropdown, Image, Menu } from 'semantic-ui-react'
import { getUser, getClient, onLogin } from '../services/ChatClient'
import { copyToClipboard, setState, setStateTimeout } from '../utils/utils'
import { Pretty } from '../Pretty'
import FormBuilder from '../components/FormBuilder'
import { showForm, closeModal } from '../services/modal'
import storageService from '../services/storage'
import { setToast } from '../services/toast'

class PageHeader extends ReactiveComponent {
	constructor(props) {
		super(props, {
			ensureRuntime: runtimeUp,
			secretStore: secretStore(),
			// keep UI updated when selected wallet changed
			_: storageService.walletIndexBond
		})

		const user = getUser()
		this.state = {
			// index: storageService.walletIndex(),
			id: user ? user.id : '',
		}

		// Update user ID after registration
		!this.state.id && onLogin(id => id && this.setState({id}))

		this.getSeletectedAddress = () => (this.state.secretStore.keys[storageService.walletIndex()] || {}).address
		this.handleCopy = this.handleCopy.bind(this)
		this.handleEdit = this.handleEdit.bind(this)
		this.handleFaucetRequest = this.handleFaucetRequest.bind(this)
		this.handleSelection = this.handleSelection.bind(this)
	}

	handleSelection(_, data) {
		const { secretStore } = this.state
		const num = eval(data.value)
		const index = num < secretStore.keys.length ? num : 0
		// this.setState({ index })
		storageService.walletIndex(index)
	}

	handleCopy() {
		const address = this.getSeletectedAddress()
		if (!address) return;
		copyToClipboard(address)
		const msg = { content: 'Address copied to clipboard', status: 'success'}
		this.copiedMsgId = setToast(msg, 2000, this.copiedMsgId)
	}

	handleEdit() {
		const { secretStore: ss } = this.state
		const index = storageService.walletIndex()
		const wallet = ss.keys[index]
		// Create a modal form on-the-fly!
		const inputs = [
			{
				label: 'Name',
				name: 'name',
				placeholder: 'Enter new name',
				required: true,
				type: 'text',
				value: wallet.name
			}
		]

		const formId = showForm(FormBuilder, {
			header: 'Update wallet name',
			inputs,
			onSubmit: (e, values) => {
				wallet.name = values.name
				secretStore()._sync()
				closeModal(formId)
			},
			size: 'tiny',
			submitText: 'Update'
		})
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
		client.faucetRequest(address, (err, txHash) => {
			const msg = {
				content: err || `Faucet transfer complete. Transaction hash: ${txHash}`,
				status: !!err ? 'error' : 'success'
			}
			this.faucetMsgId = setToast(msg, null, this.faucetMsgId)
		})
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
		super(props)
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
	const instance = this
	const { showTools } = this.state
	const {
		id,
		isMobile,
		logoSrc,
		onCopy,
		onEdit,
		onFaucetRequest,
		onSelection,
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
						<Menu.Item>
						<Dropdown
							labeled
							value={storageService.walletIndex()}
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
							onClick={() => setState(instance, 'showTools', !showTools)}
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
