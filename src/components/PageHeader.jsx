import React, { Component, useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { Dropdown, Icon, Image, Menu } from 'semantic-ui-react'
import Balance from '../components/Balance'
// utils
import { arrSort, copyToClipboard, textEllipsis } from '../utils/utils'
// forms
import IdentityForm from '../forms/Identity'
import TimeKeepingForm from '../forms/TimeKeeping'
// services
import { getUser, loginBond } from '../services/chatClient'
import identities, { getSelected, setSelected } from '../services/identity'
import { getSelected as getSelectedLang, translated } from '../services/language'
import { showForm } from '../services/modal'
import {
	unreadCountBond as unreadMsgCountBond,
	visibleBond as chatVisibleBond,
} from '../modules/chat/chat'
import {
	newNotificationBond,
	visibleBond as notifVisibleBond,
	unreadCountBond as unreadNotifCountBond,
} from '../modules/notification/notification'
import { addToQueue, QUEUE_TYPES } from '../services/queue'
import { toggleSidebarState, setActive } from '../services/sidebar'
import timeKeeping from '../services/timeKeeping'
import { setToast } from '../services/toast'
import { useInverted, setInverted } from '../services/window'

const textsCap = translated({
	addressCopied: 'your identity copied to clipboard',
	changeCurrency: 'change display currency',
	copyAddress: 'copy my identity',
	darkModeOn: 'enable dark mode',
	darkModeOff: 'disable dark mode',
	faucetRequest: 'faucet request',
	faucetRequestDetails: 'requested transaction allocations',
	requestFunds: 'request Funds',
	updateIdentity: 'update identity',
}, true)[1]
export default class PageHeader extends Component {
	constructor(props) {
		super(props)

		this.state = {
			id: (getUser() || {}).id,
			isLoggedIn: !!loginBond._value,
			wallets: [],
		}

		this.originalSetState = this.setState
		this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
	}

	componentWillMount() {
		this._mounted = true
		identities.bond.tie(() => this.setState({
			wallets: identities.getAll()
		}))
		timeKeeping.formDataBond.tie(() => this.forceUpdate())

		// Update user ID after registration
		this.tieIdLogin = loginBond.tie(isLoggedIn => {
			const { id } = getUser()
			this.setState({ id, isLoggedIn })
		})
	}

	componentWillUnmount = () => this._mounted = false

	handleSelection = (_, { value: address }) => setSelected(address)

	handleCopy = () => {
		const { address } = getSelected()
		if (!address) return;
		copyToClipboard(address)
		const msg = { content: textsCap.addressCopied, status: 'success' }
		this.copiedMsgId = setToast(msg, 2000, this.copiedMsgId)
	}

	handleEdit = () => showForm(IdentityForm, {
		values: getSelected(),
		onSubmit: () => this.forceUpdate()
	})

	handleFaucetRequest = () => addToQueue({
		type: QUEUE_TYPES.CHATCLIENT,
		func: 'faucetRequest',
		title: textsCap.faucetRequest,
		description: textsCap.faucetRequestDetails,
		args: [getSelected().address]
	})

	render() {
		const { id, isLoggedIn, wallets } = this.state
		const viewProps = {
			userId: id,
			isLoggedIn,
			isRegistered: !!id,
			wallets,
			onCopy: this.handleCopy,
			onEdit: this.handleEdit,
			onFaucetRequest: this.handleFaucetRequest,
			onSelection: this.handleSelection,
		}
		return <PageHeaderView {...this.props} {...viewProps} />
	}
}

PageHeader.propTypes = {
	logoSrc: PropTypes.string,
	isMobile: PropTypes.bool,
}

PageHeader.defaultProps = {
	logoSrc: 'https://react.semantic-ui.com/images/wireframe/image.png'
}

const PageHeaderView = props => {
	const [showTools, setShowTools] = useState(false)
	const inverted = useInverted()
	const {
		userId,
		isLoggedIn,
		isMobile,
		isRegistered,
		logoSrc,
		onCopy,
		onEdit,
		onFaucetRequest,
		onSelection,
		wallets,
	} = props
	const selected = getSelected() || {}
	const buttons = <HeaderMenuButtons {...{ isLoggedIn, isMobile, isRegistered }} />
	const topBar = (
		<Menu
			attached="top"
			inverted
			style={{
				border: 'none',
				borderRadius: 0,
				margin: 0,
				width: '100%',
			}}
		>
			<Menu.Item>
				<Image size="mini" src={logoSrc} />
			</Menu.Item>
			<Menu.Menu position="right">
				{!isMobile && isRegistered && buttons}
				<Dropdown
					className='identity-dropdown'
					direction='left'
					item
					labeled
					onChange={onSelection}
					onClick={() => notifVisibleBond.changed(false)}
					text={textEllipsis(selected.name, isMobile ? 25 : 50, 3, false)}
					value={selected.address}
					style={{ paddingRight: 0 }}
					options={arrSort(wallets, 'name')
						.map(({ address, name }) => ({
							key: address,
							text: (
								<React.Fragment>
									<div style={{
										color: 'black',
										fontWeight: 'bold',
										marginRight: 15,
									}}>
										{name}
									</div>

									<Balance {...{
										address: address,
										EL: 'div',
										style: {
											color: 'grey',
											textAlign: 'right',
										}
									}} />
								</React.Fragment>
							),
							value: address
						}))}
				/>
				<Dropdown
					item
					text={getSelectedLang()}
					icon={{
						name: 'cog',//'chevron circle ' + (showTools ? 'up' : 'down'),
						size: 'large',
						// className: 'no-margin',
					}}
					onClick={() => setShowTools(!showTools) | notifVisibleBond.changed(false)}
				>
					<Dropdown.Menu className='left'>
						{
							[
								{
									icon: 'pencil',
									content: textsCap.updateIdentity,
									onClick: onEdit,
								},
								{
									icon: 'copy',
									content: textsCap.copyAddress,
									onClick: onCopy,
								},
								{
									icon: inverted ? 'toggle on' : 'toggle off',
									content: inverted ? textsCap.darkModeOff : textsCap.darkModeOn,
									onClick: () => setInverted(!inverted)
								},
								// userId && {
								// 	icon: 'gem',
								// 	content: textsCap.requestFunds,
								// 	onClick: onFaucetRequest,
								// },
								{
									icon: 'currency',
									content: textsCap.changeCurrency, // Better left un-translated
									onClick: () => setActive('settings'),
								},
								{
									icon: 'language',
									content: 'Change language', // Better left un-translated
									onClick: () => setActive('settings'),
								},
							]
								.filter(Boolean)
								.map((props, i) => <Dropdown.Item {...props} key={props.icon + i} />)
						}
					</Dropdown.Menu>
				</Dropdown>
			</Menu.Menu>
		</Menu>
	)

	if (!isMobile || !isRegistered) return topBar

	return (
		<div>
			{topBar}
			<Menu
				children={buttons}
				direction='bottom'
				fixed='bottom'
				inverted
				vertical={false}
				widths={5}
			/>
		</div>
	)
}

export const HeaderMenuButtons = ({ isLoggedIn, isMobile }) => {
	const [timerInProgress, setTimerActive] = useState(timeKeeping.formData().inprogress)
	const [unreadMsgCount, setUnreadMsgCount] = useState(unreadMsgCountBond._value)
	const [unreadNotifCount, setUnreadNotifCount] = useState(unreadNotifCountBond._value)
	const [notifBlink, setNotifBlink] = useState(false)
	const countStyle = {
		color: 'white',
		fontSize: 13,
		fontWeight: 'bold',
		left: 0,
		position: 'absolute',
		textAlign: 'center',
		top: isMobile ? 17 : 24,
		width: '100%',
	}

	useEffect(() => {
		const tieIdTimer = timeKeeping.formDataBond.tie(() => setTimerActive(!!timeKeeping.formData().inprogress))
		const tieIdUnreadMsg = unreadMsgCountBond.tie(unread => setUnreadMsgCount(unread))
		const tieIdUnreadNotif = unreadNotifCountBond.tie(unread => setUnreadNotifCount(unread))
		const tieIdNew = newNotificationBond.tie(() => {
			setNotifBlink(true)
			setTimeout(() => setNotifBlink(false), 5000)
		})

		return () => {
			timeKeeping.formDataBond.untie(tieIdTimer)
			unreadMsgCountBond.untie(tieIdUnreadMsg)
			unreadNotifCountBond.untie(tieIdUnreadNotif)
			newNotificationBond.untie(tieIdNew)
		}
	}, [])

	return (
		<React.Fragment>
			{isMobile && (
				<Menu.Item
					icon={{ name: 'sidebar', size: 'large', className: 'no-margin' }}
					onClick={toggleSidebarState}
				/>
			)}

			<Menu.Item
				icon={{
					className: 'no-margin',
					loading: timerInProgress,
					name: 'clock outline',
					size: 'large'
				}}
				onClick={() => showForm(TimeKeepingForm, {})}
			/>

			<Menu.Item {...{
				className: notifBlink ? 'blink' : '',
				disabled: unreadNotifCount === -1,
				onClick: () => setNotifBlink(false) | notifVisibleBond.changed(!notifVisibleBond._value),
				style: { background: unreadNotifCount > 0 ? '#2185d0' : '' }
			}}>
				<Icon {...{
					className: 'no-margin',
					color: unreadNotifCount === -1 ? 'grey' : undefined,
					name: 'bell',
					size: 'large',
				}} />
				{unreadNotifCount > 0 && <div style={{ ...countStyle, color: '#2185d0' }}>{unreadNotifCount}</div>}
			</Menu.Item>

			<Menu.Item onClick={() => {
				chatVisibleBond.changed(!chatVisibleBond._value)
				notifVisibleBond.changed(false)
			}}>
				<Icon {...{
					className: 'no-margin',
					color: !isLoggedIn ? 'red' : (unreadMsgCount > 0 ? 'blue' : undefined),
					name: 'chat',
					size: 'large'
				}} />
				{unreadMsgCount > 0 && <div style={countStyle}>{unreadMsgCount}</div>}
			</Menu.Item>
		</React.Fragment>
	)
}