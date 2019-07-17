import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { runtimeUp, secretStore, runtime, ss58Decode } from 'oo7-substrate'
import { Dropdown, Image, Menu, Message, } from 'semantic-ui-react'
import { getUser, getClient, onLogin } from './ChatClient'
import { copyToClipboard, setState, setStateTimeout } from './utils'
import { Pretty } from '../Pretty'
import FormBuilder from './forms/FormBuilder'
import { showForm, closeModal } from '../services/modal'

class PageHeader extends ReactiveComponent {
	constructor(props) {
		super(props, { ensureRuntime: runtimeUp, secretStore: secretStore() })

		const user = getUser()
		this.state = {
			index: 0,
			id: user ? user.id : '',
			message: { error: false, text: ''}
		}

		// Update user ID after registration
		!this.state.id && onLogin(id => id && this.setState({id}))

		this.getSeletectedAddress = () => (this.state.secretStore.keys[this.state.index || 0] || {}).address
		this.handleCopy = this.handleCopy.bind(this)
		this.handleEdit = this.handleEdit.bind(this)
		this.handleFaucetRequest = this.handleFaucetRequest.bind(this)
		this.handleSelection = this.handleSelection.bind(this)
	}

	handleSelection(_, data) {
		const num = eval(data.value)
		const index = num < this.state.secretStore.keys.length ? num : 0
		this.setState({ index })
	}

	handleCopy() {
		const address = this.getSeletectedAddress()
		if (!address) return;
		copyToClipboard(address)
		const msg = { text: 'Address copied to clipboard', error: false}
		setStateTimeout(this, 'message', msg, {}, 2000)
	}

	handleEdit() {
		const { index, secretStore: ss } = this.state
		const wallet = (ss.keys[index || 0])
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
				const newIndex = ss.keys.length
				secretStore().forget(wallet)
				secretStore().submit(wallet.uri, values.name)
				this.handleSelection(null, {value: newIndex})
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
			text: 'Connection failed!',
			error: true
			}
			setStateTimeout(this, 'message', msg, {}, 3000)
			return
		}
		client.faucetRequest(address, (err, fifthTs) => {
			const msg = {
				text: err || 'Request sent!',
				error: !!err
			}
			setStateTimeout(this, 'message', msg, 3000)
		})
	}

	render() {
		const { id, index, message, secretStore } = this.state
		const { keys: wallets} = secretStore
		const addressSelected = this.getSeletectedAddress()
		const viewProps = {
			addressSelected,
			id,
			message,
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
	constructor() {
		super()
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
		message,
		onCopy,
		onEdit,
		onFaucetRequest,
		onSelection,
		selectedIndex,
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
							value={selectedIndex || 0}
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
				{message && message.text && (
					<div>
						<Message
							content={message.text}
							color={message.color || (message.error ? 'red' : 'green')}
							style={styles.messageMobile}
						/>
					</div>
				)}
			</div>
		)
	}
}

const styles = {
	content: {
		height: 154,
		width: 'calc(100% - 235px)',
		float: 'right',
		padding: '18px 0px'
	},
	dropdown: {
		background: 'none',
		border: 'none',
		boxShadow: 'none',
		minHeight: 'auto',
		fontSize: 35,
		padding: '0 2em 10px 0',
		minWidth: 'auto'
	},
	dropdownIcon: {
		padding: 0
	},
	headerContainer: {
		height: 154,
		borderBottom: '5px solid black'
	},
	logo: {
		width: 235,
		float: 'left',
		padding: 15
	},
	logoImg: {
		margin: 'auto',
		maxHeight: 124,
		width: 'auto'
	},
	messageMobile: {
		zIndex: 3,
		margin: -15,
		position: 'absolute',
		width: '100%',
		textAlign: 'center'
	}
}
