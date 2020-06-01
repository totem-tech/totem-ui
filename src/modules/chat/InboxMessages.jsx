import React from 'react'
import { Divider } from 'semantic-ui-react'
import { isObj } from '../../utils/utils'
import Message from '../../components/Message'
import { UserID } from '../../components/buttons'
import { getUser } from '../../services/chatClient'
import { translated } from '../../services/language'

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
    'black',
]
const iconStyle = {
    fontSize: 18,
    width: 18,
}
const icons = {
    error: {
        color: 'red',
        name: 'exclamation triangle',
        style: iconStyle,
    },
    loading: {
        color: 'yellow',
        name: 'spinner',
        loading: true,
        style: iconStyle,
    }
}

export default function ChatMessages(props) {
    const { isPrivate, messages, onRef } = props
    const userId = (getUser() || {}).id
    return (
        <div {...{
            className: 'messages',
            ref: onRef
        }}>
            {messages.map(({ action, errorMessage, message, senderId, status }, i) => {
                const isSender = senderId === userId
                if (isObj(action) && !!action.type) {
                    const { data, type } = action
                    switch (type) {
                        case 'message-group-name':
                            return (
                                <div
                                    key={i}
                                    style={{ textAlign: 'center', color: 'grey' }}
                                >
                                    <i>
                                        {isSender ? textsCap.you : <UserID userId={senderId} suffix=' ' />}
                                        {texts.changedGroupName}: {data[0]}
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
                return (
                    <div {...{
                        key: i,
                        style: {
                            padding: '5px 0',
                            textAlign: isSender ? 'right' : 'left',
                        },
                        title: errorMessage,
                    }}>
                        <Message {...{
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
                                </span>
                            ),
                            icon: icons[status],
                            style: {
                                borderRadius: 10,
                                boxShadow: 'none',
                                color,
                                margin: '1px 10px',
                                padding: '7px 15px',
                                width: 'auto'
                            },
                            key: i,
                        }} />
                        <Divider hidden style={{ margin: 0 }} />
                    </div>
                )
            })}
        </div>
    )
}
