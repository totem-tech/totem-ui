import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { Button } from 'semantic-ui-react'
import { isFn, objWithoutKeys } from '../utils/utils'
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
    identityRequest: 'request identity',
    identityShare: 'share identity',
    introduce: 'introduce',
    or: 'or',
    partnerAdd: 'add partner',
    partnerName: 'partner name',
    partnerUpdate: 'update partner',
    reject: 'reject',
    userIdBtnTitle: 'click for more options',
}, true)[1]

export const ButtonAcceptOrReject = React.memo(props => {
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
                }
            ],
            ignoreAttributes: [...ignoreAttributes, ...ButtonGroup.defaultProps.ignoreAttributes],
            or: true,
            values: [ true, false ],
        }} />
    )
})
ButtonAcceptOrReject.propTypes = {
    acceptColor: PropTypes.string, // colors supported by SemanticUI buttons
    acceptText: PropTypes.string,
    ignoreAttributes: PropTypes.arrayOf(PropTypes.string).isRequired,
    onAction: PropTypes.func.isRequired,
    rejectColor: PropTypes.string, // colors supported by SemanticUI buttons
    rejectText: PropTypes.string
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
    rejectText: textsCap.reject
}

/**
 * @name    ButtonGroup
 * @summary Shorthand for Or button group
 * 
 * @param   {Object}    props see `ButtonGroup.propTypes` for accepted props
 * 
 * @returns {Element}
 */
export const ButtonGroup = React.memo(props => {
    const { buttons, disabled, El, ignoreAttributes, loading, onAction, or, values } = props
    const buttonsEl = buttons.map((button, i) => [
        or && i > 0 && (
            <Button.Or {...{
                key: 'or',
                onClick: e => e.stopPropagation(),
                text: textsCap.or,
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
        }} />
    ].filter(Boolean))
    return <El {...objWithoutKeys(props, ignoreAttributes)}>{buttonsEl}</El>
})
ButtonGroup.propTypes = {
    buttons: PropTypes.arrayOf(PropTypes.object).isRequired,
    El: PropTypes.oneOfType([ PropTypes.string, PropTypes.func, ]).isRequired,
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
        'values',
    ]
}

export const Reveal = ({ content, hiddenContent, style, defaultVisible = false, El = 'div' }) => {
    const [visible, setVisible] = useState(defaultVisible)
    return (
        <El {...{
            children: visible ? hiddenContent : content,
            onMouseEnter: () => !visible && setVisible(true),
            onMouseLeave: () => visible && setVisible(false),
            style: { style },
        }} />
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
