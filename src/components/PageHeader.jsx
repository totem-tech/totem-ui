import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { runtime, ss58Decode } from 'oo7-substrate'
import { Dropdown, Image, Menu } from 'semantic-ui-react'
import { getUser, getClient, onLogin } from '../services/ChatClient'
import { copyToClipboard } from '../utils/utils'
import { Pretty } from '../Pretty'
import { showForm } from '../services/modal'
import storage from '../services/storage'
import { setToast } from '../services/toast'
import TimeKeepingForm from '../forms/TimeKeeping'
import { addToQueue, QUEUE_TYPES } from '../services/queue'
import NotificationDropdown from '../services/notification'
import identities, { getSelected, setSelected } from '../services/identity'
import IdentityForm from '../forms/Identity'

export default class PageHeader extends ReactiveComponent {
	constructor(props) {
		super(props, {
			// keep UI updated when selected wallet changed
			_0: identities.bond,
			_1: storage.timeKeepingBond,
		})

		this.state = getUser() || { id: '' }

		// Update user ID after registration
		!this.state.id && onLogin(id => id && this.setState({ id }))
	}

	handleSelection = (_, { value: address }) => {
		setSelected(address)
	}

	handleCopy = () => {
		const { address } = getSelected()
		if (!address) return;
		copyToClipboard(address)
		const msg = { content: 'Address copied to clipboard', status: 'success' }
		this.copiedMsgId = setToast(msg, 2000, this.copiedMsgId)
	}

	handleEdit = () => showForm(IdentityForm, {
		values: getSelected(),
		onSubmit: () => this.setState({})
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
		const { id } = this.state
		const wallets = identities.getAll()
		const viewProps = {
			addressSelected: getSelected().address,
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

class MobileHeader extends ReactiveComponent {
	constructor(props) {
		super(props, {
			timerValues: storage.timeKeepingBond
		})
		this.state = {
			showTools: false
		}
	}

	handleToggle = () => {
		const { onSidebarToggle, sidebarVisible } = this.props
		onSidebarToggle(!sidebarVisible, false)
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
			sidebarVisible,
			timerActive,
			timerOnClick,
			wallets,
		} = this.props

		return (
			<div>
				<Menu attached="top" inverted> {/*fixed="top" */}
					{isMobile && (
						<Menu.Item
							icon={{ name: 'sidebar', size: 'big', className: 'no-margin' }}
							// on mobile when sidebar is visible toggle is not neccessary on-document-click it is already triggered
							onClick={sidebarVisible ? undefined : this.handleToggle}
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
