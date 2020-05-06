import React from 'react'
import { Divider } from 'semantic-ui-react'
import Message from '../../components/Message'
import { UserID } from '../../components/buttons'
import { getUser } from '../../services/chatClient'

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
const ChatMessages = props => {
    const { messages, receiverIds } = props
    const userId = (getUser() || {}).id
    const isPrivate = receiverIds.length === 1 && receiverIds[0] !== 'everyone'
    return (
        <div className='messages'>
            {messages.map(({ message, senderId, status }, i) => {
                const isSender = senderId === userId
                let bgColor = isSender ? 'green' : (
                    isPrivate ? 'blue' : userColor[senderId]
                )
                if (!bgColor) {
                    bgColor = colors[randomize(colors.length)]
                    userColor[senderId] = bgColor
                }
                const color = bgColor === 'black' ? 'white' : 'black'
                return (
                    <div key={i} style={{ textAlign: isSender ? 'right' : 'left' }}>
                        <Message {...{
                            color: bgColor,
                            compact: true,
                            content: (
                                <span>
                                    {isPrivate || isSender ? '' : (
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
                                margin: '1px 0',
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
export default ChatMessages