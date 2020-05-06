import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Divider } from 'semantic-ui-react'
import Message from './Message'
import { UserID } from './buttons'
import client, { getUser } from '../services/chatClient'
import chat from './chat'

const randomize = (limit = 10) => parseInt(Math.random(limit) * limit)

export default class Chat extends Component {
    state = {
        userId: `user${randomize()}`,
        messages: new Array(10).fill(0).map(i => ({
            from: `user${randomize(5)}`,
            to: `user${randomize()}`,
            message: randomize() % 2 === 0 ? 'hi' : 'hello'
        }))
    }

    render = () => <ChatView {...this.state} />
}

Chat.propTypes = {}
Chat.defaultProps = {}

const userColor = {}
const currentUserColor = 'black'
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
export const ChatView = props => {
    const { isPrivate = false, messages, userId } = props
    return (
        <div className='totem-chat'>
            {messages.map(({ from, to, message }, i) => {
                const isSender = from === userId
                let bgColor = isSender ? currentUserColor : userColor[from]
                if (!bgColor) {
                    bgColor = colors[randomize(colors.length)]
                    userColor[from] = bgColor
                }
                const color = bgColor === 'black' ? 'white' : 'black'
                return (
                    <div key={i} style={{ textAlign: isSender ? 'right' : 'left' }}>
                        <Message {...{
                            color: bgColor,
                            compact: true,
                            content: (
                                <span>
                                    {isPrivate ? '' : (
                                        <UserID {...{
                                            basic: color !== 'white',
                                            secondary: color === 'white',
                                            suffix: ': ',
                                            userId: from,
                                        }}
                                        />
                                    )}
                                    {message}
                                </span>
                            ),
                            style: {
                                borderRadius: 10,
                                boxShadow: 'none',
                                color,
                                margin: '3px 0',
                                padding: '7px 15px',
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