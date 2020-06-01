import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Button, Icon } from 'semantic-ui-react'
import { textEllipsis, arrUnique, arrReverse } from '../../utils/utils'
import ChatMessages from './InboxMessages'
import { editName } from './NewInboxForm'
import FormInput from '../../components/FormInput'
import { UserID } from '../../components/buttons'
import {
    getInboxKey,
    getMessages,
    inboxBonds,
    inboxSettings,
    openInboxBond,
    send,
    removeInboxMessages,
    removeInbox,
    newInboxBond,
    getTrollboxUserIds,
} from './chat'
import client, { loginBond, getUser } from '../../services/chatClient'
import { translated } from '../../services/language'
import { confirm } from '../../services/modal'
import { getLayout } from '../../services/window'
import Message from '../../components/Message'
import partners, { getByUserId } from '../../services/partner'

const [_, textsCap] = translated({
    archiveConversation: 'archive conversation',
    close: 'close',
    inputPlaceholder: 'type something and press enter to send',
    loggedInAs: 'logged in as',
    loginRequired: 'login/registration required',
    members: 'members',
    messageError: 'error',
    remove: 'remove',
    removeMessages: 'remove messages',
    removeConversation: 'remove conversation',
    trollbox: 'Totem Trollbox'
}, true)
const data = {}
const EVERYONE = 'everyone'
// focus message input and scroll to bottom of the message list
const focusNScroll = inboxKey => setTimeout(() => {
    const { inputRef, messagesRef } = data[inboxKey]
    inputRef && inputRef.focus()
    if (messagesRef) messagesRef.scrollTo(0, messagesRef.scrollHeight)
})

export default function Inbox(props) {
    let {
        inboxKey,
        receiverIds, // if not supplied use default open inbox
        style,
        title,
    } = props
    data[inboxKey] = data[inboxKey] || {}
    const [messages, setMessages] = useState(props.messages || getMessages(inboxKey))
    const [showMembers, setShowMembers] = useState(false)
    const isTrollbox = receiverIds.includes(EVERYONE)
    const isGroup = receiverIds.length > 1 || isTrollbox
    useEffect(() => {
        let mounted = true
        let bond = inboxBonds[inboxKey]
        const tieId = bond && bond.tie(() => mounted && setMessages(getMessages(inboxKey)))

        bond && inboxSettings(inboxKey, { unread: false }, true)
        return () => {
            mounted = false
            bond && bond.untie(tieId)
        }
    }, []) // keep [] to prevent useEffect from being inboked on every render

    // focus and scoll down to latest msg
    focusNScroll(inboxKey)
    return !inboxKey ? '' : (
        <div {...{ className: 'inbox', style }}>
            <InboxHeader {...{
                inboxKey,
                isGroup,
                isTrollbox,
                messages,
                receiverIds,
                setShowMembers,
                showMembers,
                title,
            }} />
            {showMembers ? (
                <div>
                    {(!isTrollbox ? receiverIds : getTrollboxUserIds()).sort().map(id => (
                        <Message {...{
                            content: <UserID userId={id} />,
                            header: (getByUserId(id) || {}).name,
                            icon: 'user',
                            key: id,
                            size: 'mini',
                            style: { margin: 0 },
                        }} />
                    ))}
                </div>
            ) : (
                    <ChatMessages {...{
                        isPrivate: receiverIds.length === 1 && !isTrollbox,
                        onRef: ref => data[inboxKey].messagesRef = ref,
                        messages: messages.length > 0 ? messages : [{
                            message: textsCap.inputPlaceholder
                        }],
                    }} />
                )}
            {!showMembers && (
                <MessageInput {... {
                    onRef: ref => data[inboxKey].inputRef = ref,
                    onSubmit: draft => {
                        send(receiverIds, draft, false)
                        focusNScroll(inboxKey)
                    },
                }} />
            )}
        </div >
    )
}
Inbox.propTypes = {
    style: PropTypes.object,
    receiverIds: PropTypes.array,
}

const InboxHeader = ({
    inboxKey,
    isGroup,
    isTrollbox,
    messages,
    receiverIds,
    showMembers,
    setShowMembers,
    title,
}) => {
    const [expanded, setExpanded] = useState(false)
    const [online, setOnline] = useState(false)
    const [showTools, setShowTools] = useState(false)
    const isMobile = getLayout() === 'mobile'
    const toolIconSize = isMobile ? undefined : 'mini'
    const toggleExpanded = () => {
        document.getElementById('app').classList[expanded ? 'remove' : 'add']('chat-expanded')
        setExpanded(!expanded)
    }

    useEffect(() => {
        if (isGroup) return () => { }
        let isMounted = true
        const frequency = 30000
        const friend = receiverIds[0]
        const checkOnline = () => {
            if (!isMounted) return
            if (!loginBond._value) return setOnline(false)
            const { timestamp } = arrReverse(messages).find(m => m.senderId === friend) || {}
            const tsDiff = new Date() - new Date(timestamp)
            // received a message from opponent within the frequency duration => assume online
            if (tsDiff < frequency) return setOnline(true)
            client.isUserOnline(
                receiverIds[0],
                (_, online) => {
                    setOnline(!!online)
                },
            )
        }
        const intervalId = setInterval(checkOnline, frequency)
        checkOnline()
        return () => {
            isMounted = false
            intervalId && clearInterval(intervalId)
        }
    }, [])
    return (
        <div className='header-container'>
            {!isGroup && (
                <div className='online-indicator'>
                    <Icon {...{
                        color: online ? 'green' : 'red',
                        name: 'circle',
                    }} />
                </div>
            )}
            <h1 className='header'>
                <span style={{ opacity: showTools ? 0.1 : 1 }}>
                    {inboxKey === EVERYONE ? textsCap.trollbox : (
                        title || inboxSettings(inboxKey).name || textEllipsis(`@${inboxKey}`, 16, 3, false)
                    )}
                </span>

                <div style={{
                    display: 'inline',
                    position: 'absolute',
                    right: 5,
                    top: -5,
                }}>
                    {showTools && (
                        <React.Fragment>
                            {isGroup && !isTrollbox && (
                                <Button {...{
                                    active: false,
                                    circular: true,
                                    icon: 'pencil',
                                    inverted: true,
                                    onClick: () => editName(
                                        inboxKey,
                                        () => setShowTools(false)
                                    ),
                                    size: toolIconSize,
                                    title: 'edit name',
                                }} />
                            )}

                            {isGroup && (
                                <Button {...{
                                    active: false,
                                    circular: true,
                                    icon: 'group',
                                    inverted: !showMembers,
                                    key: 'showMembers',
                                    onClick: () => setShowMembers(!showMembers),
                                    size: toolIconSize,
                                    title: 'members'
                                }} />
                            )}

                            {messages.length > 0 && (
                                <Button {...{
                                    active: false,
                                    circular: true,
                                    icon: 'trash',
                                    inverted: true,
                                    key: 'removeMessages',
                                    onClick: () => confirm({
                                        confirmButton: <Button negative content={textsCap.remove} />,
                                        header: textsCap.removeMessages,
                                        onConfirm: e => removeInboxMessages(inboxKey),
                                        size: 'mini',
                                    }),
                                    size: toolIconSize,
                                }} />
                            )}

                            <Button {...{
                                active: false,
                                circular: true,
                                icon: 'hide',
                                inverted: true,
                                key: 'hideConversation',
                                onClick: () => confirm({
                                    content: textsCap.archiveConversation,
                                    onConfirm: () => {
                                        inboxSettings(inboxKey, { hide: true }, true)
                                        openInboxBond.changed(null)
                                    },
                                    size: 'mini'
                                }),
                                size: toolIconSize,
                            }} />

                            {!isTrollbox && (
                                <Button {...{
                                    active: false,
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
                                    size: toolIconSize,
                                }} />
                            )}
                            <Button {...{
                                active: false,
                                circular: true,
                                icon: 'arrows alternate vertical',
                                inverted: !expanded,
                                onClick: toggleExpanded,
                                size: toolIconSize,
                            }} />
                        </React.Fragment>
                    )}
                    <Button {...{
                        active: false,
                        circular: true,
                        icon: 'cog',
                        inverted: !showTools,
                        onClick: () => setShowTools(!showTools),
                        size: toolIconSize,
                    }} />
                </div>
            </h1>
            <h4 style={{ margin: 0 }}>
                {textsCap.loggedInAs}: @{(getUser() || {}).id}
            </h4>
        </div>
    )
}
const MessageInput = ({ onRef, onSubmit, style }) => {
    const [value, setValue] = useState('')
    const handleSubmit = e => {
        e.preventDefault()
        if (value.trim().length === 0) return
        onSubmit(value)
        setValue('')
    }
    return (
        <form onSubmit={handleSubmit} style={style}>
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