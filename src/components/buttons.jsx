import React from 'react'
import PropTypes from 'prop-types'
import { Button } from 'semantic-ui-react'
import { textCapitalize } from '../utils/utils'
import partners from '../services/partners'
import identities from '../services/identity'

const words = {
    accept: 'accept',
    reject: 'reject',
}
const wordsCap = textCapitalize(words)
const texts = {
    userId: 'User ID',
}

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
export const UserID = ({ userId }) => {
    return (
        <Button
            basic
            compact
            content={<b>@{userId}</b>}
            onClick={(e) => e.stopPropagation() | console.log({ userId })}
            title={texts.userId}
            style={{ boxShadow: 'none', padding: 0 }}
        />
    )
}