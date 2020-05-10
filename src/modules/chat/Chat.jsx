import React, { createRef, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import ChatMessages from './ChatMessages'
import FormInput from '../../components/FormInput'
import { getInboxKey, getMessages, newInbox, send } from './chat'
import { translated } from '../../services/language'
import { getUser } from '../../services/chatClient'

const [_, textsCap] = translated({
    inputPlaceholder: 'type something and press enter to send',
    loginRequired: 'login/registration required',
    messageError: 'error'
}, true)
const data = {}
const EVERYONE = 'everyone'
const focusNScroll = inboxKey => setTimeout(() => {
    const { inputRef, messagesRef } = data[inboxKey]
    inputRef && inputRef.focus()
    if (messagesRef) messagesRef.scrollTo(0, messagesRef.scrollHeight)
})

export default function Chat(props) {
    const { receiverIds, style, subtitle, title } = props
    const [messages, setMessages] = useState(getMessages(receiverIds))
    const inboxKey = getInboxKey(receiverIds) // conversation identifier
    data[inboxKey] = data[inboxKey] || {}

    const handleSend = draft => {
        send(receiverIds, draft, false)
        focusNScroll(inboxKey)
    }

    useEffect(() => {
        let mounted = true
        let bond = newInbox(receiverIds)
        const tieId = bond.tie(() => mounted && setMessages(getMessages(receiverIds)))

        return () => {
            mounted = false
            bond.untie(tieId)
        }
    }, []) // keep [] to prevent useEffect from being inboked on every render

    focusNScroll(inboxKey)

    return (
        <div className='totem-chat' style={style}>
            {title && (
                <div style={{
                    background: '#1b1c1d',
                    borderBottom: '1px solid #babbbc',
                    color: 'white',
                    padding: 5,
                    textAlign: 'center',
                }}>
                    <h1 style={{ margin: 0 }}>{title}</h1>
                    <h4 style={{ margin: 0 }}>{subtitle}</h4>
                </div>
            )}
            <ChatMessages {...{
                isPrivate: receiverIds.length === 1 && !receiverIds.includes(EVERYONE),
                onRef: ref => data[inboxKey].messagesRef = ref,
                messages: messages.length > 0 ? messages : [{
                    message: textsCap.inputPlaceholder
                }],
            }} />
            <MessageInput {... {
                onRef: ref => data[inboxKey].inputRef = ref,
                onSubmit: handleSend,
            }} />
        </div >
    )
}
Chat.propTypes = {
    style: PropTypes.object,
    receiverIds: PropTypes.array,
}
Chat.defaultProps = {
    receiverIds: [EVERYONE],
}

const MessageInput = ({ onRef, onSubmit }) => {
    const [value, setValue] = useState('')
    const handleSubmit = e => {
        e.preventDefault()
        if (value.trim().length === 0) return
        onSubmit(value)
        setValue('')
    }
    return (
        <form onSubmit={handleSubmit}>
            <FormInput {...{
                action: { icon: 'chat', onClick: handleSubmit },
                autoComplete: 'off',
                autoFocus: true,
                elementRef: onRef,
                fluid: true,
                name: 'message',
                onChange: (_, { value }) => setValue(value),
                placeholder: textsCap.inputPlaceholder,
                type: 'text',
                useInput: true,
                value,
            }} />
        </form>
    )
}