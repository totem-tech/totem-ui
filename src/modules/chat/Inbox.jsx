import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Button, Icon } from 'semantic-ui-react'
import { textEllipsis } from '../../utils/utils'
import InboxMessages from './InboxMessages'
import FormInput from '../../components/FormInput'
import { UserID } from '../../components/buttons'
import {
    createInbox,
    getMessages,
    getTrollboxUserIds,
    inboxBonds,
    inboxSettings,
    openInboxBond,
    send,
    SUPPORT,
    TROLLBOX,
} from './chat'
import client, { loginBond, getUser } from '../../services/chatClient'
import { translated } from '../../services/language'
import Message from '../../components/Message'
import { getInboxName } from './InboxList'
import { getLayout, MOBILE } from '../../services/window'

const [texts, textsCap] = translated({
    close: 'close',
    inConvWith: 'in conversation with',
    inputPlaceholder: 'type something and press enter to send',
    loginRequired: 'login/registration required',
    messageError: 'error',
    offline: 'offline',
    online: 'online',
    returnToInbox: 'return to conversation',
    showConvList: 'show conversation list',
    showMembers: 'show members',
    pmBtnTitle: 'start back-channel',
    trollbox: 'Totem Trollbox',
    you: 'you',
}, true)
const elementRefs = {}
// focus message input and scroll to bottom of the message list
const focusNScroll = inboxKey => setTimeout(() => {
    const { inputRef, messagesRef } = elementRefs[inboxKey]
    inputRef && inputRef.focus()
    messagesRef && messagesRef.scrollTo(0, messagesRef.scrollHeight)
})

export default function Inbox(props) {
    let {
        hiding, // indicates hiding animation in progress
        inboxKey,
        receiverIds, // if not supplied use default open inbox
    } = props
    if (!inboxKey) return ''
    elementRefs[inboxKey] = elementRefs[inboxKey] || {}
    const [messages, setMessages] = useState(props.messages || getMessages(inboxKey))
    const [showMembers, setShowMembers] = useState(false)
    const isTrollbox = receiverIds.includes(TROLLBOX)
    const isGroup = !receiverIds.includes(SUPPORT) && receiverIds.length > 1 || isTrollbox

    useEffect(() => {
        let mounted = true
        let bond = inboxBonds[inboxKey]
        const tieId = bond && bond.tie(() => mounted && setMessages(getMessages(inboxKey)))

        bond && inboxSettings(inboxKey, { unread: 0 }, true)
        return () => {
            mounted = false
            bond && bond.untie(tieId)
            elementRefs[inboxKey] = {}
        }
    }, []) // keep [] to prevent useEffect from being inboked on every render

    // focus and scoll down to latest msg
    !hiding && focusNScroll(inboxKey)

    return (
        <div className='inbox'>
            <div className='inbox-wrap'>
                <InboxHeader {...{
                    key: inboxKey,
                    inboxKey,
                    isGroup,
                    setShowMembers,
                    showMembers,
                }} />
                {showMembers ? <MemberList {...{ isTrollbox, receiverIds }} /> : (
                    <InboxMessages {...{
                        isPrivate: receiverIds.length === 1 && !isTrollbox,
                        onRef: ref => elementRefs[inboxKey].messagesRef = ref,
                        messages: messages.length > 0 ? messages : [{
                            message: textsCap.inputPlaceholder
                        }],
                    }} />
                )}
            </div>
            {!showMembers && (
                <MessageInput {... {
                    onRef: ref => elementRefs[inboxKey].inputRef = ref,
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
    inboxKey: PropTypes.string,
    receiverIds: PropTypes.array,
}

const InboxHeader = ({ inboxKey, isGroup, setShowMembers, showMembers }) => {
    const { id: userId } = getUser() || {}
    const expandedClass = 'inbox-expanded'
    const isInboxExpanded = () => document.getElementById('app')
        .classList.value.includes(expandedClass)
    const expandInbox = expand => document.getElementById('app')
        .classList[expand ? 'add' : 'remove'](expandedClass)
    return (
        <div {...{
            className: 'header',
            onClick: () => getLayout() === MOBILE && !isInboxExpanded() && expandInbox(true),
        }}>
            <div>
                <b>@{userId}</b> {texts.inConvWith}
            </div>
            <div>
                <b>
                    {getInboxName(inboxKey) || (
                        isGroup ? textEllipsis(`${inboxKey}`, 21, 3, false) : <UserID userId={inboxKey} />
                    )}
                </b>

                <div className='tools right'>
                    {isGroup && (
                        <Icon {...{
                            name: showMembers ? 'envelope' : 'group',
                            onClick: e => {
                                e.stopPropagation()
                                const isMobile = getLayout() === MOBILE
                                setShowMembers(!showMembers)
                                isMobile && expandInbox(true)
                            },
                            title: showMembers ? textsCap.returnToInbox : textsCap.showMembers
                        }} />
                    )}
                    <i {...{
                        className: 'expand icon',
                        onClick: e => e.stopPropagation() | expandInbox(!isInboxExpanded()),
                        title: textsCap.showConvList,
                    }} />
                </div>
            </div>
        </div>
    )
}

const MemberList = ({ isTrollbox, receiverIds }) => {
    const { id: ownId } = getUser() || {}
    const [online, setOnline] = useState({})
    useEffect(() => {
        let isMounted = true
        const frequency = 60000 // check user status every 60 seconds
        const checkOnline = () => {
            if (!isMounted) return
            if (!loginBond._value) return setOnline(false)
            const userIds = (!isTrollbox ? receiverIds : getTrollboxUserIds()).filter(id => id !== ownId)
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
        <div>
            {(!isTrollbox ? receiverIds : getTrollboxUserIds())
                .sort()
                .map(memberId => {
                    const isSelf = ownId === memberId
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
        <form className='input-wrap' onSubmit={handleSubmit}>
            <FormInput {...{
                action: {
                    className: 'dark-grey',
                    icon: 'paper plane outline',
                    onClick: handleSubmit,
                },
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