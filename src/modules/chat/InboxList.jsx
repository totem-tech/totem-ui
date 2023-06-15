import React, { useState, useCallback, useMemo } from 'react'
import { Button, Label } from 'semantic-ui-react'
import { contentPlaceholder } from '../../components/ContentSegment'
import FormInput from '../../components/FormInput'
import Message from '../../components/Message'
import { confirm, showForm } from '../../services/modal'
import { MOBILE, getLayout } from '../../services/window'
import { getUser } from '../../utils/chatClient'
import { translated } from '../../utils/languageHelper'
import { useMount, useRxState, useRxSubject, useRxStateDeferred } from '../../utils/reactjs'
import {
    arrSort,
    className,
    isObj,
    strFill,
    textEllipsis,
} from '../../utils/utils'
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

const ALL_ONLINE = 'green'
const SOME_ONLINE = 'yellow'
const OFFLINE = 'grey'
const textsCap = {
    actionsHide: 'hide actions',
    actionsShow: 'show actions',
    archiveConversation: 'archive conversation',
    archived: 'archived - reopen?',
    archivedShow: 'show archived',
    archivedHide: 'hide archived',
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
    support: 'Totem Support',
    trash: 'trash',
    trollbox: 'Totem Global Conversation',
    you: 'you',
}
translated(textsCap, true)

const InboxList = React.memo(({ inboxKey }) => {
    const [loaded, setLoaded] = useState(false)
    useMount(() => setTimeout(() => setLoaded(true), 300))
    const [state, setState] = useRxState({}, s => ({
        // merge with previous state
        ...isObj(s) && s,
        ...filterInboxes(
            s?.query,
            s?.showAll,
        ),
    }))
    // every time rxInboxList changes trigger an update of inbox list items
    useRxSubject(rxInboxListChanged, changed => !!changed && setState({}))
    const [showActions, setShowActions] = useState(null)
    const {
        items = [],
        query = '',
        showAll = false,
        showAllDisabled = false,
    } = state

    const queryTrimmed = query
        .trim()
        .toLowerCase()

    return !loaded
        ? (
            <React.Fragment>
                {contentPlaceholder}
                {contentPlaceholder}
                {contentPlaceholder}
                {contentPlaceholder}
                {contentPlaceholder}
                {contentPlaceholder}
                {contentPlaceholder}
                {contentPlaceholder}
            </React.Fragment>
        )
        : (
            <div {...{
                className: 'inbox-list',
                style: {
                    // full height if no inbox is selected
                    height: inboxKey
                        ? undefined
                        : '100%'
                },
            }}>
                <ToolsBar {...{
                    query,
                    onSeachChange: (_, { value }) => {
                        rxExpanded.value && rxExpanded.next(false)
                        setState({ query: value })
                    },
                    showAll,
                    showAllDisabled,
                    toggleShowAll: () => {
                        rxExpanded.next(false)
                        setState({ showAll: !showAll })
                    },
                }} />
                <div className='list'>
                    {items.map(item => (
                        <InboxListItem {...{
                            ...item,
                            active: inboxKey === item.inboxKey,
                            key: JSON.stringify(item),
                            openInboxKey: inboxKey,
                            query: queryTrimmed,
                            setShowActions,
                            showActions,
                        }} />
                    ))}

                    {queryTrimmed && (
                        <Message {...{
                            className: 'empty-message',
                            content: textsCap.noResultMsg,
                        }} />
                    )}
                </div>
            </div >
        )
})
export default InboxList

export const getInboxName = (inboxKey, settings, userId) => {
    if (!inboxKey) return null

    settings ??= inboxSettings(inboxKey)
    const receiverIds = inboxKey.split(',')
    let name = receiverIds.includes(TROLLBOX)
        ? textsCap.trollbox
        : settings.name
    if (receiverIds.includes(SUPPORT)) {
        const otherUsers = receiverIds.filter(id =>
            ![SUPPORT, userId].includes(id)
        )
        // for support member display name as follows: "Totem Support: UserID", otherwise only "Totem Support"
        if (receiverIds.length <= 2 || otherUsers.length === 0) return textsCap.support

        return `${textsCap.support}: ${otherUsers[0]}`
    }
    return name
}

const filterInboxes = (query = '', showAll = false) => {
    query = query
        .toLowerCase()
        .trim()
    const allSettings = inboxesSettings() || {}
    let filteredKeys = Object
        .keys(allSettings)
    // check if any hidden or archived inbox available
    const showAllDisabled = !filteredKeys.length
        || !filteredKeys.find(key => {
            const { deleted, hide } = allSettings[key] || {}
            return deleted || hide
        })
    const result = { items: [], showAllDisabled }

    if (!filteredKeys.length) return result

    const allMessages = getMessages()
    const showArchived = !showAllDisabled && showAll
    if (!showArchived) {
        // ignore archived or deleted
        filteredKeys = filteredKeys.filter(key => {
            const { deleted, hide } = allSettings[key] || {}
            return !hide && !deleted
        })
    }

    if (query) filteredKeys = filteredKeys.sort()

    const { id: userId } = getUser() || {}
    const items = filteredKeys.map(inboxKey => {
        const settings = allSettings[inboxKey] || {}
        const {
            createdTS,
            deleted,
            hide,
            lastMessageTS,
            unread = 0,
        } = settings
        const isArchived = hide || deleted
        const typePrefix = !query
            ? isArchived
                ? 1
                : 0
            : showArchived && isArchived
                ? 0
                : 1
        // exclude action messages (eg: group name change)
        const messages = (allMessages.get(inboxKey) || [])
            .filter(m => !!m.message)
            .reverse() // latest first
        const lastMsg = messages[0]
        const name = getInboxName(
            inboxKey,
            settings,
            userId,
        ) || inboxKey
        const label = deleted
            ? textsCap.deleted
            : hide && textsCap.archived
        const item = {
            archived: !!hide,
            deleted: !!deleted,
            inboxKey,
            isEmpty: messages.length === 0,
            label,
            message: lastMsg,
            name: name,
            sort: `${typePrefix}>${lastMessageTS || createdTS}`,
            unreadCount: unread,
            userId,
        }
        // no filtering required
        if (!query) return item

        // highest priority if it matches the inbox name
        let matchType = `${typePrefix}1`
        let matchIndex = name
            .toLowerCase()
            .indexOf(query)
        let matchedStr = name
        let msgFound
        if (matchIndex === -1) {
            // find the latest message matching query
            const {
                index = -1,
                message: msgFound, // message that matched the query
            } = arrSort(
                messages
                    .map(item => {
                        const { message = '' } = item || {}
                        let index = message
                            .toLowerCase()
                            .indexOf(query)
                        return { index, message: item }
                    })
                    .filter(({ index }) => index >= 0),
                'index',
            )[0] || {}
            matchedStr = msgFound?.message
            matchIndex = index
            // medium priority if it matches any message
            matchType = `${typePrefix}2`
        }

        // check group user IDs
        if (matchIndex === -1 && name !== inboxKey) {
            matchedStr = inboxKey
            matchIndex = inboxKey.indexOf(query)
            // lowest priority if it matches the user IDs
            matchType = `${typePrefix}3`
        }

        // did not match name, key or any of the messages => filter out
        if (matchIndex === -1) return

        item.sort = [
            matchType,
            strFill(matchIndex, 6, 0, false),
            matchedStr
        ].join('')
        item.message = msgFound || lastMsg
        return item
    }).filter(Boolean)

    // sort by timestamp if query is empty, otherwise sort by match index
    result.items = arrSort(
        items,
        'sort',
        !query
    )

    return result
}
const getStatusColor = (online = {}, userIds = []) => {
    if (!online || !userIds.length) return OFFLINE

    const numOnline = userIds
        .filter(id => online[id])
        .length
    return !numOnline
        ? OFFLINE
        : numOnline === userIds.length
            ? ALL_ONLINE
            : SOME_ONLINE
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
    openInboxKey,
    query = '',
    unreadCount,
    userId,
    setShowActions,
    showActions,
}) => {
    const [userIds] = useState(
        (inboxKey || '')
            .split(',')
            .filter(id =>
                ![userId, TROLLBOX].includes(id)
            )
    )
    const [status] = useRxSubject(
        userIds.length === 0
            ? [OFFLINE]
            : rxUsersOnline,
        online => getStatusColor(online, userIds),
    )
    const isTrollbox = inboxKey === TROLLBOX
    const receiverIds = inboxKey.split(',')
    const isSupport = receiverIds.includes(SUPPORT)
    const isGroup = receiverIds.length > 1
    const icon = isTrollbox
        ? 'globe'
        : isSupport
            ? 'heartbeat'
            : isGroup // alts: ambulance, heartbeat, user doctor
                ? 'group'
                : 'user'
    const {
        id: msgId,
        message: msgText = '',
        senderId,
    } = message || {}
    const scrollToMsg = useCallback(e => {
        e.stopPropagation()
        jumpToMessage(inboxKey, msgId)
    })

    return (
        <div {...{
            className: className({
                'list-item': true,
                active,
            }),
            onMouseLeave: () => showActions && setShowActions(false),
            onClick: () => {
                const isMobile = getLayout() === MOBILE
                const isOpen = openInboxKey === inboxKey

                // inbox already open => toggle expanded
                if (isMobile && isOpen) return rxExpanded.next(!rxExpanded.value)

                const key = openInboxKey === inboxKey
                    ? null // close inbox
                    : inboxKey
                // just makes sure an inbox storage is properly initiated
                // needed for global chat and support
                key && createInbox(key.split(','))
                rxOpenInboxKey.next(key)
                isMobile && rxExpanded.next(true)
            },
        }}>
            <div className='left'>
                <Label {...{
                    icon: {
                        color: status,
                        name: icon,
                    },
                    content: `${unreadCount || ''}`,
                    title: status === OFFLINE
                        ? textsCap.offline
                        : textsCap.online,
                }} />
            </div>
            <div className='content'>
                {/* Header */}
                <Highlight {...{
                    query,
                    style: { fontWeight: 'bold' },
                    text: textEllipsis(
                        name,
                        30,
                        3,
                        false,
                    ),
                }} />

                {/* Body */}
                <i>
                    {label && (
                        <Label {...{
                            color: archived
                                ? 'grey'
                                : 'red',
                            content: label,
                            key: label,
                            size: 'mini',
                            style: { textTransform: 'lowercase' }
                        }} />
                    )}
                </i>
                {senderId && (
                    <div className='preview'>
                        <Highlight {...{
                            Component: 'b',
                            onClick: scrollToMsg,
                            query,
                            text: senderId === userId
                                ? textsCap.you
                                : senderId,
                        }} />
                        {': '}
                        <Highlight {...{
                            onClick: scrollToMsg,
                            query,
                            text: msgText,
                        }} />
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

const Highlight = ({
    Component = 'span',
    highlightStyle,
    onClick,
    query,
    text,
    ...props
}) => {
    const index = `${text || ''}`
        .toLowerCase()
        .indexOf(query)

    return !query || index === -1
        ? <Component {...props}>{text}</Component>
        : (
            <Component {...props}>
                {/* <span> */}
                {text.slice(0, index)}
                <b {...{
                    onClick,
                    style: {
                        background: 'yellow',
                        color: 'grey',
                        ...highlightStyle,
                    },
                    title: textsCap.jumpToMsg,
                }}>
                    {text.slice(index, index + query.length)}
                </b>
                {text.slice(index + query.length)}
                {/* </span> */}
            </Component>
        )
}

const ToolsBar = React.memo(({
    query,
    onSeachChange,
    showAll,
    showAllDisabled,
    toggleShowAll,
}) => (
    <div className='tools'>
        <div className='actions'>
            <Button.Group {...{
                widths: 2,
                buttons: [
                    {
                        active: showAll,
                        basic: true,
                        compact: true,
                        content: showAllDisabled || !showAll
                            ? textsCap.archivedShow
                            : textsCap.archivedHide,
                        disabled: showAllDisabled,
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
                action: !query
                    ? undefined
                    : {
                        // basic: true,
                        icon: 'close',
                        onClick: () => onSeachChange({}, { value: '' }),
                    },
                icon: query
                    ? undefined
                    : 'search',
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
    let {
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
    const active = inboxKey === showActions
    const actions = [
        isGroup && !isTrollbox && !isSupport && {
            icon: 'pencil',
            onClick: e => {
                e.stopPropagation()
                showEditNameForm(inboxKey, () => setShowActions(false))
            },
            title: textsCap.changeGroupName,
        },
        !deleted && !archived && {
            icon: 'hide',
            onClick: e => e.stopPropagation() | confirm({
                content: textsCap.archiveConversation,
                onConfirm: () => {
                    inboxSettings(inboxKey, { hide: true })
                    rxOpenInboxKey.next()
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
                    onConfirm: () => removeInbox(inboxKey) | rxOpenInboxKey.next(),
                    size: 'mini',
                })
            },
            title: textsCap.removeConversation
        },
    ].filter(Boolean)
    return !!actions.length && (
        <span className='actions'>
            {[
                ...active && actions || [],
                {
                    active,
                    icon: 'cog',
                    onClick: e => {
                        e.stopPropagation()
                        setShowActions(!active && inboxKey)
                    },
                    title: active
                        ? textsCap.actionsHide
                        : textsCap.actionsShow,
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
