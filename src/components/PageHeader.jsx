import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import { Dropdown, Icon, Image, Menu } from 'semantic-ui-react'
// utils
import { arrSort, className, copyToClipboard, textEllipsis } from '../utils/utils'
// forms
import IdentityForm from '../modules/identity/IdentityForm'
import TimekeepingForm from '../modules/timekeeping/TimekeepingForm'
import SettingsForm, { inputNames as settingsInputNames} from '../forms/Settings'
// modules
import {
	rxUnreadCount as rxUnreadMsgCount,
	rxVisible as rxChatVisible,
} from '../modules/chat/chat'
import { getUser, rxIsLoggedIn } from '../modules/chat/ChatClient'
import Balance from '../modules/identity/Balance'
import { getSelected, setSelected, rxIdentities } from '../modules/identity/identity'
import {
	rxNewNotification,
	rxVisible as rxNotifVisible,
	rxUnreadCount as rxUnreadNotifCount,
} from '../modules/notification/notification'
import { rxTimerInProgress } from '../modules/timekeeping/timekeeping'
// services
import { getSelected as getSelectedLang, translated } from '../services/language'
import { showForm } from '../services/modal'
import { addToQueue, QUEUE_TYPES } from '../services/queue'
import { unsubscribe, useRxSubject } from '../services/react'
import { toggleSidebarState } from '../services/sidebar'
import { setToast } from '../services/toast'
import { useInverted, rxInverted, rxLayout, MOBILE } from '../services/window'

const textsCap = translated({
	addressCopied: 'your identity copied to clipboard',
	changeCurrency: 'change display currency',
	copyAddress: 'copy my identity',
	darkModeOn: 'theme: light',
	darkModeOff: 'theme: dark',
	faucetRequest: 'faucet request',
	faucetRequestDetails: 'requested transaction allocations',
	requestFunds: 'request funds',
	updateIdentity: 'update identity',
}, true)[1]
let copiedMsgId
export const rxIdentityListVisible = new BehaviorSubject(false)

export default function PageHeader(props) {
	const [wallets] = useRxSubject(rxIdentities, map => Array.from(map).map(([_, x]) => x))
	const [isMobile] = useRxSubject(rxLayout, l => l === MOBILE)
	const [[userId, isLoggedIn]] = useRxSubject(rxIsLoggedIn, isLoggedIn => ([
		(getUser() || {}).id,
		isLoggedIn,
	]))
	const viewProps = {
		...props,
		userId,
		isLoggedIn,
		isMobile,
		isRegistered: !!userId,
		wallets,
		onCopy: () => {
			const { address } = getSelected()
			if (!address) return
			copyToClipboard(address)
			const msg = { content: textsCap.addressCopied, status: 'success' }
			copiedMsgId = setToast(msg, 2000, copiedMsgId)
		},
		onEdit: () => showForm(IdentityForm, { values: getSelected() }),
		onFaucetRequest: () => addToQueue({
			type: QUEUE_TYPES.CHATCLIENT,
			func: 'faucetRequest',
			title: textsCap.faucetRequest,
			description: textsCap.faucetRequestDetails,
			args: [getSelected().address]
		}),
		onSelection: (_, { value: address }) => setSelected(address),
	}
	return <PageHeaderView {...viewProps} />
}

PageHeader.propTypes = {
	logoSrc: PropTypes.string,
}
PageHeader.defaultProps = {
	logoSrc: 'https://react.semantic-ui.com/images/wireframe/image.png'
}

const PageHeaderView = props => {
	const [open] = useRxSubject(rxIdentityListVisible)
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
	const walletOptions = arrSort(wallets || [], 'name')
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
						showDetailed: null,
						style: {
							color: 'grey',
							textAlign: 'right',
						}
					}} />
				</React.Fragment>
			),
			value: address
		}))
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
			<Menu.Item onClick={!isRegistered || !isMobile ? undefined : toggleSidebarState}>
				<Image size="mini" src={logoSrc} />
			</Menu.Item>
			<Menu.Menu position="right">
				{!isMobile && isRegistered && buttons}
				<Dropdown {...{
					className: 'identity-dropdown',
					closeOnBlur: true,
					closeOnChange: true,
					closeOnEscape: true,
					direction: 'left',
					item: true,
					labeled: true,
					onChange: onSelection,
					onClose:  () => rxIdentityListVisible.next(false),
					onClick: () => {
						rxIdentityListVisible.next(!rxIdentityListVisible.value)
						rxNotifVisible.next(false)
					},
					open,
					options: walletOptions,
					selectOnNavigation: false,
					style: { paddingRight: 0 },
					text: textEllipsis(selected.name, isMobile ? 25 : 50, 3, false),
					value: selected.address,
				}} />
				<Dropdown
					item
					text={getSelectedLang()}
					icon={{
						name: 'cog',//'chevron circle ' + (showTools ? 'up' : 'down'),
						size: 'large',
						// className: 'no-margin',
					}}
					onClick={() => setShowTools(!showTools) | rxNotifVisible.next(false)}
				>
					<Dropdown.Menu className='left'>
						{[
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
								icon: !inverted ? 'moon outline' : 'moon',
								content: inverted ? textsCap.darkModeOff : textsCap.darkModeOn,
								onClick: () => rxInverted.next(!inverted)
							},
							userId && {
								icon: 'gem',
								content: textsCap.requestFunds,
								onClick: onFaucetRequest,
							},
							{
								icon: 'currency',
								content: textsCap.changeCurrency,
								onClick: () => showForm(SettingsForm, {
									header: null, //textsCap.changeCurrency,
									inputsHidden: Object.values(settingsInputNames)
										.filter(x => x !== settingsInputNames.currency),
									size: 'mini',
								}),
							},
							{
								icon: 'language',
								content: 'Change language', // Better left un-translated
								onClick: () => showForm( SettingsForm, {
									header: null,// 'Change language',
									inputsHidden: Object.values(settingsInputNames)
										.filter(x => x !== settingsInputNames.languageCode),
									size: 'mini',
								}),
							},
						].filter(Boolean).map((props, i) =>
							<Dropdown.Item {...props} key={props.icon + i} />
						)}
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
	const [timerInProgress] = useRxSubject(rxTimerInProgress)
	const [unreadMsgCount] = useRxSubject(rxUnreadMsgCount)
	const [unreadNotifCount] = useRxSubject(rxUnreadNotifCount)
	const [notifBlink, setNotifBlink] = useState(false)
	const [notifVisible] = useRxSubject(rxNotifVisible)
	const [chatVisible] = useRxSubject(rxChatVisible)
	const countStyle = {
		...styles.countStyle,
		top: isMobile ? 17 : styles.countStyle.top,
	}

	useEffect(() => {
		let mounted = true
		const subscriptions = {}
		subscriptions.newNotif = rxNewNotification.subscribe(() => {
			if (!mounted) return
			setNotifBlink(true)
			setTimeout(() => setNotifBlink(false), 5000)
		})

		return () => {
			mounted = false
			unsubscribe(subscriptions)
		}
	}, [])

	return (
		<React.Fragment>
			{isMobile && (
				<Menu.Item {...{
					icon: {
						name: 'sidebar',
						size: 'large',
						className: 'no-margin',
					},
					onClick: () => {
						toggleSidebarState()
						// hide notification and chat
						rxChatVisible.next(false)
						rxNotifVisible.next(false)
					}
				}} />
			)}

			<Menu.Item
				icon={{
					className: 'no-margin',
					loading: timerInProgress,
					name: 'clock outline',
					size: 'large'
				}}
				onClick={() => showForm(TimekeepingForm, {})}
			/>

			<Menu.Item {...{
				active: !!notifVisible,
				className: className([
					notifBlink ? 'blink' : '',
					'shake-trigger',
				]),
				disabled: unreadNotifCount === -1,
				onClick: () => setNotifBlink(false) | rxNotifVisible.next(!rxNotifVisible.value),
				style: { background: unreadNotifCount > 0 ? '#2185d0' : '' }
			}}>
				<Icon {...{
					className: className([
						'no-margin',
						unreadNotifCount && 'shake',
						notifBlink && 'shake forever',
					]),
					color: unreadNotifCount === -1 ? 'grey' : undefined,
					name: 'bell',
					size: 'large',
				}} />
				{unreadNotifCount > 0 && (
					<div style={{ ...countStyle, color: '#2185d0' }}>
						{unreadNotifCount}
					</div>
				)}
			</Menu.Item>

			<Menu.Item {...{ active: chatVisible }}
				onClick={() => {
				rxChatVisible.next(!rxChatVisible.value)
				rxNotifVisible.next(false)
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

const styles = {
	countStyle: {
		color: 'white',
		fontSize: 13,
		fontWeight: 'bold',
		left: 0,
		position: 'absolute',
		textAlign: 'center',
		top: 24,
		width: '100%',
	}
}