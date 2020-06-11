import React, { useState, useEffect } from 'react'
import { Button } from 'semantic-ui-react'
import { arrSort, textEllipsis } from '../../utils/utils'
import FormInput from '../../components/FormInput'
import Message from '../../components/Message'
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
} from './chat'
import NewInboxForm, { editName } from './NewInboxForm'

const EVERYONE = 'everyone'
const [texts, textsCap] = translated({
    archived: 'archived',
    compact: 'compact',
    deleted: 'deleted',
    detailed: 'detailed',
    jumpToMsg: 'jump to message',
    noResultMsg: 'Your search yielded no results',
    searchPlaceholder: 'search conversations',
    showActive: 'active conversations',
    showAll: 'all conversations',
    startChat: 'start chat',
    trollbox: 'Totem Trollbox',

    // tools
    archiveConversation: 'archive conversation',
    changeGroupName: 'change group name',
    toolsHide: 'hide tools',
    toolsShow: 'show tools',
    expand: 'expand',
    shrink: 'shrink',
    remove: 'remove',
    removeMessages: 'remove messages',
    removeConversation: 'remove conversation',
}, true)

export default function InboxList(props) {
    const { inverted } = props
    const allSettings = inboxesSettings()
    const getAllInboxKeys = () => Object.keys(inboxesSettings())
    const [showAll, setShowAll] = useState(false)
    const [inboxKeys, setInboxKeys] = useState(getAllInboxKeys())
    let [filteredKeys, setFilteredKeys] = useState(inboxKeys)
    const [filteredMsgIds, setFilteredMsgIds] = useState({})
    // const [key, setKey] = useState(uuid.v1())
    const [compact, setCompact] = useState(false)
    const [query, setQuery] = useState('')
    const names = {}
    const msgs = {}
    inboxKeys.forEach(key => {
        names[key] = key === EVERYONE ? textsCap.trollbox : allSettings[key].name
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
            ts: ((msgs[key] || [])[0] || {}).timestamp || 'z', // 'z' => empty inboxes at top
        }))
        filteredKeys = arrSort(filteredKeys, 'ts', true).map(x => x.key)
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
        return () => {
            isMounted = false
            newInboxBond.untie(tieId)
        }
    }, [])

    return (
        <div {...{
            className: 'inbox-list' + (compact ? ' compact' : ''),
            // key,
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
                        // makes sure to update item when new message is received
                        key: JSON.stringify({ key, ...(msgs[key] || [])[0] }),
                        name: names[key] || key,
                        filteredMsgId: filteredMsgIds[key],
                        inboxMsgs: msgs[key],
                        inverted,
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

const InboxListItem = ({ compact, filteredMsgId, inboxMsgs = [], inboxKey, inverted, query, settings, name }) => {
    const iconSize = compact ? 14 : 18
    const iconWidth = compact ? 16 : 20
    const isTrollbox = inboxKey === EVERYONE
    const isGroup = inboxKey.split(',').length > 1
    const icon = isTrollbox ? 'globe' : (isGroup ? 'group' : 'chat')
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
                    {!qMsg && lastMsg && `${lastMsg.senderId}: ${lastMsg.message}`}
                    { /* highlight searched keywords */
                        qMsg && qIndex >= 0 && (
                            <span>
                                {qMsg.senderId}: {qMsg.message.slice(0, qIndex)}
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
            ),
            header: (
                <div className='header'>
                    {textEllipsis(name, 30, 3, false)}
                    <i>
                        {flag && ` ( ${flag} )`}
                        {unread > 0 && ` ( ${unread} )`}
                    </i>
                </div>
            ),
            icon: {
                name: icon,
                style: {
                    fontSize: iconSize,
                    width: iconWidth,
                }
            },
            color: inverted ? 'black' : undefined,
            onClick: handleClick,
            status: isActive ? 'success' : unread ? 'info' : '',
        }} />
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
                title: showActions ? textsCap.toolsHide : textsCap.toolsShow,
            }} />
        </span>
    )
}
