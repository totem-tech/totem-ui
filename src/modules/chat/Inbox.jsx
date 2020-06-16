import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Button, Icon } from 'semantic-ui-react'
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

const [texts, textsCap] = translated({
    close: 'close',
    inConvWith: 'in conversation with',
    inputPlaceholder: 'type something and press enter to send',
    loginRequired: 'login/registration required',
    members: 'members',
    messageError: 'error',
    offline: 'offline',
    online: 'online',
    showConvList: 'show conversation list',
    pmBtnTitle: 'start back-channel',
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
    } = props
    if (!inboxKey) return ''
    data[inboxKey] = data[inboxKey] || {}
    const [messages, setMessages] = useState(props.messages || getMessages(inboxKey))
    const [showMembers, setShowMembers] = useState(false)
    const isTrollbox = receiverIds.includes(EVERYONE)
    const isGroup = receiverIds.length > 1 || isTrollbox
    const header = (
        <InboxHeader {...{
            key: inboxKey,
            inboxKey,
            isGroup,
            isTrollbox,
            setShowMembers,
            showMembers,
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
    setShowMembers,
    showMembers,
}) => {
    const { id: userId } = getUser() || {}

    return (
        <div className='header'>
            <div>
                <b>@{userId}</b> {texts.inConvWith}
            </div>
            <div>
                <b>
                    {isTrollbox ? textsCap.trollbox : inboxSettings(inboxKey).name || (
                        isGroup ? textEllipsis(`${inboxKey}`, 18, 3, false) : <UserID userId={inboxKey} />
                    )}
                </b>

                <div className='tools right'>
                    {isGroup && (
                        <Icon {...{
                            name: 'group',
                            onClick: () => setShowMembers(!showMembers),
                            title: textsCap.members
                        }} />
                    )}
                    <i {...{
                        className: 'expand icon',
                        onClick: () => {
                            const { classList } = document.getElementById('app')
                            const expandedClass = 'chat-expanded'
                            const expanded = classList.value.includes(expandedClass)
                            classList[!expanded ? 'add' : 'remove'](expandedClass)
                        },
                        title: textsCap.showConvList,
                    }} />
                </div>
            </div>
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
            const userIds = (!isTrollbox ? receiverIds : getTrollboxUserIds()).filter(id => id !== userId)
            userIds.length && client.isUserOnline(userIds, (err, online) => !err && setOnline(online))
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
                        const memberOnline = isSelf ? loginBond._value : online[memberId]
                        return (
                            <Message {...{
                                className: 'member-list-item',
                                content: (
                                    <div>
                                        <UserID userId={memberId} onClick={isSelf ? null : undefined} />
                                        {!isSelf && (
                                            <div {...{
                                                className: 'button-action',
                                                onClick: () => openInboxBond.changed(createInbox([memberId])),
                                            }}>
                                                {textsCap.pmBtnTitle}
                                                <i className='icon chat dark-grey' />
                                            </div>
                                        )}
                                    </div>
                                ),
                                icon: {
                                    className: 'user-icon',
                                    color: memberOnline ? 'green' : undefined,
                                    name: 'user',
                                    title: memberOnline ? textsCap.online : textsCap.offline,
                                },
                                key: memberId,
                                size: 'mini',
                            }} />
                        )
                    })}
            </div>
        </div >
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