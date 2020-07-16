import React, { useState, useEffect } from 'react'
import { Button, Label } from 'semantic-ui-react'
import { arrSort, textEllipsis, arrUnique } from '../../utils/utils'
import FormInput from '../../components/FormInput'
import Message from '../../components/Message'
import client, { getUser } from '../../services/chatClient'
import { translated } from '../../services/language'
import { confirm, showForm } from '../../services/modal'
import { MOBILE, getLayout } from '../../services/window'
import {
    createInbox,
    expandedBond,
    getMessages,
    inboxSettings,
    inboxesSettings,
    inboxListBond,
    openInboxBond,
    removeInboxMessages,
    removeInbox,
    SUPPORT,
    TROLLBOX,
    newMsgBond,
    unreadCountBond,
} from './chat'
import NewInboxForm, { editName } from './NewInboxForm'

const ALL_ONLINE = 'green'
const SOME_ONLINE = 'yellow'
const OFFLINE = 'grey'
const [texts, textsCap] = translated({
    actionsHide: 'hide actions',
    actionsShow: 'show actions',
    archived: 'archived - reopen?',
    archiveConversation: 'archive conversation',
    changeGroupName: 'change group name',
    deleted: 'deleted - restart?',
    detailed: 'detailed',
    expand: 'expand',
    jumpToMsg: 'jump to message',
    newChat: 'new conversation',
    noResultMsg: 'no results found for your search',
    offline: 'offline',
    online: 'online',
    remove: 'clear',
    removeMessages: 'clear all messages',
    removeConversation: 'trash conversation',
    searchPlaceholder: 'search conversations',
    showHidden: 'show archived',
    support: 'totem support',
    trash: 'trash',
    trollbox: 'totem global conversation',
    you: 'you',
}, true)

export const getInboxName = (inboxKey, settings = inboxSettings(inboxKey), userId) => {
    const receiverIds = inboxKey.split(',')
    let name = receiverIds.includes(TROLLBOX) ? textsCap.trollbox : settings.name
    if (receiverIds.includes(SUPPORT)) {
        const otherUsers = receiverIds.filter(id => ![SUPPORT, userId].includes(id))
        const isSupportMember = otherUsers.length > 0
        // for support member display name as follows: "Totem support: UserID", otherwise "Totem Support"
        return textsCap.support + (!isSupportMember ? '' : `: ${otherUsers[0]}`)
    }
    return name
}

const filterInboxes = (query = '', showAll = false) => {
    const allSettings = inboxesSettings() || {}
    let filteredKeys = Object.keys(allSettings)
    if (!filteredKeys.length) return []

    const allMessages = getMessages()
    if (!showAll) {
        // ignore archived or deleted
        filteredKeys = filteredKeys.filter(key => {
            const { hide, deleted } = allSettings[key] || {}
            return !hide && !deleted
        })
    }

    const { id: userId } = getUser() || {}
    const result = filteredKeys.map(inboxKey => {
        const settings = allSettings[inboxKey] || {}
        const { createdTS, deleted, hide, lastMessageTS, unread = 0 } = settings
        // exclude action messages (eg: group name change)
        const messages = (allMessages.get(inboxKey) || [])
            .filter(m => !!m.message)
            .reverse()
        const lastMsg = messages[0]
        const name = getInboxName(inboxKey, settings, userId) || ''
        const label = deleted ? texts.deleted : hide && texts.archived
        const item = {
            archived: !!hide,
            deleted: !!deleted,
            inboxKey,
            isEmpty: messages.length === 0,
            label,
            message: lastMsg,
            name: name || inboxKey,
            ts: lastMessageTS || createdTS,
            unreadCount: unread,
            userId,
        }
        if (!query) return item
        let matchType = 1000
        let matchIndex = inboxKey.indexOf(query)
        if (matchIndex) {
            matchType = 2000
            matchIndex = name.toLowerCase().indexOf(query)
        }
        const queriedMsg = messages.find(m => {
            let index = m.message.toLowerCase().indexOf(query)
            if (index === -1) return
            if (matchIndex === -1) {
                matchIndex = index
                matchType = 3000
            }
            return true
        })

        // did not match name, key or any of the messages => filter out
        if (matchIndex === -1) return

        item.matchIndex = `${matchType}${matchIndex}`
        item.message = queriedMsg || lastMsg
        return item
    }).filter(Boolean)

    // sort by timestamp if query is empty, otherwise sort by match index
    const sortedResult = arrSort(result, query ? 'matchIndex' : 'ts')
    // exclude unnecessary information (ts/matchIndex)
    return sortedResult
}

export default function InboxList() {
    const { id: userId } = getUser() || {}
    const [query, setQuery] = useState('')
    const [status, setStatus] = useState({})
    // whether to include archived and deleted items
    const [showAll, setShowAllOrg] = useState(false)
    const [items, setItems] = useState(filterInboxes(query, showAll))
    const setShowAll = showAll => {
        expandedBond.changed(false)
        // update list 
        setItems(filterInboxes(query, showAll))
        setShowAllOrg(showAll)
    }

    // handle query change
    const handleSearchChange = async (_, { value }) => {
        expandedBond._value && expandedBond.changed(false)
        setQuery(value)
        setItems(filterInboxes(query, showAll))
    }

    useEffect(() => {
        let mounted = true
        const tieId = inboxListBond.tie(() => {
            mounted && setItems(filterInboxes(query, showAll))
        })

        // check online status of active private and group chat user ids
        const checkStatus = () => {
            if (!mounted) return
            const keys = items.map(x => x.inboxKey)
            const inboxUserIds = keys.map(x => x.split(',')
                .filter(id => ![userId, SUPPORT, TROLLBOX].includes(id))
            )
            const userIds = arrUnique(inboxUserIds.flat())
            if (userIds.length > 0) return
            client.isUserOnline(userIds, (err, online) => {
                if (!mounted) return
                const newStatus = {}
                if (!err) keys.forEach((key, i) => {
                    const ids = inboxUserIds[i]
                    const numOnline = ids.filter(id => online[id]).length
                    newStatus[key] = !numOnline ? OFFLINE : (
                        numOnline === ids.length ? ALL_ONLINE : SOME_ONLINE
                    )
                })
                setStatus(newStatus)
                setTimeout(() => checkStatus(), 60000)
            })
        }
        checkStatus()
        return () => {
            mounted = false
            inboxListBond.untie(tieId)
        }
    }, [showAll])
    return (
        <div {...{
            className: 'inbox-list',
            style: {
                // full height if no inbox is selected
                height: openInboxBond._value ? undefined : '100%'
            },
        }}>
            <ToolsBar {...{
                query,
                onSeachChange: handleSearchChange,
                showAll,
                toggleShowAll: () => setShowAll(!showAll),
            }} />
            <div className='list'>
                {items.map(item => <InboxListItem {...{
                    ...item,
                    active: openInboxBond._value === item.inboxKey,
                    key: JSON.stringify(item) + status[item.inboxKey],
                    query,
                }} />)}

                {query && <Message className='empty-message' content={textsCap.noResultMsg} />}
            </div>
        </div >
    )
}

const InboxListItem = ({
    active,
    archived,
    deleted,
    inboxKey,
    isEmpty,
    label,
    message: messageX, // last or queried message
    name,
    query = '',
    status,
    unreadCountX,
    userId,
}) => {
    const [unreadCount, setUnreadCount] = useState(unreadCountX)
    const [message, setMessage] = useState(messageX)
    const isTrollbox = inboxKey === TROLLBOX
    const receiverIds = inboxKey.split(',')
    const isSupport = receiverIds.includes(SUPPORT)
    const isGroup = receiverIds.length > 1
    const icon = isTrollbox ? 'globe' : (
        isSupport ? 'heartbeat' : ( // alts: ambulance, heartbeat, user doctor
            isGroup ? 'group' : 'user'
        )
    )
    const { id: msgId, message: msgText, senderId, } = message || {}
    const qIndex = !msgText ? -1 : msgText.toLowerCase().indexOf(query.toLowerCase())

    const handleHighlightedClick = e => {
        const isMobile = getLayout() === MOBILE
        e.stopPropagation()
        e.preventDefault()
        if (openInboxBond._value !== inboxKey) {
            // makes sure inbox is not deleted or archived
            createInbox(inboxKey.split(','))
            // open this inbox
            openInboxBond.changed(inboxKey)
        }
        isMobile && !expandedBond._value && expandedBond.changed(true)
        // scroll to highlighted message
        setTimeout(() => {
            const msgEl = document.getElementById(msgId)
            const msgsEl = document.querySelector('.chat-container .messages')
            if (!msgEl || !msgsEl) return
            msgEl.classList.add('blink')
            msgsEl.classList.add('animate-scroll')
            msgsEl.scrollTo(0, msgEl.offsetTop)
            setTimeout(() => {
                msgEl.classList.remove('blink')
                msgsEl.classList.remove('animate-scroll')
            }, 5000)
        }, 500)
    }

    useEffect(() => {
        let mounted = true
        const tieIdCount = unreadCountBond.tie(() => {
            if (!mounted) return
            // update unread count
            if (inboxSettings(inboxKey).unread !== unreadCount)
                setUnreadCount(unreadCount || 0)
        })
        const tieIdMsg = newMsgBond.tie(([key, id]) => {
            if (key !== inboxKey) return
            // new message received => show last message
            const lastMsg = (getMessages(inboxKey) || [])
                .filter(x => !!x.message)
                .slice(-1)[0]
            const updateRequired = !query || ((lastMsg || {}).message || '').toLowerCase().includes(query)
            updateRequired && setMessage(lastMsg)
        })

        return () => {
            mounted = false
            unreadCountBond.untie(tieIdCount)
            newMsgBond.untie(tieIdMsg)
        }
    }, [active, unreadCount])

    return (
        <div {...{
            className: 'list-item' + (active ? ' active' : ''),
            onClick: () => {
                const isMobile = getLayout() === MOBILE
                const isOpen = openInboxBond._value === inboxKey

                // inbox already open => toggle expanded
                if (isMobile && isOpen) return expandedBond.changed(!expandedBond._value)
                const key = openInboxBond._value === inboxKey ? null : inboxKey
                key && createInbox(key.split(','))
                openInboxBond.changed(key)
                isMobile && expandedBond.changed(true)
            }
        }}>
            <div className='left'>
                <Label {...{
                    icon: {
                        color: status,
                        name: icon,
                    },
                    content: `${unreadCount || ''}`,
                    title: status === OFFLINE ? textsCap.offline : textsCap.online,
                }} />
            </div>
            <div className='content'>
                <b>{textEllipsis(name, 30, 3, false) + ' '}</b>
                <i>
                    {label && (
                        <Label {...{
                            color: archived ? 'grey' : 'red',
                            content: label,
                            key: label,
                            size: 'mini',
                        }} />
                    )}
                </i>
                {!senderId ? '' : (
                    <div className='preview'>
                        <b>{senderId === userId ? textsCap.you : `@${senderId}`}</b>: {' '}
                        {!query || qIndex === -1 ? msgText : (
                            <span>
                                {msgText.slice(0, qIndex)}
                                <b {...{
                                    onClick: handleHighlightedClick,
                                    style: { background: 'yellow' },
                                    title: textsCap.jumpToMsg,
                                }}>
                                    {msgText.slice(qIndex, qIndex + query.length)}
                                </b>
                                {msgText.slice(qIndex + query.length)}
                            </span>
                        )}
                    </div>
                )}
            </div>
            <InboxActions {...{
                inboxKey,
                isGroup,
                isSupport,
                isTrollbox,
                isEmpty,
                archived,
                deleted,
            }} />
        </div>
    )
}

const ToolsBar = ({ query, onSeachChange, showAll, toggleShowAll }) => (
    <div className='tools'>
        <div className='actions'>
            <Button.Group {...{
                color: 'grey',
                widths: 2,
                buttons: [
                    {
                        active: showAll,
                        basic: true,
                        compact: true,
                        content: textsCap.showHidden,
                        icon: 'find',
                        key: 'all',
                        onClick: toggleShowAll,
                        labelPosition: 'left',
                    },
                    {
                        active: false,
                        basic: true,
                        content: textsCap.newChat,
                        labelPosition: 'right',
                        icon: 'edit',
                        key: 'new',
                        onClick: () => showForm(NewInboxForm, {
                            onSubmit: (ok, { inboxKey }) => ok && openInboxBond.changed(inboxKey)
                        }),
                        style: { textAlign: 'right' }
                    }
                ]
            }} />
        </div>
        <div className='search'>
            <FormInput {...{
                action: !query ? undefined : {
                    // basic: true,
                    icon: 'close',
                    onClick: () => onSeachChange({}, { value: '' }),
                },
                icon: query ? undefined : 'search',
                name: 'keywords',
                onChange: onSeachChange,
                placeholder: textsCap.searchPlaceholder,
                type: 'text',
                value: query,
            }} />
        </div>
    </div>
)

const InboxActions = ({ inboxKey, isGroup, isSupport, isTrollbox, isEmpty, archived, deleted }) => {
    const [showActions, setShowActions] = useState(false)
    const actions = [
        isGroup && !isTrollbox && !isSupport && {
            icon: 'pencil',
            onClick: e => e.stopPropagation() | editName(inboxKey, () => setShowActions(false)),
            title: textsCap.changeGroupName,
        },
        !deleted && !archived && {
            icon: 'hide',
            onClick: e => e.stopPropagation() | confirm({
                content: textsCap.archiveConversation,
                onConfirm: () => {
                    inboxSettings(inboxKey, { hide: true })
                    openInboxBond.changed(null)
                },
                size: 'mini'
            }),
            title: textsCap.archiveConversation
        },
        !isEmpty && {
            icon: 'erase',
            onClick: e => e.stopPropagation() | confirm({
                confirmButton: <Button negative content={textsCap.remove} />,
                header: textsCap.removeMessages,
                onConfirm: e => removeInboxMessages(inboxKey),
                size: 'mini',
            }),
            title: textsCap.removeMessages
        },
        !deleted && !isTrollbox && !isSupport && {
            icon: 'trash',
            onClick: e => {
                e.stopPropagation()
                isEmpty ? removeInbox(inboxKey) : confirm({
                    confirmButton: <Button negative content={textsCap.trash} />,
                    header: textsCap.removeConversation,
                    onConfirm: () => removeInbox(inboxKey) | openInboxBond.changed(null),
                    size: 'mini',
                })
            },
            title: textsCap.removeConversation
        },
    ].filter(Boolean)
    return !actions.length ? '' : (
        <span className='actions'>
            {[
                ...(showActions ? actions : []),
                {
                    active: showActions,
                    icon: 'cog',
                    onClick: e => e.stopPropagation() | setShowActions(!showActions),
                    title: showActions ? textsCap.actionsHide : textsCap.actionsShow,
                },
            ].map(action => (
                <Button {...{
                    ...action,
                    // circular: true,
                    // className: 'dark-grey',
                    key: action.icon,
                    size: 'tiny'
                }} />
            ))}
        </span>
    )
}
