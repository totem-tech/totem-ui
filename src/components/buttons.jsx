import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { Button } from 'semantic-ui-react'
import { getRawUserID } from './UserIdInput'
import { translated } from '../services/language'
import { getByUserId } from '../services/partner'
import { objWithoutKeys } from '../utils/utils'

const [words, wordsCap] = translated({
    accept: 'accept',
    reject: 'reject',
}, true)

export const ButtonAcceptOrReject = ({ onClick, acceptText, rejectText, style }) => (
    <div title="" style={style || { textAlign: 'center', marginTop: 10 }}>
        <Button.Group>
            <Button positive onClick={(e) => e.stopPropagation() | onClick(true)}>
                {acceptText}
            </Button>
            <Button.Or onClick={e => e.stopPropagation()} />
            <Button negative onClick={(e) => e.stopPropagation() | onClick(false)}>
                {rejectText}
            </Button>
        </Button.Group>
    </div>
)
ButtonAcceptOrReject.propTypes = {
    onClick: PropTypes.func.isRequired,
    acceptText: PropTypes.string,
    rejectText: PropTypes.string
}
ButtonAcceptOrReject.defaultProps = {
    acceptText: wordsCap.accept,
    rejectText: wordsCap.reject
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
    const { prefix, style, suffix, userId = '' } = props
    return (
        <Button
            basic
            compact
            content={<b>{prefix}@{getRawUserID(userId)}{suffix}</b>}
            onClick={e => e.stopPropagation()}
            title={(getByUserId(userId) || {}).name}
            style={{ boxShadow: 'none', padding: 0, ...style }}
            {...objWithoutKeys(props, ['prefix', 'style', 'suffix', 'userId'])}
        />
    )
}
