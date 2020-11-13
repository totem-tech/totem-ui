import React, { useState, useEffect } from 'react'
import { Button, Label } from 'semantic-ui-react'
import { arrSort, textEllipsis } from '../../utils/utils'
import FormInput from '../../components/FormInput'
import Message from '../../components/Message'
import { getUser } from './ChatClient'
import { translated } from '../../services/language'
import { confirm, showForm } from '../../services/modal'
import { MOBILE, getLayout } from '../../services/window'
import {
    createInbox,
    rxExpanded,
    getMessages,
    inboxSettings,
    inboxesSettings,
    rxInboxListChanged,
    rxOpenInboxKey,
    removeInboxMessages,
    removeInbox,
    SUPPORT,
    TROLLBOX,
    rxUsersOnline,
    jumpToMessage,
} from './chat'
import NewInboxForm, { showEditNameForm } from './NewInboxForm'
import { unsubscribe, useRxSubject } from '../../services/react'

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
    support: 'Totem Support',
    trash: 'trash',
    trollbox: 'Totem Global Conversation',
    you: 'you',
}, true)

export const getInboxName = (inboxKey, settings = inboxSettings(inboxKey), userId) => {
    const receiverIds = inboxKey.split(',')
    let name = receiverIds.includes(TROLLBOX) ? textsCap.trollbox : settings.name
    if (receiverIds.includes(SUPPORT)) {
        const otherUsers = receiverIds.filter(id => ![SUPPORT, userId].includes(id))
        // for support member display name as follows: "Totem Support: UserID", otherwise only "Totem Support"
        if (receiverIds.length <= 2 || otherUsers.length === 0) return textsCap.support
        return `${textsCap.support}: ${otherUsers[0]}`
    }
    return name
}

const filterInboxes = (query = '', showAll = false) => {
    query = query.trim().toLowerCase()
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
        let matchIndex = name.toLowerCase().indexOf(query)
        let matchType = 1000
        if (matchIndex === -1) {
            matchIndex = inboxKey.indexOf(query)
            matchType = 2000
        }
        // find the latest message matching query
        const queriedMsg = messages.find(m => {
            let index = m.message.toLowerCase().indexOf(query)
            if (matchIndex === -1) {
                matchIndex = index
                matchType = 3000
            }
            return index >= 0
        })

        // did not match name, key or any of the messages => filter out
        if (matchIndex === -1) return

        item.matchIndex = `${matchType}${matchIndex}`
        item.message = queriedMsg || lastMsg
        return item
    }).filter(Boolean)

    // sort by timestamp if query is empty, otherwise sort by match index
    return arrSort(result, query ? 'matchIndex' : 'ts', true)
}

export default function InboxList() {
    const [query, setQuery] = useState('')
    // whether to include archived and deleted items
    const [showAll, setShowAllOrg] = useState(false)
    const [items, setItems] = useState(filterInboxes(query, showAll))
    const [showActions, setShowActions] = useState(null)
    const setShowAll = showAll => {
        rxExpanded.next(false)
        // update list 
        setItems(filterInboxes(query, showAll))
        setShowAllOrg(showAll)
    }

    useEffect(() => {
        let mounted = true
        const subscriptions = {}
        subscriptions.inboxList = rxInboxListChanged.subscribe(() => mounted && setItems(filterInboxes(query, showAll)))
        return () => {
            mounted = false
            unsubscribe(subscriptions)
        }
    }, [query, showAll])
    return (
        <div {...{
            className: 'inbox-list',
            style: {
                // full height if no inbox is selected
                height: rxOpenInboxKey.value ? undefined : '100%'
            },
        }}>
            <ToolsBar {...{
                query,
                onSeachChange: (_, { value }) => {
                    rxExpanded.value && rxExpanded.next(false)
                    setQuery(value)
                    setItems(filterInboxes(value, showAll))
                },
                showAll,
                toggleShowAll: () => setShowAll(!showAll),
            }} />
            <div className='list'>
                {items.map(item => (
                    <InboxListItem {...{
                        ...item,
                        active: rxOpenInboxKey.value === item.inboxKey,
                        key: JSON.stringify(item),
                        query,
                        setShowActions,
                        showActions,
                    }} />
                ))}

                {query && <Message className='empty-message' content={textsCap.noResultMsg} />}
            </div>
        </div >
    )
}

const getStatusColor = (online = {}, userIds = []) => {
    if (!online || !userIds.length) return OFFLINE
    const numOnline = userIds.filter(id => online[id]).length
    return !numOnline ? OFFLINE : (
        numOnline === userIds.length ? ALL_ONLINE : SOME_ONLINE
    )
}
const InboxListItem = React.memo(({
    active,
    archived,
    deleted,
    inboxKey,
    isEmpty,
    label,
    message, // last or queried message
    name,
    query = '',
    unreadCount,
    userId,
    setShowActions,
    showActions,
}) => {
    query = query.trim().toLowerCase()
    const [userIds] = useState(inboxKey.split(',').filter(id => ![userId, TROLLBOX].includes(id)))
    const [status] = useRxSubject(
        userIds.length === 0 ? [OFFLINE] : rxUsersOnline,
        online => getStatusColor(online, userIds),
    )
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
    const qIndex = !msgText ? -1 : msgText.toLowerCase().indexOf(query)

    return (
        <div {...{
            className: 'list-item' + (active ? ' active' : ''),
            onClick: () => {
                const isMobile = getLayout() === MOBILE
                const isOpen = rxOpenInboxKey.value === inboxKey

                // inbox already open => toggle expanded
                if (isMobile && isOpen) return rxExpanded.next(!rxExpanded.value)
                const key = rxOpenInboxKey.value === inboxKey ? null : inboxKey
                key && createInbox(key.split(','))
                rxOpenInboxKey.next(key)
                isMobile && rxExpanded.next(true)
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
                        <b>{senderId === userId ? textsCap.you : senderId}</b>
                        : {!query || qIndex === -1 ? msgText : (
                            <span>
                                {msgText.slice(0, qIndex)}
                                <b {...{
                                    onClick: e => e.stopPropagation() | jumpToMessage(inboxKey, msgId),
                                    //e.preventDefault()
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
                archived,
                deleted,
                inboxKey,
                isEmpty,
                isGroup,
                isSupport,
                isTrollbox,
                setShowActions,
                showActions,
            }} />
        </div>
    )
})

const ToolsBar = React.memo(({ query, onSeachChange, showAll, toggleShowAll }) => (
    <div className='tools'>
        <div className='actions'>
            <Button.Group {...{
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
                        onClick: () => showForm(NewInboxForm),
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
                type: 'search', // enables escape to clear
                value: query,
            }} />
        </div>
    </div>
))

const InboxActions = React.memo(props => {
    const {
        archived,
        deleted,
        inboxKey,
        isEmpty,
        isGroup,
        isSupport,
        isTrollbox,
        setShowActions,
        showActions,
    } = props
    const actions = [
        isGroup && !isTrollbox && !isSupport && {
            icon: 'pencil',
            onClick: e => e.stopPropagation() | showEditNameForm(inboxKey, () => setShowActions(false)),
            title: textsCap.changeGroupName,
        },
        !deleted && !archived && {
            icon: 'hide',
            onClick: e => e.stopPropagation() | confirm({
                content: textsCap.archiveConversation,
                onConfirm: () => {
                    inboxSettings(inboxKey, { hide: true })
                    rxOpenInboxKey.next(null)
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
                    onConfirm: () => removeInbox(inboxKey) | rxOpenInboxKey.next(null),
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
                    key: action.icon,
                    size: 'tiny'
                }} />
            ))}
        </span>
    )
})
