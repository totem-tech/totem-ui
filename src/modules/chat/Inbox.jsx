import React, { createRef, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Button } from 'semantic-ui-react'
import ChatMessages from './InboxMessages'
import FormInput from '../../components/FormInput'
import { getInboxKey, getMessages, inboxSettings, newInbox, send } from './chat'
import { translated } from '../../services/language'
import { confirm } from '../../services/modal'
import { textEllipsis, arrUnique } from '../../utils/utils'
import FormBuilder from '../../components/FormBuilder'
import { UserID } from '../../components/buttons'
import { editName } from './NewInboxForm'

const [_, textsCap] = translated({
    close: 'close',
    inputPlaceholder: 'type something and press enter to send',
    loginRequired: 'login/registration required',
    members: 'members',
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
    const isGroup = receiverIds.length > 1 || receiverIds.includes(EVERYONE)
    const [messages, setMessages] = useState(getMessages(receiverIds))
    const [showTools, setShowTools] = useState(false)
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
            <div
                {...{
                    onMouseEnter: () => isGroup && setShowTools(true),
                    onMouseLeave: () => isGroup && setShowTools(false),
                    style: {
                        background: 'rgba(0,0,0,.6)',
                        color: 'white',
                        padding: 5,
                        textAlign: 'center',
                    }
                }}
            >
                <h1 style={{ margin: 0 }}>
                    {title || inboxSettings(inboxKey).name || textEllipsis(`@${inboxKey}`, 16, 3, false)}
                    {isGroup && showTools && (
                        <div style={{
                            display: 'inline',
                            position: 'absolute',
                            right: 5,
                            top: 0,
                        }}>

                            {!receiverIds.includes(EVERYONE) && (
                                <Button {...{
                                    circular: true,
                                    icon: 'pencil',
                                    inverted: true,
                                    onClick: () => editName(inboxKey),
                                    size: 'mini',
                                }} />
                            )}
                            <Button {...{
                                circular: true,
                                icon: 'group',
                                inverted: true,
                                onClick: e => showMembers(inboxKey, messages),
                                size: 'mini',
                            }} />
                        </div>
                    )}
                </h1>
                {subtitle && <h4 style={{ margin: 0 }}>{subtitle}</h4>}
            </div>
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
                maxLength: 160,
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

export const showMembers = (inboxKey, messages) => {
    let members = inboxKey.split(',')
    if (members.includes(EVERYONE)) {
        members = arrUnique(messages.map(x => x.senderId))
    }
    confirm({
        cancelButton: textsCap.close,
        confirmButton: null,
        header: textsCap.members,
        content: (
            <ol style={{ margin: 0 }}>
                {members.sort()
                    .map(id => (
                        <li key={id}>
                            <UserID userId={id} />
                        </li>
                    ))}
            </ol>
        ),
        size: 'mini',
    })
}