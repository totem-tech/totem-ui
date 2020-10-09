import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Button, Icon } from 'semantic-ui-react'
import { textEllipsis } from '../../utils/utils'
import InboxMessages from './InboxMessages'
import FormInput from '../../components/FormInput'
import { UserID } from '../../components/buttons'
import {
    createInbox,
    getInboxUserIds,
    getMessages,
    inboxSettings,
    rxExpanded,
    rxMsg,
    rxOpenInboxKey,
    send,
    SUPPORT,
    TROLLBOX,
} from './chat'
import client, { getUser, rxIsLoggedIn } from './ChatClient'
import { translated } from '../../services/language'
import Message from '../../components/Message'
import { getInboxName } from './InboxList'
import { getLayout, MOBILE, setClass } from '../../services/window'
import { unsubscribe } from '../../services/react'

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
    pmBtnTitle: 'open back-channel',
    trollbox: 'Totem Global Conversation',
    you: 'you',
}, true)

const msgsSelector = '.chat-container .inbox .messages'
const scrollBtnSelector = '.chat-container .inbox .scroll-to-bottom'
// scroll to bottom of the message list
const scrollToBottom = (animate = false, force = false) => setTimeout(() => {
    const msgsEl = document.querySelector(msgsSelector)
    const btnWrapEl = document.querySelector(scrollBtnSelector)
    const isMobile = getLayout() === MOBILE
    // prevent scroll if scroll button is visible and not forced
    if (btnWrapEl.classList.value.includes('visible') && !force) return
    const animateClass = 'animate-scroll'
    animate && msgsEl.classList.add(animateClass)
    msgsEl && msgsEl.scrollTo(0, msgsEl.scrollHeight)
    setTimeout(() => {
        msgsEl.classList.remove(animateClass)
        // mark inbox as read
        if (!isMobile || rxExpanded.value) inboxSettings(rxOpenInboxKey.value, { unread: 0 })
    }, 500)
})
// on message list scroll show/hide scroll button
const handleScroll = () => {
    const { scrollHeight, scrollTop, offsetHeight } = document.querySelector(msgsSelector) || {}
    const showBtn = (scrollHeight - offsetHeight - scrollTop) > offsetHeight
    const btnWrapEl = document.querySelector(scrollBtnSelector)
    btnWrapEl.classList[showBtn ? 'add' : 'remove']('visible')
}

export default function Inbox(props) {
    let { inboxKey, receiverIds } = props
    if (!inboxKey) return ''
    const [messages, setMessages] = useState(props.messages || getMessages(inboxKey))
    const [showMembers, setShowMembers] = useState(false)
    const isTrollbox = receiverIds.includes(TROLLBOX)
    const isGroup = receiverIds.length > 1 || isTrollbox
    const isMobile = getLayout() === MOBILE

    useEffect(() => {
        let mounted = true
        const subscriptions = {}
        // whenever a new message for current inbox is retrieved update message list
        subscriptions.newMsg = rxMsg.subscribe(([key]) => {
            if (!mounted || key !== inboxKey) return
            setMessages(getMessages(inboxKey))
            scrollToBottom()
        })
        // focus and scoll down to latest msg
        scrollToBottom(false, true)

        return () => {
            mounted = false
            unsubscribe(subscriptions)
        }
    }, []) // keep [] to prevent useEffect from being invoked on every render

    return (
        <div className='inbox'>
            <div className='inbox-wrap'>
                <InboxHeader {...{
                    key: inboxKey,
                    inboxKey,
                    isGroup,
                    isMobile,
                    setShowMembers,
                    showMembers,
                }} />
                {showMembers ? <MemberList {...{ inboxKey, isTrollbox, receiverIds }} /> : (
                    <React.Fragment>
                        <InboxMessages {...{
                            className: 'messages',
                            isPrivate: receiverIds.length === 1 && !isTrollbox,
                            messages: messages.length > 0 ? messages : [{
                                message: textsCap.inputPlaceholder
                            }],
                            onScroll: handleScroll
                        }} />

                        <div className='scroll-to-bottom'>
                            <Button {...{
                                active: false,
                                circular: true,
                                color: 'black',
                                icon: 'chevron down',
                                onClick: () => scrollToBottom(true, true),
                            }} />
                        </div>
                    </React.Fragment>
                )}
            </div>
            {!showMembers && (
                <MessageInput
                    className='input-wrap'
                    onSubmit={draft => send(receiverIds, draft, false) | scrollToBottom()}
                />
            )}
        </div >
    )
}
Inbox.propTypes = {
    inboxKey: PropTypes.string,
    receiverIds: PropTypes.array,
}

const InboxHeader = ({ inboxKey, isGroup, isMobile, setShowMembers, showMembers }) => (
    <div {...{
        className: 'header',
        onClick: () => {
            if (!isMobile) return
            rxExpanded.next(!rxExpanded.value)
            setShowMembers(false)
        },
    }}>
        <div>
            <b>@{(getUser() || {}).id}</b> {texts.inConvWith}
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
                        name: showMembers ? 'undo' : 'group',
                        onClick: e => {
                            e.stopPropagation()
                            const doExpand = isMobile && !rxExpanded.value
                            setShowMembers(!showMembers)
                            doExpand && rxExpanded.next(true)
                        },
                        title: showMembers ? textsCap.returnToInbox : textsCap.showMembers
                    }} />
                )}
                <i {...{
                    className: 'expand icon',
                    onClick: e => e.stopPropagation() | rxExpanded.next(!rxExpanded.value),
                    title: textsCap.showConvList,
                }} />
            </div>
        </div>
    </div>
)

const MemberList = ({ inboxKey, isTrollbox, receiverIds }) => {
    const { id: ownId } = getUser() || {}
    const [online, setOnline] = useState({})
    const isSupport = receiverIds.includes(SUPPORT)
    useEffect(() => {
        let isMounted = true
        const frequency = 60000 // check user status every 60 seconds
        const checkOnline = () => {
            if (!isMounted) return
            if (!rxIsLoggedIn.value) return setOnline(false)
            const userIds = (!isTrollbox && !isSupport ? receiverIds : getInboxUserIds(inboxKey))
                .filter(id => id !== ownId)
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
            {(!isTrollbox && !isSupport ? receiverIds : getInboxUserIds(inboxKey))
                .sort()
                .map(memberId => {
                    const isSelf = ownId === memberId
                    const memberOnline = isSelf ? rxIsLoggedIn.value : online[memberId]
                    return (
                        <Message {...{
                            className: 'member-list-item',
                            content: (
                                <div>
                                    <UserID userId={memberId} onClick={isSelf ? null : undefined} />
                                    {!isSelf && (
                                        <Button {...{
                                            className: 'button-action',
                                            onClick: () => rxOpenInboxKey.next(createInbox([memberId])),
                                            content: textsCap.pmBtnTitle,
                                            icon: 'chat',
                                            labelPosition: 'right',
                                            active: false,
                                            basic: true,
                                            style: { textAlign: 'right' }
                                        }} />
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

const MessageInput = ({ className, onSubmit }) => {
    const [value, setValue] = useState('')
    const handleSubmit = e => {
        e.preventDefault()
        if (!value.trim()) return
        onSubmit(value)
        setValue('')
    }
    return (
        <form {...{ className, onSubmit: handleSubmit }}>
            <FormInput {...{
                action: {
                    icon: 'paper plane outline',
                    onClick: handleSubmit,
                },
                autoComplete: 'off',
                autoFocus: true,
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