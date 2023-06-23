import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import {
	Dropdown,
	Icon,
	Image,
	Menu,
} from 'semantic-ui-react'
import SettingsForm, { inputNames as settingsInputNames } from '../forms/Settings'
// modules
import {
	rxUnreadCount as rxUnreadMsgCount,
	rxVisible as rxChatVisible,
} from '../modules/chat/chat'
import { getIdentityOptions } from '../modules/identity/getIdentityOptions'
import {
	getSelected,
	setSelected,
	rxIdentities,
} from '../modules/identity/identity'
import IdentityForm from '../modules/identity/IdentityForm'
import IdentityShareForm from '../modules/identity/IdentityShareForm'
import { getSelected as getSelectedLang, translated } from '../utils/languageHelper'
import {
	rxNewNotification,
	rxVisible as rxNotifVisible,
	rxUnreadCount as rxUnreadNotifCount,
} from '../modules/notification/notification'
import { rxTimerInProgress } from '../modules/timekeeping/timekeeping'
import TimekeepingForm from '../modules/timekeeping/TimekeepingForm'
// services
import { showForm } from '../services/modal'
import { addToQueue, QUEUE_TYPES } from '../services/queue'
import { toggleSidebarState } from '../services/sidebar'
import { setToast } from '../services/toast'
// utils
import {
	getUser,
	rxIsInMaintenanceMode,
	rxIsLoggedIn,
} from '../utils/chatClient'
import { unsubscribe, useRxSubject } from '../utils/reactjs'
import {
	className,
	copyToClipboard,
	textEllipsis,
} from '../utils/utils'
import {
	MOBILE,
	rxInverted,
	rxLayout,
	setInvertedBrowser,
	useInverted,
} from '../utils/window'

const textsCap = {
	addressCopied: 'your identity copied to clipboard',
	changeCurrency: 'change display currency',
	copyAddress: 'copy my identity',
	darkMode: 'dark mode',

	faucetRequest: 'faucet request',
	faucetRequestDetails: 'requested transaction allocations',
	requestFunds: 'request funds',
	shareIdentity: 'share my identity',
	updateIdentity: 'update identity',
}
const texts = {
	on: 'on',
	off: 'off',
	auto: 'auto',
}
translated(textsCap, true)
let copiedMsgId
export const rxIdentityListVisible = new BehaviorSubject(false)

function PageHeader(props) {
	const [identityOptions] = useRxSubject(
		rxIdentities,
		getIdentityOptions,
	)
	const [isMobile] = useRxSubject(rxLayout, l => l === MOBILE)
	const [[userId, isLoggedIn]] = useRxSubject(
		rxIsLoggedIn,
		isLoggedIn => ([
			(getUser() || {}).id,
			isLoggedIn,
		])
	)
	const viewProps = {
		...props,
		userId,
		isLoggedIn,
		isMobile,
		isRegistered: !!userId,
		identityOptions,
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
			// description: textsCap.faucetRequestDetails,
			args: [getSelected().address]
		}),
		onSelection: (_, { value: address }) => setSelected(address),
		onShare: () => showForm(IdentityShareForm, { values: getSelected() })
	}

	return <PageHeaderView {...viewProps} />
}

PageHeader.propTypes = {
	logoSrc: PropTypes.string,
}
PageHeader.defaultProps = {
	logoSrc: 'https://react.semantic-ui.com/images/wireframe/image.png'
}
export default React.memo(PageHeader)

const PageHeaderView = React.memo(props => {
	const [open] = useRxSubject(rxIdentityListVisible)
	const [showTools, setShowTools] = useState(false)
	const inverted = useInverted()
	const [invBrowser, setInvBrowser] = useState(() => setInvertedBrowser())
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
		onShare,
		identityOptions,
	} = props
	const selected = getSelected() || {}
	const buttons = <HeaderMenuButtons {...{ isLoggedIn, isMobile, isRegistered }} />
	const langCode = getSelectedLang() || ''
	const topBar = (
		<Menu
			attached='top'
			inverted
			style={{
				border: 'none',
				borderRadius: 0,
				margin: 0,
				width: '100%',
			}}
		>
			<Menu.Item onClick={!isRegistered || !isMobile ? undefined : toggleSidebarState}>
				<Image size='mini' src={logoSrc} />
			</Menu.Item>
			<Menu.Menu position='right'>
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
					onClose: () => rxIdentityListVisible.next(false),
					onClick: () => {
						rxIdentityListVisible.next(!rxIdentityListVisible.value)
						rxNotifVisible.next(false)
					},
					open,
					options: identityOptions,
					selectOnNavigation: false,
					style: { paddingRight: 0 },
					text: textEllipsis(
						selected.name,
						25,
						3,
						false,
					),
					value: selected.address,
				}} />
				<Dropdown {...{
					item: true,
					icon: {
						name: 'cog',//'chevron circle ' + (showTools ? 'up' : 'down'),
						size: 'large',
						// className: 'no-margin',
					},
					onClick: () => setShowTools(!showTools) | rxNotifVisible.next(false),
					text: langCode,
				}}

				>
					<Dropdown.Menu className='left'>
						{[
							{
								icon: 'pencil',
								content: textsCap.updateIdentity,
								onClick: onEdit,
							},
							{
								icon: 'share',
								content: textsCap.shareIdentity,
								onClick: onShare,
							},
							{
								icon: 'copy',
								content: textsCap.copyAddress,
								onClick: onCopy,
							},
							{
								icon: !inverted
									? 'moon outline'
									: 'moon',
								content: (
									<div style={{ display: 'inline-block' }}>
										{textsCap.darkMode}: {inverted ? texts.off : texts.on}
										&nbsp;
										({invBrowser
											? <b>{texts.auto}</b>
											: (
												<a {...{
													onClick: e => {
														e.preventDefault()
														e.stopPropagation()
														setInvBrowser(true)
														setInvertedBrowser(true)
													},
													style: { cursor: 'pointer' },
												}}>
													{texts.auto}
												</a>
											)})
									</div>
								),
								onClick: () => {
									rxInverted.next(!inverted)
									setInvBrowser(false)
								}
							},
							// userId && {
							// 	icon: 'gem',
							// 	content: textsCap.requestFunds,
							// 	onClick: onFaucetRequest,
							// },
							{
								icon: 'currency',
								content: textsCap.changeCurrency,
								onClick: () => showForm(SettingsForm, {
									header: null, //textsCap.changeCurrency,
									inputsHidden: Object.values(settingsInputNames)
										.filter(x =>
											![
												settingsInputNames.currency,
												settingsInputNames.currencyHtml
											].includes(x)
										),
									size: 'mini',
								}),
							},
							{
								icon: 'language',
								content: `Change language (${langCode})`, // Better left un-translated
								onClick: () => showForm(SettingsForm, {
									header: null,// 'Change language',
									inputsHidden: Object.values(settingsInputNames)
										.filter(x => x !== settingsInputNames.languageCode),
									size: 'mini',
								}),
							},
						]
							.filter(Boolean)
							.map((props, i) =>
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
})

export const HeaderMenuButtons = React.memo(({ isLoggedIn, isMobile }) => {
	const [timerInProgress] = useRxSubject(rxTimerInProgress)
	const [unreadMsgCount] = useRxSubject(rxUnreadMsgCount)
	const [unreadNotifCount] = useRxSubject(rxUnreadNotifCount)
	const [notifBlink, setNotifBlink] = useState(false)
	const [notifVisible] = useRxSubject(rxNotifVisible)
	const [chatVisible] = useRxSubject(rxChatVisible)
	const [maintenanceMode] = useRxSubject(rxIsInMaintenanceMode)
	const countStyle = {
		...styles.countStyle,
		top: isMobile
			? 17
			: styles.countStyle.top,
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
					color: timerInProgress && 'yellow' || undefined,
					className: 'no-margin',
					loading: timerInProgress,
					name: 'clock outline',
					size: 'large',
				}}
				onClick={() => showForm(TimekeepingForm, {})}
			/>

			<Menu.Item {...{
				active: !!notifVisible,
				className: className([
					notifBlink
						? 'blink'
						: '',
					'shake-trigger',
				]),
				disabled: unreadNotifCount === -1,
				onClick: () => setNotifBlink(false) | rxNotifVisible.next(!rxNotifVisible.value),
				style: {
					background: unreadNotifCount > 0
						? '#2185d0'
						: ''
				}
			}}>
				<Icon {...{
					className: className({
						'no-margin': true,
						'shake': unreadNotifCount,
						'shake forever': notifBlink,
					}),
					color: maintenanceMode
						? 'yellow'
						: unreadNotifCount === -1
							? 'grey'
							: undefined,
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
					color: maintenanceMode
						? 'yellow'
						: !isLoggedIn
							? 'red'
							: unreadMsgCount > 0
								? 'blue'
								: undefined,
					name: 'chat',
					size: 'large'
				}} />
				{unreadMsgCount > 0 && <div style={countStyle}>{unreadMsgCount}</div>}
			</Menu.Item>
		</React.Fragment>
	)
})

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