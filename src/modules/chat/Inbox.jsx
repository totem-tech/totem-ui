import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Button } from 'semantic-ui-react'
import { textEllipsis } from '../../utils/utils'
import InboxMessages from './InboxMessages'
import FormInput from '../../components/FormInput'
import { UserID } from '../../components/buttons'
import {
    getMessages,
    inboxBonds,
    inboxSettings,
    openInboxBond,
    send,
    getTrollboxUserIds,
    createInbox,
} from './chat'
import client, { loginBond, getUser } from '../../services/chatClient'
import { translated } from '../../services/language'
import Message from '../../components/Message'
import { getByUserId } from '../../services/partner'
import { getLayout } from '../../services/window'

const [_, textsCap] = translated({
    close: 'close',
    inputPlaceholder: 'type something and press enter to send',
    loggedInAs: 'logged in as',
    loginRequired: 'login/registration required',
    members: 'members',
    messageError: 'error',
    offline: 'offline',
    online: 'online',
    privateChat: 'private chat',
    showConvList: 'show conversation list',
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

const InboxHeader = ({ inboxKey, isGroup, showMembers, setShowMembers, title }) => {
    const isMobile = getLayout() === 'mobile'
    const toolIconSize = isMobile ? undefined : 'mini'
    const { id: userId } = getUser() || {}

    return (
        <div className='header-container'>
            <h1 className='header'>
                <div className='tools left'>
                    <Button {...{
                        active: false,
                        circular: true,
                        icon: 'chevron down',
                        inverted: false,
                        onClick: () => document.getElementById('app').classList.remove('chat-expanded'),
                        size: toolIconSize,
                        title: textsCap.showConvList,
                    }} />
                </div>
                <span>
                    {inboxKey === EVERYONE ? textsCap.trollbox : (
                        title || inboxSettings(inboxKey).name || textEllipsis(`Chatting with @${inboxKey}`, 16, 3, false)
                    )}
                </span>

                <div className='tools right'>
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
                                                onClick: () => openInboxBond.changed(createInbox([memberId])),
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
        if (!value.trim()) return
        onSubmit(value)
        setValue('')
    }
    return (
        <form onSubmit={handleSubmit}>
            <FormInput {...{
                action: { icon: 'paper plane outline', onClick: handleSubmit },
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