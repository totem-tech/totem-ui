import React, { useState, useEffect } from 'react'
import { Button, Label } from 'semantic-ui-react'
import { arrSort, textEllipsis, arrUnique } from '../../utils/utils'
import FormInput from '../../components/FormInput'
import ErrorBoundary from '../../components/CatchReactErrors'
import Message from '../../components/Message'
import client, { getUser } from '../../services/chatClient'
import { translated } from '../../services/language'
import { confirm, showForm } from '../../services/modal'
import {
    newInboxBond,
    inboxSettings,
    openInboxBond,
    getMessages,
    inboxesSettings,
    createInbox,
    removeInboxMessages,
    removeInbox,
    inboxBonds,
} from './chat'
import NewInboxForm, { editName } from './NewInboxForm'

const EVERYONE = 'everyone'
const [texts, textsCap] = translated({
    actionsHide: 'hide actions',
    actionsShow: 'show actions',
    archived: 'archived',
    archiveConversation: 'archive conversation',
    changeGroupName: 'change group name',
    compact: 'compact',
    deleted: 'deleted',
    detailed: 'detailed',
    expand: 'expand',
    jumpToMsg: 'jump to message',
    noResultMsg: 'Your search yielded no results',
    offline: 'offline',
    online: 'online',
    remove: 'remove',
    removeMessages: 'remove messages',
    removeConversation: 'remove conversation',
    searchPlaceholder: 'search conversations',
    showActive: 'active conversations',
    showAll: 'all conversations',
    startChat: 'start chat',
    trollbox: 'Totem Trollbox',
}, true)

export default function InboxList(props) {
    const { inverted } = props
    const allSettings = inboxesSettings()
    const getAllInboxKeys = () => Object.keys(inboxesSettings())
    const names = {}
    const msgs = {}
    const [compact, setCompact] = useState(false)
    const [showAll, setShowAll] = useState(false)
    const [inboxKeys, setInboxKeys] = useState(getAllInboxKeys())
    let [filteredKeys, setFilteredKeys] = useState(inboxKeys)
    const [filteredMsgIds, setFilteredMsgIds] = useState({})
    const [status, setStatus] = useState({})
    const [query, setQuery] = useState('')

    inboxKeys.forEach(key => {
        names[key] = (key === EVERYONE ? textsCap.trollbox : allSettings[key].name) || key
        msgs[key] = getMessages(key).reverse() // latest first
    })
    // handle query change
    const handleSearchChange = async (_, { value }) => {
        setQuery(value)
        if (!value) {
            setFilteredKeys(inboxKeys)
            setFilteredMsgIds({})
            return
        }
        const q = value.trim().toLowerCase()
        const msgsIds = {}
        let keys = inboxKeys.filter(key => {
            const keyOrNameMatch = key.includes(q) || (names[key] || '')
                .toLowerCase().includes(q)
            const msg = (msgs[key] || []).find(m => (m.message || '').includes(q))
            msgsIds[key] = msg && msg.id
            return keyOrNameMatch || msg
        })
        setFilteredKeys(keys)
        setFilteredMsgIds(msgsIds)
    }

    if (!showAll && !query) {
        filteredKeys = filteredKeys.filter(key => {
            const s = allSettings[key]
            return !s.hide && !s.deleted
        })
    }
    if (!query) {
        // sort by last message timestamp
        filteredKeys = filteredKeys.map(key => ({
            key,
            sort: showAll ? names[key] : ((msgs[key] || [])[0] || {}).timestamp || 'z', // 'z' => empty inboxes at top
        }))
        filteredKeys = arrSort(filteredKeys, 'sort', !showAll).map(x => x.key)
    }

    useEffect(() => {
        let isMounted = true
        const tieId = newInboxBond.tie(() => {
            if (!isMounted) return
            const keys = getAllInboxKeys()
            setInboxKeys(keys)
            setFilteredKeys(keys)
            setQuery('')
        })

        // check online status of active private and group chat user ids
        const checkStatus = () => {
            if (!isMounted) return
            const { id: userId } = getUser() || {}
            const inboxes = Object.keys(inboxBonds).filter(x => x !== EVERYONE)
            const inboxUserIds = inboxes.map(x => x.split(','))
            const userIds = arrUnique(inboxUserIds.flat()).filter(x => x !== userId)
            userIds.length > 0 && client.isUserOnline(userIds, (err, online) => {
                if (!isMounted) return
                const s = {}
                if (!err) {
                    for (let i = 0; i < inboxes.length; i++) {
                        // mark online if at least one user is online in group chat
                        s[inboxes[i]] = !!inboxUserIds[i].find(id => online[id])
                    }
                }
                setStatus(s)
                setTimeout(() => checkStatus(), 60000)
            })
        }
        checkStatus()
        return () => {
            isMounted = false
            newInboxBond.untie(tieId)
        }
    }, [])
    return (
        <div {...{
            className: 'inbox-list' + (compact ? ' compact' : ''),
            style: {
                // full height if no inbox is selected
                height: openInboxBond._value ? undefined : '100%'
            },
        }}>
            <ToolsBar {...{
                compact,
                setCompact,
                inverted,
                query,
                onSeachChange: handleSearchChange,
                showAll,
                setShowAll,
            }} />
            <div className='list'>
                {filteredKeys.map(key => (
                    <InboxListItem {...{
                        compact,
                        inboxKeys,
                        inboxKey: key,
                        key,
                        // makes sure to update item when new message is received
                        // key: JSON.stringify({ key, online: status[key], ...(msgs[key] || [])[0] }),
                        name: names[key],
                        filteredMsgId: filteredMsgIds[key],
                        inboxMsgs: msgs[key],
                        inverted,
                        online: status[key],
                        query,
                        settings: allSettings[key],
                    }} />
                ))}

                <Message className='empty-message' content={textsCap.noResultMsg} />
            </div>
        </div >
    )
}

const ToolsBar = ({ compact, setCompact, inverted, query, onSeachChange, showAll, setShowAll }) => {
    const [open, setOpen] = useState(openInboxBond._value)
    const buttons = [
        {
            active: compact,
            color: inverted ? 'grey' : 'black',
            icon: compact ? 'address card' : 'bars',
            key: 'compact',
            onClick: () => setCompact(!compact),
            title: compact ? textsCap.detailed : textsCap.compact
        },
        {
            active: compact,
            color: inverted ? 'grey' : 'black',
            disabled: !open,
            icon: 'arrows alternate vertical',
            key: 'expand',
            onClick: () => document.getElementById('app').classList.add('chat-expanded'),
            title: textsCap.expand
        },
        {
            active: showAll,
            color: inverted ? 'grey' : 'black',
            icon: 'history',
            key: 'all',
            onClick: () => setShowAll(!showAll),
            title: !showAll ? textsCap.showAll : textsCap.showActive,
        },
        {
            active: false,
            color: inverted ? 'grey' : 'black',
            icon: 'plus',
            key: 'new',
            onClick: () => showForm(NewInboxForm, {
                onSubmit: (ok, { inboxKey }) => ok && openInboxBond.changed(inboxKey)
            }),
            title: textsCap.startChat,
        }
    ]

    useEffect(() => {
        let mounted = true
        const tieId = openInboxBond.tie(open => mounted && setOpen(open))
        return () => {
            mounted = false
            openInboxBond.untie(tieId)
        }
    }, [])

    return (
        <div className='tools'>
            <div className='search'>
                <FormInput {...{
                    action: !query ? undefined : {
                        basic: true,
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
            <Button.Group {...{
                fluid: true,
                widths: buttons.length,
                buttons,
            }} />
        </div>
    )
}

const InboxListItem = ({ compact, filteredMsgId, inboxMsgs = [], inboxKey, inverted, online, query, settings, name }) => {
    const isTrollbox = inboxKey === EVERYONE
    const isGroup = inboxKey.split(',').length > 1
    const icon = isTrollbox ? 'globe' : (isGroup ? 'group' : 'user')
    const isActive = openInboxBond._value === inboxKey
    const lastMsg = !compact && (inboxMsgs || []).filter(m => !!m.message)[0]
    const qMsg = (inboxMsgs || []).find(x => x.id === filteredMsgId) // searched message
    const qIndex = qMsg && qMsg.message.toLowerCase().indexOf(query.toLowerCase())
    const { hide, deleted, unread } = settings || {}
    const flag = deleted ? texts.deleted : hide && texts.archived
    const handleClick = () => {
        const key = openInboxBond._value === inboxKey ? null : inboxKey
        key && createInbox(key.split(','))
        openInboxBond.changed(key)
    }
    const handleHighlightedClick = e => {
        e.stopPropagation()
        createInbox(inboxKey.split(',')) // makes sure inbox is not deleted or archived
        openInboxBond.changed(inboxKey)
        // scroll to message
        setTimeout(() => {
            const msgEl = document.getElementById(qMsg.id)
            const msgsEl = document.querySelector('.chat-container .messages')
            if (!msgEl || !msgsEl) return
            msgEl.classList.add('blink')
            msgsEl.classList.add('amimate-scroll')
            msgsEl.scrollTo(0, msgEl.offsetTop)
            setTimeout(() => {
                msgEl.classList.remove('blink')
                msgsEl.classList.remove('amimate-scroll')
            }, 5000)
        }, 500)
    }

    return (
        <ErrorBoundary>
            <Message {...{
                className: 'list-item',
                content: (
                    <div>
                        <InboxActions {...{
                            inboxKey,
                            inverted,
                            isGroup,
                            isTrollbox,
                            numMsgs: inboxMsgs.length,
                            settings,
                        }} />

                        <div className='title'>
                            <Label {...{
                                icon: {
                                    className: !unread && 'no-margin' || '',
                                    color: online ? 'green' : undefined,
                                    name: icon,
                                },
                                content: unread > 0 && unread,
                                title: inboxKey === EVERYONE ? '' : online ? textsCap.online : textsCap.offline,
                            }} />
                            <b>{textEllipsis(name, 30, 3, false) + ' '}</b>
                            <i>
                                {flag && (
                                    <Label {...{
                                        color: hide ? 'grey' : 'red',
                                        content: flag,
                                        size: 'mini',
                                    }} />
                                )}
                            </i>
                        </div>
                        {compact || !qMsg && !lastMsg ? '' : (
                            <div className='preview'>
                                <b>@{(lastMsg || qMsg).senderId}</b>: {' '}
                                {!qMsg ? lastMsg.message : (
                                    <span>
                                        {qMsg.message.slice(0, qIndex)}
                                        <b {...{
                                            onClick: handleHighlightedClick,
                                            style: { background: 'yellow' },
                                            title: textsCap.jumpToMsg,
                                        }}>
                                            {qMsg.message.slice(qIndex, qIndex + query.length)}
                                        </b>
                                        {qMsg.message.slice(qIndex + query.length)}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                ),
                color: inverted ? 'black' : undefined,
                onClick: handleClick,
                status: isActive ? 'success' : unread ? 'info' : '',
            }} />
        </ErrorBoundary>
    )
}

const InboxActions = ({ inboxKey, inverted, isGroup, isTrollbox, numMsgs, settings }) => {
    const [showActions, setShowActions] = useState(false)
    const { hide, deleted } = settings || {}
    const toolIconSize = 'mini'
    const actions = [
        isGroup && !isTrollbox && (
            <Button {...{
                active: false,
                circular: true,
                icon: 'pencil',
                inverted,
                key: 'editName',
                onClick: e => e.stopPropagation() | editName(inboxKey, () => setShowActions(false)),
                size: toolIconSize,
                title: textsCap.changeGroupName,
            }} />
        ),
        !deleted && !hide && (
            <Button {...{
                active: false,
                circular: true,
                icon: 'hide',
                inverted,
                key: 'hideConversation',
                onClick: e => e.stopPropagation() | confirm({
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
        ),
        numMsgs > 0 && (
            <Button {...{
                active: false,
                circular: true,
                icon: 'erase',
                inverted,
                key: 'removeMessages',
                onClick: e => e.stopPropagation() | confirm({
                    confirmButton: <Button negative content={textsCap.remove} />,
                    header: textsCap.removeMessages,
                    onConfirm: e => removeInboxMessages(inboxKey),
                    size: 'mini',
                }),
                size: toolIconSize,
                title: textsCap.removeMessages
            }} />
        ),
        !deleted && !isTrollbox && (
            <Button {...{
                active: false,
                circular: true,
                icon: 'trash',
                inverted,
                key: 'removeConversation',
                onClick: e => {
                    e.stopPropagation()
                    numMsgs === 0 ? removeInbox(inboxKey) : confirm({
                        confirmButton: <Button negative content={textsCap.remove} />,
                        header: textsCap.removeConversation,
                        onConfirm: () => removeInbox(inboxKey) | openInboxBond.changed(null),
                        size: 'mini',
                    })
                },
                size: toolIconSize,
                title: textsCap.removeConversation
            }} />
        ),
    ].filter(Boolean)
    return !actions.length ? '' : (
        <span className='actions'>
            {showActions && actions}
            <Button {...{
                active: showActions,
                circular: true,
                icon: showActions ? 'close' : 'cog',
                inverted,
                onClick: e => e.stopPropagation() | setShowActions(!showActions),
                size: toolIconSize,
                title: showActions ? textsCap.actionsHide : textsCap.actionsShow,
            }} />
        </span>
    )
}
