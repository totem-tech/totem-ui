import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { runtime, ss58Decode } from 'oo7-substrate'
import { Dropdown, Image, Menu } from 'semantic-ui-react'
import { getUser, getClient, onLogin } from '../services/ChatClient'
import { copyToClipboard, isFn } from '../utils/utils'
import { Pretty } from '../Pretty'
import { showForm } from '../services/modal'
import storage from '../services/storage'
import { setToast } from '../services/toast'
import TimeKeepingForm from '../forms/TimeKeeping'
import { addToQueue, QUEUE_TYPES } from '../services/queue'
import NotificationDropdown from '../services/notification'
import identityService from '../services/identity'
import IdentityForm from '../forms/Identity'

class PageHeader extends ReactiveComponent {
	constructor(props) {
		super(props, {
			// keep UI updated when selected wallet changed
			_0: identityService.bond,
			_1: storage.timeKeepingBond,
		})

		const user = getUser()
		this.state = {
			id: user ? user.id : '',
		}

		// Update user ID after registration
		!this.state.id && onLogin(id => id && this.setState({ id }))

		this.getSeletectedAddress = () => identityService.getSelected().address
		this.handleCopy = this.handleCopy.bind(this)
		this.handleEdit = this.handleEdit.bind(this)
		this.handleFaucetRequest = this.handleFaucetRequest.bind(this)
		this.handleSelection = this.handleSelection.bind(this)
	}

	handleSelection(_, { value: address }) {
		identityService.setSelected(address)
	}

	handleCopy() {
		const address = this.getSeletectedAddress()
		if (!address) return;
		copyToClipboard(address)
		const msg = { content: 'Address copied to clipboard', status: 'success' }
		this.copiedMsgId = setToast(msg, 2000, this.copiedMsgId)
	}

	handleEdit() {
		showForm(IdentityForm, {
			values: identityService.getSelected(),
			onSubmit: () => this.setState({})
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
		const { id } = this.state
		const wallets = identityService.getAll()
		const viewProps = {
			addressSelected: this.getSeletectedAddress(),
			id,
			onCopy: this.handleCopy,
			onEdit: this.handleEdit,
			onFaucetRequest: () => this.handleFaucetRequest(),
			onSelection: this.handleSelection,
			timerActive: storage.timeKeeping().inprogress,
			timerOnClick: () => showForm(TimeKeepingForm, {}),
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
			addressSelected,
			id,
			isMobile,
			logoSrc,
			onCopy,
			onEdit,
			onFaucetRequest,
			onSelection,
			timerActive,
			timerOnClick,
			wallets
		} = this.props

		return (
			<div>
				<Menu attached="top" inverted> {/*fixed="top" */}
					{isMobile && (
						<Menu.Item
							icon={{ name: 'sidebar', size: 'big', className: 'no-margin' }}
							onClick={this.handleToggle}
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
						<Menu.Item style={{ paddingRight: 0 }}>
							<Dropdown
								labeled
								noResultsMessage="No wallet available"
								onChange={onSelection}
								placeholder="Select an account"
								value={addressSelected}
								options={wallets.map(({ address, name }) => ({
									key: address,
									text: !isMobile ? name : name.split('').slice(0, 7).join(''),
									description: <Pretty value={runtime.balances.balance(ss58Decode(address))} />,
									value: address
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
