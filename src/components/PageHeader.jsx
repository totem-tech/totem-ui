import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { runtime } from 'oo7-substrate'
import { Dropdown, Image, Menu } from 'semantic-ui-react'
import { Pretty } from '../Pretty'
// utils
import { copyToClipboard } from '../utils/utils'
import { ss58Decode } from '../utils/convert'
// forms
import IdentityForm from '../forms/Identity'
import TimeKeepingForm from '../forms/TimeKeeping'
// services
import { getUser, getClient, onLogin } from '../services/ChatClient'
import identities, { getSelected, setSelected } from '../services/identity'
import { showForm } from '../services/modal'
import NotificationDropdown from '../services/notification'
import { addToQueue, QUEUE_TYPES } from '../services/queue'
import { toggleSidebarState } from '../services/sidebar'
import storage from '../services/storage'
import { setToast } from '../services/toast'

export default class PageHeader extends Component {
	constructor(props) {
		super(props)

		this.state = {
			id: (getUser() || {}).id,
			wallets: [],
		}

		// Update user ID after registration
		!this.state.id && onLogin(id => id && this.setState({ id }))
		this.originalSetState = this.setState
		this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
	}

	componentWillMount() {
		const { isMobile } = this.props
		this._mounted = true
		// force delay loading identities to avoid secretStore loading error (especially, on mobile)
		setTimeout(() => identities.bond.tie(() => this.setState({
			wallets: identities.getAll()
		})), isMobile ? 500 : 100)

		storage.timeKeepingBond.tie(() => this.forceUpdate())
	}

	componentWillUnmount = () => this._mounted = false

	handleSelection = (_, { value: address }) => setSelected(address)

	handleCopy = () => {
		const { address } = getSelected()
		if (!address) return;
		copyToClipboard(address)
		const msg = { content: 'Address copied to clipboard', status: 'success' }
		this.copiedMsgId = setToast(msg, 2000, this.copiedMsgId)
	}

	handleEdit = () => showForm(IdentityForm, {
		values: getSelected(),
		onSubmit: () => this.forceUpdate()
	})

	handleFaucetRequest = () => {
		const { address } = getSelected()
		const client = getClient()
		if (!client.isConnected()) {
			const msg = {
				content: 'Connection failed!',
				status: 'error'
			}
			this.faucetMsgId = setToast(msg, 3000, this.faucetMsgId)
			return
		}
		this.faucetMsgId = setToast({ content: 'Faucet request sent', status: 'loading' }, null, this.faucetMsgId)

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
		const { id, wallets } = this.state
		const viewProps = {
			id,
			onCopy: this.handleCopy,
			onEdit: this.handleEdit,
			onFaucetRequest: this.handleFaucetRequest,
			onSelection: this.handleSelection,
			timerActive: storage.timeKeeping().inprogress,
			timerOnClick: () => showForm(TimeKeepingForm, {}),
			wallets,
		}
		return <MobileHeader {...this.props} {...viewProps} />
	}
}

PageHeader.propTypes = {
	logoSrc: PropTypes.string,
	isMobile: PropTypes.bool,
}

PageHeader.defaultProps = {
	logoSrc: 'https://react.semantic-ui.com/images/wireframe/image.png'
}

class MobileHeader extends Component {
	constructor(props) {
		super(props)
		this.state = { showTools: false }
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
			timerActive,
			timerOnClick,
			wallets,
		} = this.props

		return (
			<div>
				<Menu attached="top" inverted>
					{isMobile && (
						<Menu.Item
							icon={{ name: 'sidebar', size: 'big', className: 'no-margin' }}
							// on mobile when sidebar is visible toggle is not neccessary on-document-click it is already triggered
							onClick={toggleSidebarState}
						/>
					)}
					<Menu.Item>
						<Image size="mini" src={logoSrc} />
					</Menu.Item>
					<Menu.Menu position="right">
						<NotificationDropdown />
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

						{wallets && wallets.length > 0 && (
							<Menu.Item style={{ paddingRight: 0 }}>
								<Dropdown
									labeled
									noResultsMessage="No wallet available"
									onChange={onSelection}
									placeholder="Select an account"
									value={getSelected().address}
									options={wallets.map(({ address, name }) => ({
										key: address,
										text: !isMobile ? name : name.split('').slice(0, 7).join(''),
										description: runtime.balances && (
											<Pretty value={runtime.balances.balance(ss58Decode(address))} />
										),
										value: address
									}))}
								/>
							</Menu.Item>
						)}
					</Menu.Menu>
					<Menu.Menu fixed="right">
						<Dropdown
							item
							icon={{
								name: 'chevron circle ' + (showTools ? 'up' : 'down'),
								size: 'large',
								className: 'no-margin'
							}}
							onClick={() => this.setState({ showTools: !showTools })}
						>
							<Dropdown.Menu className="left">
								<Dropdown.Item
									icon="pencil"
									content="Update Identity"
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
