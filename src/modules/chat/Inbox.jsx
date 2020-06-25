import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Icon } from 'semantic-ui-react'
import { textEllipsis } from '../../utils/utils'
import InboxMessages from './InboxMessages'
import FormInput from '../../components/FormInput'
import { UserID } from '../../components/buttons'
import {
    createInbox,
    expandedBond,
    getMessages,
    getTrollboxUserIds,
    openInboxBond,
    send,
    SUPPORT,
    TROLLBOX,
    newMsgBond,
    inboxSettings,
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
    pmBtnTitle: 'open back-channel',
    trollbox: 'totem global conversation',
    you: 'you',
}, true)

export default function Inbox(props) {
    let {
        inboxKey,
        receiverIds, // if not supplied use default open inbox
    } = props
    if (!inboxKey) return ''
    const [messages, setMessages] = useState(props.messages || getMessages(inboxKey))
    const [showMembers, setShowMembers] = useState(false)
    const isTrollbox = receiverIds.includes(TROLLBOX)
    const isGroup = !receiverIds.includes(SUPPORT) && receiverIds.length > 1 || isTrollbox
    const isMobile = getLayout() === MOBILE
    const msgsSelector = '.chat-container .inbox .messages'
    const scrollBtnSelector = '.chat-container .inbox .scroll-to-bottom'
    // scroll to bottom of the message list
    const scrollToBottom = (animate = false, force = false) => setTimeout(() => {
        const msgsEl = document.querySelector(msgsSelector)
        const btnWrapEl = document.querySelector(scrollBtnSelector)
        const isMobile = getLayout() === MOBILE
        const expanded = document.getElementById('app').classList.value.includes('inbox-expanded')
        // prevent scroll if scroll button is visible and not forced
        if (btnWrapEl.classList.value.includes('visible') && !force) return
        const animateClass = 'animate-scroll'
        animate && msgsEl.classList.add(animateClass)
        msgsEl && msgsEl.scrollTo(0, msgsEl.scrollHeight)
        setTimeout(() => {
            msgsEl.classList.remove(animateClass)
            // mark inbox as read
            if (!isMobile || expanded) inboxSettings(inboxKey, { unread: 0 })
        }, 500)
    })
    // on message list scroll show/hide scroll button
    const handleScroll = () => {
        const { scrollHeight, scrollTop, offsetHeight } = document.querySelector(msgsSelector) || {}
        const showBtn = (scrollHeight - offsetHeight - scrollTop) > offsetHeight
        const btnWrapEl = document.querySelector(scrollBtnSelector)
        btnWrapEl.classList[showBtn ? 'add' : 'remove']('visible')
    }

    useEffect(() => {
        let mounted = true
        // whenever a new message for current inbox is retrieved update message list
        const tieId = newMsgBond.tie(([key]) => {
            if (!mounted || key !== inboxKey) return
            setMessages(getMessages(inboxKey))
            scrollToBottom()
        })
        // focus and scoll down to latest msg
        scrollToBottom(false, true)

        return () => {
            mounted = false
            newMsgBond.untie(tieId)
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
                {showMembers ? <MemberList {...{ isTrollbox, receiverIds }} /> : (
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
            if (!isMobile || expandedBond._value) return
            expandedBond.changed(true)
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
                            const doExpand = isMobile && !expandedBond._value
                            setShowMembers(!showMembers)
                            doExpand && expandedBond.changed(true)
                        },
                        title: showMembers ? textsCap.returnToInbox : textsCap.showMembers
                    }} />
                )}
                <i {...{
                    className: 'expand icon',
                    onClick: e => e.stopPropagation() | expandedBond.changed(!expandedBond._value),
                    title: textsCap.showConvList,
                }} />
            </div>
        </div>
    </div>
)

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
                                        <Button {...{
                                            className: 'button-action',
                                            onClick: () => openInboxBond.changed(createInbox([memberId])),
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
                    className: 'dark-grey',
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