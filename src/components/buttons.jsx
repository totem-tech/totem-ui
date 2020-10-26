import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { Button } from 'semantic-ui-react'
import { objWithoutKeys } from '../utils/utils'
import { getRawUserID } from './UserIdInput'
// forms
import IdentityRequestForm from '../modules/identity/IdentityRequestForm'
import IdentityShareForm from '../modules/identity/IdentityShareForm'
import IntroduceUserForm from '../modules/chat/IntroduceUserForm'
// services
import { translated } from '../services/language'
import { confirm, showForm, closeModal } from '../services/modal'
import { createInbox } from '../modules/chat/chat'
import { getByUserId } from '../modules/partner/partner'
import PartnerForm from '../modules/partner/PartnerForm'
import { getUser } from '../modules/chat/ChatClient'

const textsCap = translated({
    accept: 'accept',
    close: 'close',
    partnerAdd: 'add partner',
    partnerName: 'partner name',
    partnerUpdate: 'update partner',
    identityRequest: 'request identity',
    identityShare: 'share identity',
    introduce: 'introduce',
    reject: 'reject',
    userIdBtnTitle: 'click for more options',
}, true)[1]

export const ButtonAcceptOrReject = props => {
    const {
        acceptColor,
        acceptText,
        children,
        disabled,
        loading,
        onClick,
        rejectColor,
        rejectText,
        style,
        title
    } = props
    return (
        <div title={title} style={{ textAlign: 'center', ...style }}>
            <Button.Group>
                <Button {...{
                    content: acceptText,
                    color: acceptColor,
                    disabled: disabled,
                    loading: loading,
                    onClick: (e) => e.stopPropagation() | onClick(true),
                }} />
                <Button.Or onClick={e => e.stopPropagation()} />
                <Button {...{
                    content: rejectText,
                    color: rejectColor,
                    disabled: disabled,
                    loading: loading,
                    onClick: (e) => e.stopPropagation() | onClick(false),
                }} />
                {children}
            </Button.Group >
        </div>
    )
}
ButtonAcceptOrReject.propTypes = {
    onClick: PropTypes.func.isRequired,
    acceptColor: PropTypes.string, // colors supported by SemanticUI buttons
    acceptText: PropTypes.string,
    rejectColor: PropTypes.string, // colors supported by SemanticUI buttons
    rejectText: PropTypes.string
}
ButtonAcceptOrReject.defaultProps = {
    acceptColor: 'green',
    acceptText: textsCap.accept,
    rejectColor: 'red',
    rejectText: textsCap.reject
}

export const Reveal = ({ content, hiddenContent, style, defaultVisible = false, El = 'div' }) => {
    const [visible, setVisible] = useState(defaultVisible)
    return (
        <El {...{
            onMouseEnter: () => !visible && setVisible(true),
            onMouseLeave: () => visible && setVisible(false),
            style: { style },
        }}>
            { visible ? hiddenContent : content}
        </El >
    )
}

// placeholder to potentially use this in the future to make all User IDs clickable and open private chat with user
export const UserID = React.memo(props => {
    const { El = 'span', onClick, prefix, style, suffix, userId } = props
    const rawId = getRawUserID(userId)
    if (!rawId) return ''

    const isOwnId = (getUser() || {}).id === rawId
    const allowClick = onClick !== null && !isOwnId

    return (
        <El {...{
            ...objWithoutKeys(props, ['El', 'prefix', 'suffix', 'userId']),
            onClick: !allowClick ? undefined : (e => e.stopPropagation() | UserID.showModal(userId)),
            style: {
                cursor: allowClick && 'pointer',
                fontWeight: 'bold',
                padding: 0,
                ...style,
            },
            title: !allowClick ? name : textsCap.userIdBtnTitle,
        }}>
            <b>{prefix}@{rawId}{suffix}</b>
        </El>
    )
})

UserID.showModal = userId => {
    const { address, name = '' } = getByUserId(userId) || {}
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
            onClick: () => showForm(IdentityRequestForm, { values: { userIds: [userId] } }),
        },
        {
            content: textsCap.identityShare,
            icon: 'share',
            onClick: () => showForm(IdentityShareForm, { values: { userIds: [userId] } }),
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
                        <b>{textsCap.partnerName}:</b>
                        {` ${name} `}
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
                    onClick: () => closeModal(modalId) | createInbox([userId], null, true),
                    size: 'mini'
                }} />
            </div>
        ),
        size: 'mini',
    })
}
