import React, {
	isValidElement,
	useCallback,
	useState,
} from 'react'
import PropTypes from 'prop-types'
import { Button } from 'semantic-ui-react'
import {
	deferred,
	isFn,
	isTouchable,
	objWithoutKeys,
} from '../utils/utils'
import { getRawUserID } from './UserIdInput'
// forms
import IdentityRequestForm from '../modules/identity/IdentityRequestForm'
import IdentityShareForm from '../modules/identity/IdentityShareForm'
import IntroduceUserForm from '../modules/identity/IntroduceUserForm'
// services
import { translated } from '../services/language'
import {
	showForm,
	closeModal,
	showInfo,
} from '../services/modal'
import { createInbox } from '../modules/chat/chat'
import {
	get as getPartner,
	getByUserId,
} from '../modules/partner/partner'
import PartnerForm from '../modules/partner/PartnerForm'
import { getUser } from '../modules/chat/ChatClient'
import { useInverted } from '../services/window'
import Holdable from './Holdable'
import PartnerIcon from '../modules/partner/PartnerIcon'

let textsCap = {
	accept: 'accept',
	clickToChat: 'click to chat',
	identityRequest: 'request identity',
	identityShare: 'share identity',
	introduce: 'introduce',
	or: 'or',
	partner: 'partner',
	partnerAdd: 'add partner',
	partnerUpdate: 'update partner',
	reject: 'reject',
	userIdBtnTitle: 'click for more options',
}
textsCap = translated(textsCap, true)[1]

export const ButtonAcceptOrReject = React.memo(function ButtonAcceptOrReject(props) {
	const {
		acceptColor,
		acceptProps,
		acceptText,
		ignoreAttributes,
		loading,
		rejectColor,
		rejectProps,
		rejectText,
	} = props

	return (
		<ButtonGroup {...{
			...props,
			buttons: [
				{
					...acceptProps,
					content: acceptText,
					color: acceptColor,
					loading: loading,
				},
				{
					...rejectProps,
					content: rejectText,
					color: rejectColor,
					loading: loading,
				},
			],
			ignoreAttributes: [
				...ignoreAttributes,
				...ButtonGroup.defaultProps.ignoreAttributes,
			],
			or: true,
			values: [true, false],
		}} />
	)
})
ButtonAcceptOrReject.propTypes = {
	acceptColor: PropTypes.string, // colors supported by SemanticUI buttons
	acceptText: PropTypes.string,
	ignoreAttributes: PropTypes.arrayOf(PropTypes.string).isRequired,
	onAction: PropTypes.func.isRequired,
	rejectColor: PropTypes.string, // colors supported by SemanticUI buttons
	rejectText: PropTypes.string,
}
ButtonAcceptOrReject.defaultProps = {
	acceptColor: 'green',
	acceptText: textsCap.accept,
	ignoreAttributes: [
		'acceptColor',
		'acceptProps',
		'acceptText',
		'ignoreAttributes',
		'rejectColor',
		'rejectProps',
		'rejectText',
	],
	rejectColor: 'red',
	rejectText: textsCap.reject,
}

/**
 * @name    ButtonGroup
 * @summary Shorthand for Or button group
 *
 * @param   {Object}    props see `ButtonGroup.propTypes` for accepted props
 *
 * @returns {Element}
 */
export const ButtonGroup = React.memo(function ButtonGroup(props){
	const inverted = useInverted()
	const {
		buttons,
		disabled,
		El,
		ignoreAttributes,
		loading,
		onAction,
		or,
		orText,
		values = [],
	} = props
	const buttonsEl = buttons.map((button, i) => {
		button = (isValidElement(button)
			? button.props
			: button)
		return [
			or && i > 0 && (
				<Button.Or {...{
					key: 'or',
					onClick: e => e.stopPropagation(),
					text: orText,
				}} />
			),
			<Button {...{
				key: 'btn',
				...button,
				disabled: button.disabled || disabled,
				loading: button.loading || loading,
				onClick: event => {
					event.stopPropagation()
					event.preventDefault()
					isFn(button.onClick) && button.onClick(event, values[i])
					isFn(onAction) && onAction(event, values[i])
				},
			}} />,
		].filter(Boolean)
	})
	return (
		<El {...objWithoutKeys(
			{
				...props,
				children: buttonsEl,
				inverted,
			},
			ignoreAttributes
		)} />
	)
})
ButtonGroup.propTypes = {
	buttons: PropTypes.arrayOf(PropTypes.object).isRequired,
	El: PropTypes.oneOfType([PropTypes.string, PropTypes.func]).isRequired,
	ignoreAttributes: PropTypes.arrayOf(PropTypes.string).isRequired,
	loading: PropTypes.bool,
	// @onAction triggered whenever any of the @buttons are clicked.
	//          Arguments:
	//          @value  value specified for the button in the @values array
	//          @event  synthetic event
	onAction: PropTypes.func,
	or: PropTypes.bool,
	orText: PropTypes.string,
	// @values: specific value to be passed on when @onClick is triggered for the respective button index
	values: PropTypes.array,
}
ButtonGroup.defaultProps = {
	buttons: [],
	El: Button.Group,
	ignoreAttributes: [
		'buttons',
		'El',
		'ignoreAttributes',
		'loading',
		'onAction',
		'or',
		'orText',
		'values',
	],
	orText: textsCap.or.toLowerCase(),
}

/**
 * @name    ButtonGroupOr
 * @summary shorthand for `ButtonGroup` with property `or = true`
 *
 * @param   {Object} props
 *
 * @returns {Element}
 */
export const ButtonGroupOr = function ButtonGroupOr(props) {
	return <ButtonGroup {...props} or={true} />
}

export const Reveal = React.memo(function Reveal(props){
	let {
		children,
		content = children,
		contentHidden,
		defaultVisible,
		defer,
		El,
		exclusive,
		ignoreAttributes,
		onClick,
		onMouseEnter,
		onMouseOver,
		onMouseOut,
		onMouseLeave,
		onTouchStart,
		ready,
		style,
		toggleOnClick,
		toggleOnHold,
		toggleOnHover,
	} = props
	const [visible, setVisible] = useState(defaultVisible)
	const getContent = useCallback(c => isFn(c) ? c() : c)
	const _setVisible = useCallback(
		defer > 0 
			? deferred(setVisible, defer)
			: setVisible,
		[setVisible]
	)
	const triggerEvent = useCallback((func, show) => async (...args) => {
		const _ready = await (isFn(ready) ? ready() : ready)
		if (!_ready) return

		isFn(func) && func(...args)
		_setVisible(show)
	}, [_setVisible, ready, visible])
	
	children = !visible
		? getContent(content)
		: exclusive
			? getContent(contentHidden)
			: [
				<span key='c'>{getContent(content)}</span>,
				<span {...{
					key: 'ch',
					onClick: !exclusive
						? undefined
						: (e => e.preventDefault() | e.stopPropagation())
				}}>
					{getContent(contentHidden)}
				</span>
			]

	const touchable = isTouchable()
	const elProps = {
		...objWithoutKeys(props, ignoreAttributes),
		children,
		...toggleOnClick && {
			onClick: !touchable
				? triggerEvent(onClick, !visible)
				: onClick,
			onTouchStart: touchable
				? triggerEvent(onTouchStart, !visible)
				: onTouchStart,
		},
		...toggleOnHover && {
			onMouseEnter: triggerEvent(onMouseEnter, true),
			onMouseLeave: triggerEvent(onMouseLeave, false),
			// onMouseOver: triggerEvent(onMouseOver, true),
			// onMouseOut:  triggerEvent(onMouseOut, false),
		},
		style: {
			cursor: 'pointer',
			...style,
		},
	}
	if (toggleOnHold) {
		elProps.El = El
		El = Holdable
		elProps.onHold = triggerEvent(null, !visible)
	}
	return <El {...elProps} />
})
Reveal.propTypes = {
	// content to show when visible
	content: PropTypes.any,
	// content to show when not visible
	contentHidden: PropTypes.any.isRequired,
	// initial state of `hiddenContent`
	defaultVisible: PropTypes.any,
	defer: PropTypes.number,
	El: PropTypes.oneOfType([
		PropTypes.elementType,
		PropTypes.func,
		PropTypes.string,
	]).isRequired,
	// whether to only display `content` and `hiddenContent` together or exclusively
	exclusive: PropTypes.bool,
	ignoreAttributes: PropTypes.arrayOf(PropTypes.string).isRequired,
	// will not display hiddenContent until ready is truthy
	ready: PropTypes.oneOfType([
		PropTypes.bool,
		PropTypes.func,
	]),
	// whether to trigger visibility on mouse click
	toggleOnClick: PropTypes.bool,
	// whether to triggler visibility on touch and hold
	toggleOnHold: PropTypes.bool,
	// whether to trigger visibility on mouse enter and leave
	toggleOnHover: PropTypes.bool,
}
Reveal.defaultProps = {
	defaultVisible: false,
	defer: 200,
	El: 'span',
	exclusive: true,
	ignoreAttributes: [
		'content',
		'contentHidden',
		'defaultVisible',
		'El',
		'exclusive',
		'onClick',
		'ready',
		'ignoreAttributes',
		'toggleOnClick',
		'toggleOnHold',
		'toggleOnHover',
	],
	ready: true,
	toggleOnClick: false,
	toggleOnHold: false,
	toggleOnHover: true,
}

export const UserID = React.memo(function UserId(props) {
	const {
		address,
		El,
		ignoreAttributes,
		onClick,
		prefix,
		style,
		suffix,
		userId,
	} = props
	const rawId = getRawUserID(userId)
	if (!rawId) return ''

	const isOwnId = (getUser() || {}).id === rawId
	const allowClick = onClick !== null && !isOwnId

	return (
		<El {...{
			...objWithoutKeys(props, ignoreAttributes),
			children: (
				<b>
					{prefix}@{rawId}
					{suffix}
				</b>
			),
			draggable: true,
			onClick: !allowClick
				? undefined
				: e => e.stopPropagation()
					| UserID.showModal(userId, address),
			onDragStart: e => {
				e.stopPropagation()
				e.dataTransfer.setData('Text', rawId)
			},
			style: {
				cursor: allowClick && 'pointer',
				fontWeight: 'bold',
				padding: 0,
				...style,
			},
			title: !allowClick
				? userId
				: textsCap.userIdBtnTitle,
		}} />
	)
})
UserID.propTypes = {
	//@address partner identity
	address: PropTypes.string,
	El: PropTypes.oneOfType([
		PropTypes.string,
		PropTypes.func,
		PropTypes.object, //for React.memo elements
	]).isRequired,
	ignoreAttributes: PropTypes.arrayOf(PropTypes.string),
	// @onClick use `null` to prevent showing modal
	onClick: PropTypes.func,
	prefix: PropTypes.oneOfType([
		PropTypes.element,
		PropTypes.number,
		PropTypes.string,
	]),
	style: PropTypes.object,
	suffix: PropTypes.oneOfType([
		PropTypes.element,
		PropTypes.number,
		PropTypes.string,
	]),
	userId: PropTypes.string,
}
UserID.defaultProps = {
	El: 'span',
	ignoreAttributes: [
		'El',
		'ignoreAttributes',
		'prefix',
		'suffix',
		'userId',
	],
}
UserID.showModal = (userId, partnerAddress) => {
	const partner = partnerAddress
		? getPartner(partnerAddress)
		: getByUserId(userId)
	const {
		address,
		name = '',
		type,
		visibility,
	} = partner || {}
	const addButtons = !name && [
		{
			content: textsCap.partnerAdd,
			icon: 'user plus',
			onClick: () => showForm(PartnerForm, {
				// prevent form modal to auto close
				closeOnSubmit: false,
				// after successfully adding partner close the original modal (confirm)
				onSubmit: ok => ok && closeModal(modalId),
				values: { userId },
			}),
			title: textsCap.partnerAdd,
		},
		{
			content: textsCap.identityRequest,
			icon: 'download',
			onClick: () => showForm(IdentityRequestForm, {
				values: { userIds: [userId] },
			}),
			title: textsCap.identityRequest,
		},
	]
	const buttons = [
		{
			content: textsCap.identityShare,
			icon: 'share',
			onClick: () => showForm(IdentityShareForm, {
				values: { userIds: [userId] },
			}),
			title: textsCap.identityShare,
		},
		{
			content: textsCap.introduce,
			icon: 'handshake',
			onClick: () => showForm(IntroduceUserForm, { values: { userId } }),
			title: textsCap.introduce,
		},
	].filter(Boolean)

	const content = (
		<div>
			<div>
				{addButtons && (
					<ButtonGroupOr {...{
						fluid: true,
						buttons: addButtons
					}} />
				)}
				<ButtonGroup {...{
					fluid: true,
					buttons: buttons.map(props => ({
						key: props.content,
						...props,
					})),
				}} />
			</div>
		</div>
	)
	const header = (
		<div className='header'>
			<span style={{ textTransform: 'lowercase' }}>
				@{userId + ' '}
			</span>
			<Button {...{
				circular: true,
				icon: 'chat',
				onClick: () =>
					closeModal(modalId) |
					createInbox([userId], null, true),
				size: 'mini',
				title: textsCap.clickToChat,
			}} />
			<div>
				{name && (
					<small>
						<b>{textsCap.partner}: </b>
						<PartnerIcon {...{
							address,
							type,
							visibility,
						}} />
						{` ${name} `}
						<Button {...{
							circular: true,
							icon: 'pencil',
							size: 'mini',
							title: textsCap.partnerUpdate,
							onClick: () => showForm(PartnerForm, {
								autoSave: true,
								values: {
									address,
									userId,
									name,
								},
							}),
						}} />
					</small>
				)}
			</div>
		</div>
	)
	const modalId = showInfo(
		{
			content,
			header,
			size: 'mini',
		},
		undefined,
		{
			style: { padding: 1 },
		},
	)
}
