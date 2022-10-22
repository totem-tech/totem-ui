import React, { useCallback, useState } from 'react'
import PropTypes from 'prop-types'
import { Button } from 'semantic-ui-react'
import { isBool, isFn, objWithoutKeys } from '../utils/utils'
import { getRawUserID } from './UserIdInput'
// forms
import IdentityRequestForm from '../modules/identity/IdentityRequestForm'
import IdentityShareForm from '../modules/identity/IdentityShareForm'
import IntroduceUserForm from '../modules/chat/IntroduceUserForm'
// services
import { translated } from '../services/language'
import { confirm, showForm, closeModal } from '../services/modal'
import { createInbox } from '../modules/chat/chat'
import { get as getPartner, getByUserId } from '../modules/partner/partner'
import PartnerForm from '../modules/partner/PartnerForm'
import { getUser } from '../modules/chat/ChatClient'
import { MOBILE, rxLayout, useInverted } from '../services/window'
import { useRxSubject } from '../utils/reactHelper'

const [texts, textsCap] = translated({
	accept: 'accept',
	close: 'close',
	identityRequest: 'request identity',
	identityShare: 'share identity',
	introduce: 'introduce',
	or: 'or',
	partnerAdd: 'add partner',
	partnerName: 'partner name',
	partnerUpdate: 'update partner',
	reject: 'reject',
	userIdBtnTitle: 'click for more options',
}, true)

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
		<ButtonGroup
			{...{
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
			}}
		/>
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
	const buttonsEl = buttons.map((button, i) =>
		[
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
	)
	return (
		<El {...objWithoutKeys(
			{ ...props, children: buttonsEl, inverted },
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
	orText: texts.or,
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
		El,
		exclusive,
		ignoreAttributes,
		onClick,
		onMouseHover,
		onMouseEnter,
		onMouseLeave,
		onTouchEnd,
		onTouchStart,
		ready,
		style,
		toggleOnClick,
		toggleOnHover,
	} = props
	const [visible, setVisible] = useState(defaultVisible)
	const getContent = useCallback(c => isFn(c) ? c() : c)
	const triggerEvent = useCallback((func, show) => async (...args) => {
		const _ready = await (isFn(ready) ? ready() : ready)
		if (!_ready) return

		isFn(func) && func(...args)
		setVisible(show)
	}, [setVisible, ready, visible])
	
	children = !visible
		? getContent(content)
		: exclusive
			? getContent(contentHidden)
			: [
				<span key='c'>{getContent(content)}</span>,
				<span key='ch' onClick={exclusive && (e => e.preventDefault() | e.stopPropagation())}>
					{getContent(contentHidden)}
				</span>
			]

    const touchable = 'ontouchstart' in document.documentElement
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
			// onMouseOver: triggerEvent(onMouseHover, true),
			onMouseLeave: triggerEvent(onMouseLeave, false),
		},
		style: {
			cursor: 'pointer',
			...style,
		},
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
	// whether to triggle visibility on mouse click
	toggleOnClick: PropTypes.bool,
	// whether to trigger visibility on mouse enter and leave
	toggleOnHover: PropTypes.bool,
}
Reveal.defaultProps = {
	defaultVisible: false,
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
		'toggleOnHover',
	],
	ready: true,
	toggleOnClick: false,
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
	const { address, name = '' } = (
		partnerAddress
			? getPartner(partnerAddress)
			: getByUserId(userId)
	) || {}
	const buttons = [
		!name && {
			content: textsCap.partnerAdd,
			icon: 'user plus',
			onClick: () => showForm(PartnerForm, {
				// prevent form modal to auto close
				closeOnSubmit: false,
				// after successfully adding partner close the original modal (confirm)
				onSubmit: ok => ok && closeModal(modalId),
				values: { userId },
			}),
		},
		!name && {
			content: textsCap.identityRequest,
			icon: 'download',
			onClick: () => showForm(IdentityRequestForm, {
				values: { userIds: [userId] },
			}),
		},
		{
			content: textsCap.identityShare,
			icon: 'share',
			onClick: () => showForm(IdentityShareForm, {
				values: { userIds: [userId] },
			}),
		},
		{
			content: textsCap.introduce,
			icon: 'handshake',
			onClick: () => showForm(IntroduceUserForm, { values: { userId } }),
		},
	].filter(Boolean)

	const modalId = confirm({
		cancelButton: textsCap.close,
		confirmButton: null,
		content: (
			<div>
				{name && (
					<div>
						<b>{textsCap.partnerName}:</b> {`${name} `}
						<Button {...{
							circular: true,
							icon: 'pencil',
							size: 'mini',
							title: textsCap.partnerUpdate,
							onClick: () => showForm(PartnerForm, {
								values: { address, userId, name },
							}),
						}} />
					</div>
				)}
				<div>
					{buttons.map(props => (
						<Button {...{
							fluid: true,
							key: props.content,
							style: { margin: '3px 0' },
							...props,
						}} />
					))}
				</div>
			</div>
		),
		header: (
			<div className='header'>
				@{userId + ' '}
				<Button {...{
					circular: true,
					icon: 'chat',
					onClick: () =>
						closeModal(modalId) |
						createInbox([userId], null, true),
					size: 'mini',
				}} />
			</div>
		),
		size: 'mini',
	})
}
