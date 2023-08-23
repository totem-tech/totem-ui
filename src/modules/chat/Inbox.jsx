import PropTypes from 'prop-types'
import React, { useEffect, useState } from 'react'
import { BehaviorSubject } from 'rxjs'
import { Button, Icon } from 'semantic-ui-react'
import { UserID } from '../../components/buttons'
import FormInput from '../../components/FormInput'
import client, {
    getUser,
    rxIsLoggedIn,
    rxIsRegistered,
} from '../../utils/chatClient'
import { translated } from '../../utils/languageHelper'
import {
    IGNORE_UPDATE_SYMBOL,
    Message,
    useIsMobile,
    useMount,
    useRxSubject,
    useRxSubjectOrValue,
    useRxSubjects
} from '../../utils/reactjs'
import { deferred, textEllipsis } from '../../utils/utils'
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
import InboxMessages from './InboxMessages'
import { getInboxName } from './InboxList'

const textsCap = {
    close: 'close',
    inConvWith: 'in conversation with',
    inboxCompact: 'compact view',
    inboxExpand: 'expand view',
    inboxHide: 'hide conversation',
    inboxShow: 'show conversation',
    inputPlaceholder: 'type something and press enter to send',
    loginRequired: 'login/registration required',
    messageError: 'error',
    offline: 'offline',
    online: 'online',
    returnToInbox: 'return to conversation',
    showMembers: 'show members',
    pmBtnTitle: 'open back-channel',
    trollbox: 'Totem Global Conversation',
    you: 'you',
}
const texts = translated(textsCap, true)[0]

const msgsSelector = '.chat-container .inbox .messages'
const scrollBtnSelector = '.chat-container .inbox .scroll-to-bottom'
// scroll to bottom of the message list
const scrollToBottom = deferred((isMobile, animate = true, markAsRead = true) => {
    const msgsEl = document.querySelector(msgsSelector)
    const btnWrapEl = document.querySelector(scrollBtnSelector)
    // prevent scroll if scroll button is visible and not markAsRead
    if (btnWrapEl?.classList.value?.includes('visible') && !markAsRead) return

    const animateClass = 'animate-scroll'
    animate && msgsEl?.classList.add(animateClass)
    msgsEl && msgsEl.scrollTo(0, msgsEl.scrollHeight)
    setTimeout(() => {
        msgsEl?.classList.remove(animateClass)
        // mark inbox as read
        if (!isMobile || rxExpanded.value) inboxSettings(rxOpenInboxKey.value, { unread: 0 })
    }, 500)
}, 100)
// on message list scroll show/hide scroll button
const handleScroll = () => {
    const {
        scrollHeight,
        scrollTop,
        offsetHeight,
    } = document.querySelector(msgsSelector) || {}
    const showBtn = (scrollHeight - offsetHeight - scrollTop) > offsetHeight
    const { classList } = document.querySelector(scrollBtnSelector) || {}
    const func = showBtn
        ? 'add'
        : 'remove'
    classList?.[func]?.('visible')
}

const rxLoaded = new BehaviorSubject(false)
// delay only the first time inbox is opened
setTimeout(() => rxLoaded.next(true), 300)

window.rxOpenInboxKey = rxOpenInboxKey
export default function Inbox({ inboxKey = rxOpenInboxKey }) {
    const [messages = []] = useRxSubjects(
        [rxMsg, inboxKey],
        ([[key] = [], openInboxKey]) => {
            key ??= openInboxKey
            // ignore if not 
            if (!key || key !== openInboxKey) return IGNORE_UPDATE_SYMBOL

            const msgs = getMessages(key)
            setTimeout(() => scrollToBottom(isMobile), 200)
            return msgs || []
        }
    )
    inboxKey = useRxSubjectOrValue(inboxKey) || ''
    const receiverIds = inboxKey.split(',')
    const isTrollbox = receiverIds.includes(TROLLBOX)
    const isGroup = receiverIds.length > 1 || isTrollbox
    const [showMembers, setShowMembers] = useState(false)
    const isMobile = useIsMobile()
    const [loaded] = useRxSubject(rxLoaded)

    // focus and scoll down to latest msg
    useMount(() => scrollToBottom(isMobile))

    const ready = !!inboxKey
        && loaded
        && !!messages
    return ready && (
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
                {showMembers
                    ? (
                        <MemberList {...{
                            inboxKey,
                            isTrollbox,
                            receiverIds,
                        }} />
                    )
                    : (
                        <React.Fragment>
                            <InboxMessages {...{
                                className: 'messages',
                                isPrivate: receiverIds.length === 1 && !isTrollbox,
                                messages,
                                onScroll: handleScroll,
                            }} />

                            <div className='scroll-to-bottom'>
                                <Button {...{
                                    active: false,
                                    circular: true,
                                    color: 'black',
                                    icon: 'chevron down',
                                    onClick: () => scrollToBottom(isMobile),
                                }} />
                            </div>
                        </React.Fragment>
                    )}
            </div>
            {!showMembers && (
                <MessageInput
                    className='input-wrap'
                    onSubmit={draft => {
                        send(receiverIds, draft, false)
                        scrollToBottom(isMobile, false, false)
                    }}
                />
            )}
        </div >
    )
}
Inbox.propTypes = {
    inboxKey: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.instanceOf(BehaviorSubject),
    ])
}

const InboxHeader = ({
    expanded = useRxSubjectOrValue(rxExpanded),
    inboxKey,
    isGroup,
    isMobile,
    setShowMembers,
    showMembers,
}) => (
    <div {...{
        className: 'header',
        onClick: () => {
            if (!isMobile) return
            rxExpanded.next(!expanded)
            setShowMembers(false)
        },
    }}>
        <div>
            <b>@{(getUser() || {}).id}</b> {texts.inConvWith}
        </div>
        <div>
            <b>
                {getInboxName(inboxKey) || (
                    isGroup
                        ? textEllipsis(`${inboxKey}`, 21, 3, false)
                        : <UserID userId={inboxKey} />
                )}
            </b>

            <div className='tools right'>
                {isGroup && (
                    <Icon {...{
                        name: showMembers
                            ? 'undo'
                            : 'group',
                        onClick: e => {
                            e.stopPropagation()
                            const doExpand = isMobile && !expanded
                            setShowMembers(!showMembers)
                            doExpand && rxExpanded.next(true)
                        },
                        title: showMembers
                            ? textsCap.returnToInbox
                            : textsCap.showMembers
                    }} />
                )}
                <i {...{
                    className: 'expand icon',
                    onClick: e => e.stopPropagation()
                        | rxExpanded.next(!rxExpanded.value),
                    title: isMobile
                        ? expanded
                            ? textsCap.inboxHide
                            : textsCap.inboxShow
                        : expanded
                            ? textsCap.inboxCompact
                            : textsCap.inboxExpand,
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
        const checkOnline = async () => {
            if (!isMounted) return
            if (!rxIsLoggedIn.value) return setOnline(false)
            const userIds = (
                !isTrollbox && !isSupport
                    ? receiverIds
                    : getInboxUserIds(inboxKey)
            ).filter(id => id !== ownId)
            if (!userIds.length) return
            const online = client
                .isUserOnline(userIds)
                .catch(() => false) // ignore error

            online && setOnline(online)
        }
        const intervalId = setInterval(checkOnline, frequency)
        checkOnline()
        return () => {
            isMounted = false
            intervalId && clearInterval(intervalId)
        }
    }, [])

    const members = !isTrollbox && !isSupport
        ? receiverIds
        : getInboxUserIds(inboxKey)
    return (
        <div className='member-list'>
            {members
                .sort()
                .map(memberId => {
                    const isSelf = ownId === memberId
                    const memberOnline = isSelf
                        ? rxIsLoggedIn.value
                        : online[memberId]
                    return (
                        <Message {...{
                            className: 'member-list-item',
                            content: (
                                <div>
                                    <UserID {...{
                                        onClick: isSelf && null,
                                        userId: memberId,
                                    }} />
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
    const [isRegistered] = useRxSubject(rxIsRegistered)
    const handleSubmit = e => {
        e.preventDefault()
        if (!value.trim()) return
        onSubmit(value)
        setValue('')
    }

    return (
        <form {...{
            className,
            onSubmit: handleSubmit,
        }}>
            <FormInput {...{
                action: {
                    icon: 'paper plane outline',
                    onClick: handleSubmit,
                },
                autoComplete: 'off',
                autoFocus: true,
                disabled: !isRegistered,
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