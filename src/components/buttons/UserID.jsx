import React from 'react'
import PropTypes from 'prop-types'
import { Button as _Button } from 'semantic-ui-react'
import { createInbox } from '../../modules/chat/chat'
import IdentityRequestForm from '../../modules/identity/IdentityRequestForm'
import IdentityShareForm from '../../modules/identity/IdentityShareForm'
import IntroduceUserForm from '../../modules/identity/IntroduceUserForm'
import { get as getPartner, getByUserId } from '../../modules/partner/partner'
import PartnerForm, { inputNames as pInputNames } from '../../modules/partner/PartnerForm'
import PartnerIcon from '../../modules/partner/PartnerIcon'
import {
	showForm,
	closeModal,
	showInfo,
} from '../../services/modal'
import { getUser, rxIsRegistered } from '../../utils/chatClient'
import { translated } from '../../utils/languageHelper'
import { isFn, objWithoutKeys } from '../../utils/utils'
import { getRawUserID } from '../UserIdInput'
import { ButtonGroup, ButtonGroupOr } from '.'

let textsCap = {
	clickToChat: 'click to chat',
	identityRequest: 'request identity',
	identityShare: 'share identity',
	introduce: 'introduce',
	partner: 'partner',
	partnerAdd: 'add partner',
	reject: 'reject',
	updatePartner: 'update partner',
	userIdBtnTitle: 'click for more options',
}
textsCap = translated(textsCap, true)[1]

export const UserID = React.memo(props => {
	const {
		address,
		name,
		El,
		ignoreAttributes,
		onClick,
		onChatOpen,
		onDragStart,
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
					isFn(onClick) && onClick(e)
					e.stopPropagation()
					UserID.showModal(
						userId,
						address,
						onChatOpen,
						name,
					)
				},
			onDragStart: e => {
				e.stopPropagation()
				e.dataTransfer.setData('Text', rawId)
				isFn(onDragStart) && onDragStart(e)
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
	//@address (optional): partner identity
	address: PropTypes.string,
	El: PropTypes.oneOfType([
		PropTypes.string,
		PropTypes.func,
		PropTypes.object, //for React.memo elements
	]).isRequired,
	ignoreAttributes: PropTypes.arrayOf(PropTypes.string),
	// @name (optional): a name to be used when adding as partner
	name: PropTypes.string,
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
UserID.showModal = (userId, partnerAddress, onChatOpen, partnerName) => {
	const partner = partnerAddress && getPartner(partnerAddress)
	const partnerById = !partner && getByUserId(userId)
	const {
		address,
		name = '',
		type,
		visibility,
	} = partner || partnerById || {}
	const isRegistered = rxIsRegistered.value
	const btnTxt = !partner
		? textsCap.partnerAdd
		: textsCap.updatePartner
	const style = { width: '50%' }
	const addButtons = [
		{
			content: btnTxt,
			icon: 'user plus',
			onClick: () => showForm(PartnerForm, {
				// prevent form modal to auto close
				closeOnSubmit: false,
				// after successfully adding partner close the original modal (confirm)
				onSubmit: ok => ok && closeModal(modalId),
				values: {
					[pInputNames.address]: partnerAddress,
					[pInputNames.name]: partnerName || '',
					[pInputNames.userId]: userId
				},
			}),
			style,
			title: btnTxt,
		},
		{
			content: textsCap.identityRequest,
			disabled: !isRegistered || !partner,
			icon: 'download',
			onClick: () => showForm(IdentityRequestForm, {
				values: {
					userIds: [userId],
				},
			}),
			style,
			title: textsCap.identityRequest,
		},
	]
	const buttons = [
		{
			content: textsCap.identityShare,
			disabled: !isRegistered,
			icon: 'share',
			onClick: () => showForm(IdentityShareForm, {
				values: { userIds: [userId] },
			}),
			style,
			title: textsCap.identityShare,
		},
		{
			content: textsCap.introduce,
			disabled: !isRegistered,
			icon: 'handshake',
			onClick: () => showForm(IntroduceUserForm, {
				values: { userId },
			}),
			style,
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
		<div className='header' style={{ marginBottom: 10 }}>
			<span style={{ textTransform: 'lowercase' }}>
				@{userId + ' '}
			</span>
			{isRegistered && (
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
			)}
			{name && (
				<div>
					<small>
						<b>{textsCap.partner}: </b>
						<PartnerIcon {...{
							address,
							type,
							visibility,
						}} />
						{` ${name} `}
					</small>
				</div>
			)}
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