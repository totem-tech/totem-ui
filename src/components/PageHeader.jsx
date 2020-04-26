import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { runtime } from 'oo7-substrate'
import { Dropdown, Image, Menu } from 'semantic-ui-react'
import Currency from '../components/Currency'
// utils
import { arrSort, copyToClipboard, textEllipsis } from '../utils/utils'
// forms
import IdentityForm from '../forms/Identity'
import TimeKeepingForm from '../forms/TimeKeeping'
// services
import { getUser, getClient, onLogin } from '../services/chatClient'
import identities, { getSelected, setSelected } from '../services/identity'
import { translated } from '../services/language'
import { showForm } from '../services/modal'
import NotificationDropdown from '../services/notification'
import { addToQueue, QUEUE_TYPES } from '../services/queue'
import { toggleSidebarState } from '../services/sidebar'
import timeKeeping from '../services/timeKeeping'
import { setToast } from '../services/toast'

// const [words, wordsCap] = translated({}, true)
const [texts] = translated({
	addressCopied: 'Address copied to clipboard',
	copyAddress: 'Copy Address',
	faucetRequest: 'Faucet request',
	faucetRequestDetails: 'Requested transaction allocations',
	requestFunds: 'Request Funds',
	updateIdentity: 'Update Identity',
})
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
		this._mounted = true
		identities.bond.tie(() => this.setState({
			wallets: identities.getAll()
		}))
		timeKeeping.formDataBond.tie(() => this.forceUpdate())
	}

	componentWillUnmount = () => this._mounted = false

	handleSelection = (_, { value: address }) => setSelected(address)

	handleCopy = () => {
		const { address } = getSelected()
		if (!address) return;
		copyToClipboard(address)
		const msg = { content: texts.addressCopied, status: 'success' }
		this.copiedMsgId = setToast(msg, 2000, this.copiedMsgId)
	}

	handleEdit = () => showForm(IdentityForm, {
		values: getSelected(),
		onSubmit: () => this.forceUpdate()
	})

	handleFaucetRequest = () => addToQueue({
		type: QUEUE_TYPES.CHATCLIENT,
		func: 'faucetRequest',
		title: texts.faucetRequest,
		description: texts.faucetRequestDetails,
		args: [getSelected().address]
	})

	render() {
		const { id, wallets } = this.state
		const viewProps = {
			id,
			onCopy: this.handleCopy,
			onEdit: this.handleEdit,
			onFaucetRequest: this.handleFaucetRequest,
			onSelection: this.handleSelection,
			timerActive: timeKeeping.formData().inprogress,
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
		const selected = getSelected()

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
									onChange={onSelection}
									text={!isMobile ? selected.name : textEllipsis(selected.name, 7, 3, false)}
									value={selected.address}
									options={arrSort(
										wallets.map(({ address, name }) => ({
											key: address,
											text: name,
											description: runtime.balances && <Currency address={address} />,
											value: address
										})),
										'text'
									)}
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
									content={texts.updateIdentity}
									onClick={onEdit}
								/>
								<Dropdown.Item
									icon="copy"
									content={texts.copyAddress}
									onClick={onCopy}
								/>
								{id && [
									<Dropdown.Item
										key="0"
										icon="gem"
										content={texts.requestFunds}
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
