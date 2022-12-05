import React, { useState } from 'react'
import { isObj } from '../../utils/utils'
import { UserID } from '../../components/buttons'
import { Linkify } from '../../components/StringReplace'
import Message from '../../components/Message'
import TimeSince from '../../components/TimeSince'
import { translated } from '../../services/language'
import { getUser } from './ChatClient'

const [texts, textsCap] = translated({
    changedGroupName: 'changed group name to',
    you: 'you',
}, true)
const userColor = {}
const randomize = (limit = 10) => parseInt(Math.random(limit) * limit)
const colors = [
    'blue',
    'brown',
    'olive',
    'orange',
    'pink',
    'purple',
    'red',
    'teal',
    'violet',
    'yellow',
    'grey',
    // 'black',
]

const icons = {
    error: {
        color: 'red',
        name: 'exclamation triangle',
    },
    loading: {
        color: 'yellow',
        name: 'spinner',
        loading: true,
    }
}

export default function InboxMessages(props) {
    const { className, isPrivate, messages, onScroll } = props
    const userId = (getUser() || {}).id
    
    return (
        <div {...{ className, onScroll, }}>
            {messages.map((message, i) => (
                <InboxMessage {...{
                    key: message.id || i,
                    isPrivate,
                    userId,
                    ...message,
                }} />
            ))}
        </ div>
    )
}

const InboxMessage = props => {
    const { action, errorMessage, id, message, senderId, status, timestamp, isPrivate, userId } = props
    const isSender = senderId === userId

    if (isObj(action)) {
        const { data, type } = action
        switch (type) {
            case 'message-group-name': return (
                <div {...{ className: 'action-message', id }}>
                    <i>
                        {isSender
                            ? textsCap.you + ' '
                            : <UserID {...{ suffix: ' ', userId: senderId }} />}
                        {texts.changedGroupName} <b>{data[0]}</b>
                    </i>
                </div>
            )
        }
    }

    let bgColor = isSender
        ? 'green'
        : isPrivate
            ? 'blue'
            : userColor[senderId]
    if (!bgColor) {
        bgColor = colors[randomize(colors.length)]
        userColor[senderId] = bgColor
    }
    const color = bgColor === 'black' ? 'white' : 'black'
    const [showDetails, setShowDetails] = useState(false)

    return !message ? '' : (
        <div {...{
            className: 'message-wrap' + (isSender ? ' user' : ''),
            id,
            title: errorMessage,
        }}>
            <Message {...{
                className: 'message',
                color: bgColor,
                compact: true,
                content: (
                    <span>
                        {isPrivate || isSender || !senderId ? '' : (
                            <UserID {...{
                                suffix: ': ',
                                userId: senderId,
                            }} />
                        )}
                        <Linkify>{message}</Linkify>
                        {errorMessage && showDetails && <div className='error'><i>{errorMessage}</i></div>}
                        {showDetails && (
                            <TimeSince {...{
                                style: {
                                    fontStyle: 'italic',
                                    fontSize: 11,
                                    color: 'grey',
                                },
                                date: timestamp,
                            }} />
                        )}
                    </span>
                ),
                icon: icons[status],
                onClick: () => setShowDetails(!showDetails),
                style: {
                    color,
                    cursor: 'pointer',
                }
            }} />
        </div>
    )
}