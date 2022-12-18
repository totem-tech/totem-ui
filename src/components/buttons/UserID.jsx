import React from 'react'
import PropTypes from 'prop-types'
import { Button as _Button } from 'semantic-ui-react'
import { isFn, objWithoutKeys } from '../../utils/utils'
import { getRawUserID } from '../UserIdInput'
// services
import { translated } from '../../services/language'
import {
    showForm,
	closeModal,
	showInfo,
} from '../../services/modal'
// modules
import { createInbox } from '../../modules/chat/chat'
import { getUser } from '../../modules/chat/ChatClient'
import IdentityRequestForm from '../../modules/identity/IdentityRequestForm'
import IdentityShareForm from '../../modules/identity/IdentityShareForm'
import IntroduceUserForm from '../../modules/identity/IntroduceUserForm'
import { get as getPartner, getByUserId } from '../../modules/partner/partner'
import PartnerForm from '../../modules/partner/PartnerForm'
import PartnerIcon from '../../modules/partner/PartnerIcon'
import { ButtonGroup, ButtonGroupOr } from '.'

let textsCap = {
	clickToChat: 'click to chat',
	identityRequest: 'request identity',
	identityShare: 'share identity',
	introduce: 'introduce',
	partner: 'partner',
	partnerAdd: 'add partner',
	reject: 'reject',
	userIdBtnTitle: 'click for more options',
}
textsCap = translated(textsCap, true)[1]

const UserID = React.memo(props => {
	const {
		address,
		El,
		ignoreAttributes,
		onClick,
		onChatOpen,
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
				: e => {
					e.stopPropagation()
					UserID.showModal(
						userId,
						address,
						onChatOpen,
					)
				},
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
	// @onClick function: use `null` to prevent showing modal
	onClick: PropTypes.func,
	// @onChatOpen function: callback invoked whenever chat is opened with the user from the user details modal
	onChatOpen: PropTypes.func,
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
		'onChatOpen',
		'prefix',
		'suffix',
		'userId',
	],
}
UserID.showModal = (userId, partnerAddress, onChatOpen) => {
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
				values: {
					userIds: [userId],
				},
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
			onClick: () => showForm(IntroduceUserForm, {
				values: { userId },
			}),
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
			<_Button {...{
				circular: true,
				icon: 'chat',
				onClick: () => {
					closeModal(modalId)
					createInbox([userId], null, true)
					isFn(onChatOpen) && onChatOpen(userId)
				},
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
					</small>
				)}
			</div>
		</div>
	)
	const contentProps = {
		style: { padding: 1 },
	}
	const modalId = userId
	const modalProps = {
		collapsing: true,
		content,
		header,
		size: 'mini',
	}
	showInfo(
		modalProps,
		modalId,
		contentProps,
	)
}
export default UserID