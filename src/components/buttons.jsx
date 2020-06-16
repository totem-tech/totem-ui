import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { Button } from 'semantic-ui-react'
import { objWithoutKeys } from '../utils/utils'
import { getRawUserID } from './UserIdInput'
// forms
import IdentityRequestForm from '../forms/IdentityRequest'
import IdentityShareForm from '../forms/IdentityShare'
import PartnerForm from '../forms/Partner'
// services
import { translated } from '../services/language'
import { confirm, showForm, closeModal } from '../services/modal'
import { createInbox } from '../modules/chat/chat'
import { getByUserId } from '../services/partner'
import { getUser } from '../services/chatClient'

const [texts, textsCap] = translated({
    accept: 'accept',
    close: 'close',
    partnerAdd: 'add partner',
    partnerName: 'partner name',
    partnerUpdate: 'update partner',
    identityRequest: 'request identity',
    identityShare: 'share identity',
    reject: 'reject',
}, true)

export const ButtonAcceptOrReject = ({ onClick, acceptText, rejectText, style, acceptColor, rejectColor }) => (
    <div title="" style={{ textAlign: 'center', marginTop: 10, ...style }}>
        <Button.Group>
            <Button color={acceptColor} onClick={(e) => e.stopPropagation() | onClick(true)}>
                {acceptText}
            </Button>
            <Button.Or onClick={e => e.stopPropagation()} />
            <Button color={rejectColor} onClick={(e) => e.stopPropagation() | onClick(false)}>
                {rejectText}
            </Button>
        </Button.Group>
    </div>
)
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
        <El
            onMouseEnter={() => !visible && setVisible(true)}
            onMouseLeave={() => visible && setVisible(false)}
            style={style}
        >
            {visible ? hiddenContent : content}
        </El>
    )
}

// placeholder to potentially use this in the future to make all User IDs clickable and open private chat with user
export const UserID = props => {
    const { onClick, prefix, style, suffix, userId } = props
    const rawId = getRawUserID(userId)
    const isOwnId = (getUser() || {}).id === rawId
    if (!rawId) return ''
    const handleClick = e => {
        if (onClick === null || isOwnId) return // prevent any action
        e.stopPropagation()
        const { address, name = '' } = getByUserId(rawId) || {}
        const buttons = [
            !name && {
                content: textsCap.partnerAdd,
                onClick: () => showForm(PartnerForm, { values: { userId: rawId } }),
            },
            {
                content: textsCap.identityRequest,
                onClick: () => showForm(IdentityRequestForm, { values: { userIds: [rawId] } }),
            },
            {
                content: textsCap.identityShare,
                onClick: () => showForm(IdentityShareForm, { values: { userIds: [rawId] } }),
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
                                    values: { address, userId: rawId, name },
                                }),
                            }} />
                        </div>
                    )}
                    <div>
                        {buttons.map(props => <Button key={props.content} {...props} />)}
                    </div>
                </div>
            ),
            header: (
                <div className='header'>
                    @{rawId}
                    <Button {...{
                        circular: true,
                        icon: 'chat',
                        onClick: () => closeModal(modalId) | createInbox([rawId], null, false, true),
                        size: 'mini'
                    }} />
                </div>
            ),
            size: 'tiny'
        })
    }
    return (
        <span {...{
            ...objWithoutKeys(props, ['prefix', 'suffix', 'userId']),
            onClick: handleClick,
            style: {
                cursor: 'pointer',
                padding: 0,
                ...style,
            },
            title: name,
        }}>
            <b>{prefix}@{rawId}{suffix}</b>
        </span>
    )
}
