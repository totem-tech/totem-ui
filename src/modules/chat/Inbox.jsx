import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Button } from 'semantic-ui-react'
import { textEllipsis, arrUnique } from '../../utils/utils'
import ChatMessages from './InboxMessages'
import { editName } from './NewInboxForm'
import FormInput from '../../components/FormInput'
import { UserID } from '../../components/buttons'
import { getInboxKey, getMessages, inboxSettings, newInbox, send, removeInboxMessages, removeInbox, hiddenInboxKeys } from './chat'
import { translated } from '../../services/language'
import { confirm } from '../../services/modal'
import { getLayout } from '../../services/window'

const [_, textsCap] = translated({
    close: 'close',
    inputPlaceholder: 'type something and press enter to send',
    loginRequired: 'login/registration required',
    members: 'members',
    messageError: 'error',
    remove: 'remove',
    removeMessages: 'remove messages',
    removeConversation: 'remove conversation',
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
    const isTrollbox = receiverIds.includes(EVERYONE)
    const isGroup = receiverIds.length > 1 || isTrollbox
    const [messages, setMessages] = useState(getMessages(receiverIds))
    const [showTools, setShowTools] = useState(false)
    const inboxKey = getInboxKey(receiverIds) // conversation identifier
    const isMobile = getLayout() === 'mobile'
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
                    onMouseEnter: () => setShowTools(true),
                    onMouseLeave: () => setShowTools(false),
                    style: {
                        background: 'rgba(0,0,0,.6)',
                        color: 'white',
                        padding: 5,
                        textAlign: 'center',
                    }
                }}
            >
                <h1 {...{
                    style: {
                        margin: 0,
                        overflowX: 'hidden',
                        textAlign: showTools ? 'left' : 'center',
                    },
                    onClick: () => isMobile && setShowTools(!showTools),
                }}>
                    {title || inboxSettings(inboxKey).name || textEllipsis(`@${inboxKey}`, 16, 3, false)}
                    {showTools && (
                        <div style={{
                            display: 'inline',
                            position: 'absolute',
                            right: 5,
                            top: 0,
                        }}>

                            {isGroup && !isTrollbox && (
                                <Button {...{
                                    circular: true,
                                    icon: 'pencil',
                                    inverted: true,
                                    onClick: () => editName(inboxKey),
                                    size: 'mini',
                                }} />
                            )}
                            {messages.length > 0 && (
                                <React.Fragment>
                                    {isGroup && (
                                        <Button {...{
                                            circular: true,
                                            icon: 'group',
                                            inverted: true,
                                            key: 'showMembers',
                                            onClick: e => showMembers(inboxKey, messages),
                                            size: 'mini',
                                        }} />
                                    )}

                                    <Button {...{
                                        circular: true,
                                        icon: 'trash',
                                        inverted: true,
                                        key: 'removeMessages',
                                        onClick: () => confirm({
                                            confirmButton: <Button negative content={textsCap.remove} />,
                                            header: textsCap.removeMessages,
                                            onConfirm: () => removeInboxMessages(inboxKey),
                                            size: 'mini',
                                        }),
                                        size: 'mini',
                                    }} />
                                </React.Fragment>
                            )}

                            <Button {...{
                                circular: true,
                                icon: 'hide',
                                inverted: true,
                                key: 'hideConversation',
                                onClick: () => {
                                    hiddenInboxKeys([...hiddenInboxKeys(), inboxKey])
                                },
                                size: 'mini',
                            }} />

                            {!isTrollbox && (
                                <Button {...{
                                    circular: true,
                                    icon: 'close',
                                    inverted: true,
                                    key: 'removeConversation',
                                    onClick: () => messages.length === 0 ? removeInbox(inboxKey) : confirm({
                                        confirmButton: <Button negative content={textsCap.remove} />,
                                        header: textsCap.removeConversation,
                                        onConfirm: () => removeInbox(inboxKey),
                                        size: 'mini',
                                    }),
                                    size: 'mini',
                                }} />
                            )}
                        </div>
                    )}
                </h1>
                {subtitle && <h4 style={{ margin: 0 }}>{subtitle}</h4>}
            </div>
            <ChatMessages {...{
                isPrivate: receiverIds.length === 1 && !isTrollbox,
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