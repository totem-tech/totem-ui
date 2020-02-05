import React from 'react'
import PropTypes from 'prop-types'
import { Button } from 'semantic-ui-react'
import { translated } from '../services/language'

const [words, wordsCap] = translated({
    accept: 'accept',
    reject: 'reject',
}, true)
const [texts] = translated({
    userId: 'User ID',
})

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

// placeholder to potentially use this in the future to make all User IDs clickable and open private chat with user
export const UserID = ({ userId }) => (
    <Button
        basic
        compact
        content={<b>@{userId}</b>}
        onClick={e => e.stopPropagation() | console.log({ userId })}
        title={texts.userId}
        style={{ boxShadow: 'none', padding: 0 }}
    />
)