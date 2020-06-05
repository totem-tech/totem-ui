import React, { useState } from 'react'
import { isObj } from '../../utils/utils'
import Message from '../../components/Message'
import { UserID } from '../../components/buttons'
import { getUser } from '../../services/chatClient'
import { translated } from '../../services/language'
import TimeSince from '../../components/TimeSince'

const [texts, textsCap] = translated({
    changedGroupName: 'changed group name',
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
    const { isPrivate, messages, onRef } = props
    const userId = (getUser() || {}).id
    return (
        <div {...{
            className: 'messages',
            ref: onRef
        }}>
            {messages.map((message, key) => <InboxMessage {...{ key, isPrivate, userId, ...message }} />)}
        </div>
    )
}

const InboxMessage = props => {
    const { action, errorMessage, message, senderId, status, timestamp, isPrivate, userId } = props
    const isSender = senderId === userId

    if (isObj(action) && !!action.type) {
        const { data, type } = action
        switch (type) {
            case 'message-group-name':
                return (
                    <div className='message-group-name'>
                        <i>
                            {isSender ? textsCap.you : <UserID {...{ userId: senderId }} />}
                            {' ' + texts.changedGroupName}: {data[0]}
                        </i>
                    </div>
                )
        }
        return ''
    }

    let bgColor = isSender ? 'green' : (
        isPrivate ? 'blue' : userColor[senderId]
    )
    if (!bgColor) {
        bgColor = colors[randomize(colors.length)]
        userColor[senderId] = bgColor
    }
    const color = bgColor === 'black' ? 'white' : 'black'
    const [showTime, setShowTime] = useState(false)

    return (
        <div {...{
            className: 'message-wrap' + (isSender ? ' user' : ''),
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
                                basic: color !== 'white',
                                secondary: color === 'white',
                                suffix: ': ',
                                userId: senderId,
                            }}
                            />
                        )}
                        {message}
                        {showTime && (
                            <TimeSince {...{
                                style: {
                                    fontStyle: 'italic',
                                    fontSize: 11,
                                    color: 'grey',
                                },
                                time: timestamp,
                            }} />
                        )}
                    </span>
                ),
                icon: icons[status],
                onClick: () => setShowTime(!showTime),
                style: {
                    color,
                    cursor: 'pointer',
                }
            }} />
        </div>
    )
}
