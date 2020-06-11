import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Button, Icon } from 'semantic-ui-react'
import { textEllipsis, arrReverse } from '../../utils/utils'
import InboxMessages from './InboxMessages'
import { editName } from './NewInboxForm'
import FormInput from '../../components/FormInput'
import { UserID } from '../../components/buttons'
import {
    getMessages,
    inboxBonds,
    inboxSettings,
    openInboxBond,
    send,
    removeInboxMessages,
    removeInbox,
    getTrollboxUserIds,
    newInbox,
} from './chat'
import client, { loginBond, getUser } from '../../services/chatClient'
import { translated } from '../../services/language'
import { confirm } from '../../services/modal'
import Message from '../../components/Message'
import { getByUserId } from '../../services/partner'
import { getLayout } from '../../services/window'

const [_, textsCap] = translated({
    archiveConversation: 'archive conversation',
    close: 'close',
    changeGroupName: 'change group name',
    expand: 'expand',
    inputPlaceholder: 'type something and press enter to send',
    loggedInAs: 'logged in as',
    loginRequired: 'login/registration required',
    members: 'members',
    messageError: 'error',
    offline: 'offline',
    online: 'online',
    privateChat: 'private chat',
    remove: 'remove',
    removeMessages: 'remove messages',
    removeConversation: 'remove conversation',
    shrink: 'shrink',
    toolsHide: 'hide tools',
    toolsShow: 'show tools',
    trollbox: 'Totem Trollbox',
    you: 'you',
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
        hiding, // indicates hiding animation in progress
        inboxKey,
        receiverIds, // if not supplied use default open inbox
        title,
    } = props
    if (!inboxKey) return ''
    data[inboxKey] = data[inboxKey] || {}
    const [messages, setMessages] = useState(props.messages || getMessages(inboxKey))
    const [showMembers, setShowMembers] = useState(false)
    const isTrollbox = receiverIds.includes(EVERYONE)
    const isGroup = receiverIds.length > 1 || isTrollbox
    const header = (
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
    )

    useEffect(() => {
        let mounted = true
        let bond = inboxBonds[inboxKey]
        const tieId = bond && bond.tie(() => mounted && setMessages(getMessages(inboxKey)))

        bond && inboxSettings(inboxKey, { unread: 0 }, true)
        return () => {
            mounted = false
            bond && bond.untie(tieId)
        }
    }, []) // keep [] to prevent useEffect from being inboked on every render

    // focus and scoll down to latest msg
    !hiding && focusNScroll(inboxKey)

    if (showMembers) return <MemberList {...{ header, isTrollbox, receiverIds }} />
    return (
        <div className='inbox'>
            {header}
            <InboxMessages {...{
                isPrivate: receiverIds.length === 1 && !isTrollbox,
                onRef: ref => data[inboxKey].messagesRef = ref,
                messages: messages.length > 0 ? messages : [{
                    message: textsCap.inputPlaceholder
                }],
            }} />
            <MessageInput {... {
                onRef: ref => data[inboxKey].inputRef = ref,
                onSubmit: draft => {
                    send(receiverIds, draft, false)
                    focusNScroll(inboxKey)
                },
            }} />
        </div >
    )
}
Inbox.propTypes = {
    inboxKey: PropTypes.string.isRequired,
    receiverIds: PropTypes.array.isRequired,
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
    const { id: userId } = getUser() || {}
    const toggleExpanded = () => {
        document.getElementById('app').classList[expanded ? 'remove' : 'add']('chat-expanded')
        setExpanded(!expanded)
    }

    !isGroup && useEffect(() => {
        let isMounted = true
        const frequency = 60000 // check user status every 60 seconds
        const friend = receiverIds[0]
        const checkOnline = () => {
            if (!isMounted) return
            if (!loginBond._value) return setOnline(false)
            const { timestamp } = arrReverse(messages).find(m => m.senderId === friend) || {}
            const tsDiff = new Date() - new Date(timestamp)
            // received a message from friend within the frequency duration => assume online
            if (tsDiff < frequency) return setOnline(true)
            client.isUserOnline(receiverIds[0], (err, online) => !err && setOnline(!!online))
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
            {!isGroup && online && (
                <div className='online-indicator'>
                    <Icon {...{
                        color: 'green',
                        name: 'circle',
                        title: textsCap.online,
                    }} />
                </div>
            )}
            <h1 className='header'>
                <span style={{ opacity: showTools ? 0.1 : 1 }}>
                    {inboxKey === EVERYONE ? textsCap.trollbox : (
                        title || inboxSettings(inboxKey).name || textEllipsis(`@${inboxKey}`, 16, 3, false)
                    )}
                </span>

                <div className='tools'>
                    {showTools && (
                        <React.Fragment>
                            {isGroup && !isTrollbox && (
                                <Button {...{
                                    active: false,
                                    circular: true,
                                    icon: 'pencil',
                                    inverted: true,
                                    onClick: () => editName(inboxKey, () => setShowTools(false)),
                                    size: toolIconSize,
                                    title: textsCap.changeGroupName,
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
                                    title: textsCap.members
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
                                title: textsCap.archiveConversation
                            }} />

                            {messages.length > 0 && (
                                <Button {...{
                                    active: false,
                                    circular: true,
                                    icon: 'erase',
                                    inverted: true,
                                    key: 'removeMessages',
                                    onClick: () => confirm({
                                        confirmButton: <Button negative content={textsCap.remove} />,
                                        header: textsCap.removeMessages,
                                        onConfirm: e => removeInboxMessages(inboxKey),
                                        size: 'mini',
                                    }),
                                    size: toolIconSize,
                                    title: textsCap.removeMessages
                                }} />
                            )}

                            {!isTrollbox && (
                                <Button {...{
                                    active: false,
                                    circular: true,
                                    icon: 'trash',
                                    inverted: true,
                                    key: 'removeConversation',
                                    onClick: () => messages.length === 0 ? removeInbox(inboxKey) : confirm({
                                        confirmButton: <Button negative content={textsCap.remove} />,
                                        header: textsCap.removeConversation,
                                        onConfirm: () => removeInbox(inboxKey),
                                        size: 'mini',
                                    }),
                                    size: toolIconSize,
                                    title: textsCap.removeConversation
                                }} />
                            )}
                            <Button {...{
                                active: false,
                                circular: true,
                                icon: 'arrows alternate vertical',
                                inverted: !expanded,
                                onClick: toggleExpanded,
                                size: toolIconSize,
                                title: expanded ? textsCap.shrink : textsCap.expand,
                            }} />
                        </React.Fragment>
                    )}
                    <Button {...{
                        active: false,
                        circular: true,
                        icon: showTools ? 'close' : 'cog',
                        inverted: !showTools,
                        onClick: () => setShowTools(!showTools),
                        size: toolIconSize,
                        title: showTools ? textsCap.toolsHide : textsCap.toolsShow,
                    }} />
                </div>
            </h1>
            <h4 className='subheader'>
                {textsCap.loggedInAs}: @{userId}
            </h4>
        </div>
    )
}

const MemberList = ({ header, isTrollbox, receiverIds }) => {
    const { id: userId } = getUser() || {}
    const [online, setOnline] = useState({})

    useEffect(() => {
        let isMounted = true
        const frequency = 60000 // check user status every 60 seconds
        const checkOnline = () => {
            if (!isMounted) return
            if (!loginBond._value) return setOnline(false)
            const userIds = !isTrollbox ? receiverIds : getTrollboxUserIds()
            client.isUserOnline(userIds, (err, online) => !err && setOnline(online))
        }
        const intervalId = setInterval(checkOnline, frequency)
        checkOnline()
        return () => {
            isMounted = false
            intervalId && clearInterval(intervalId)
        }
    }, [])
    return (
        <div className='inbox'>
            {header}
            <div>
                {(!isTrollbox ? receiverIds : getTrollboxUserIds())
                    .sort()
                    .map(memberId => {
                        const isSelf = userId === memberId
                        return (
                            <Message {...{
                                className: 'member-list-item',
                                content: (
                                    <div>
                                        <UserID userId={memberId} onClick={isSelf ? null : undefined} />
                                        {!isSelf && (
                                            <Button {...{
                                                circular: true,
                                                className: 'button-action',
                                                disabled: isSelf,
                                                icon: 'chat',
                                                onClick: () => openInboxBond.changed(newInbox([memberId])),
                                                size: 'mini',
                                                style: { width: 'auto' },
                                                title: textsCap.privateChat,
                                            }} />
                                        )}
                                    </div>
                                ),
                                header: isSelf ? textsCap.you : (getByUserId(memberId) || {}).name,
                                icon: {
                                    className: 'user-icon',
                                    color: online[memberId] ? 'green' : 'red',
                                    name: 'user',
                                    title: online[memberId] ? textsCap.online : textsCap.offline,
                                },
                                key: memberId,
                                size: 'mini',
                            }} />
                        )
                    })}
            </div>
        </div>
    )
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