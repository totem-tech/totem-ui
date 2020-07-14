import React, { useState, useEffect } from 'react'
import { Bond } from 'oo7'
import { Button, Label, Icon } from 'semantic-ui-react'
import { arrSort, textEllipsis, arrUnique } from '../../utils/utils'
import FormInput from '../../components/FormInput'
import ErrorBoundary from '../../components/CatchReactErrors'
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

export const getInboxName = (inboxKey, settings = inboxSettings(inboxKey)) => {
    const { id: ownId } = getUser() || {}
    const receiverIds = inboxKey.split(',')
    let name = receiverIds.includes(TROLLBOX) ? textsCap.trollbox : settings.name
    if (receiverIds.includes(SUPPORT)) {
        const otherUsers = receiverIds.filter(id => ![SUPPORT, ownId].includes(id))
        const isSupportMember = otherUsers.length > 0
        // for support member display name as follows: "Totem support: UserID", otherwise "Totem Support"
        return textsCap.support + (!isSupportMember ? '' : `: ${otherUsers[0]}`)
    }
    return name
}

export default function InboxList(props) {
    const { inverted } = props
    const { id: ownId } = getUser() || {}
    const names = {}
    const msgs = {}
    // states
    const [allSettings, setAllSettings] = useState(inboxesSettings() || {})
    const [inboxKeys, setInboxKeys] = useState(Object.keys(inboxesSettings()) || [])
    // inbox keys after filtering
    let [filteredKeys, setFilteredKeys] = useState(inboxKeys)
    // IDs of messages containing searched query. Full-text, case-insensitive
    const [filteredMsgIds, setFilteredMsgIds] = useState({})
    const [openKey, setOpenKey] = useState(openInboxBond._value)
    const [query, setQuery] = useState('')
    const [showAll, setShowAll] = useState(false)
    const [status, setStatus] = useState({})

    inboxKeys.forEach(key => {
        names[key] = getInboxName(key, allSettings[key]) || key
        msgs[key] = getMessages(key).reverse() // latest first
    })
    // handle query change
    const handleSearchChange = async (_, { value }) => {
        expandedBond._value && expandedBond.changed(false)
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
            const msg = (msgs[key] || []).find(m => (m.message || '').toLowerCase().includes(q))
            msgsIds[key] = msg && msg.id
            return keyOrNameMatch || msg
        })
        setFilteredKeys(keys)
        setFilteredMsgIds(msgsIds)
    }

    if (!showAll && !query) {
        filteredKeys = filteredKeys.filter(key => {
            const s = allSettings[key] || {}
            return !s.hide && !s.deleted
        })
    }
    if (!query) {
        // sort by last message timestamp
        filteredKeys = filteredKeys.map(key => {
            const settings = allSettings[key] || {}
            return {
                key,
                sort: showAll ? names[key] : settings.lastMessageTS || settings.createdTS,
            }
        })
        filteredKeys = arrSort(filteredKeys, 'sort', !showAll).map(x => x.key)
    }

    useEffect(() => {
        let isMounted = true
        let ignoredFirst = false
        const resetKeys = () => {
            if (!isMounted) return
            const allSettings = inboxesSettings()
            const keys = Object.keys(allSettings) || []
            setInboxKeys(keys)
            setFilteredKeys(keys)
            setAllSettings(allSettings)
        }
        const tieId = inboxListBond.tie(resetKeys)
        const tieIdOpenKey = openInboxBond.tie(key => {
            if (!isMounted) return
            if (!inboxKeys.includes(key)) resetKeys()
            setOpenKey(key)
            ignoredFirst && getLayout() === MOBILE && expandedBond.changed(!!key)
            ignoredFirst = true
        })

        // check online status of active private and group chat user ids
        const checkStatus = () => {
            if (!isMounted) return
            const activeKeys = Object.keys(allSettings).filter(key => {
                const { hide, deleted } = allSettings[key]
                return key !== TROLLBOX && !hide && !deleted
            })
            const inboxUserIds = activeKeys.map(x => x.split(',').filter(id => ![ownId, SUPPORT].includes(id)))
            const userIds = arrUnique(inboxUserIds.flat())
            userIds.length > 0 && client.isUserOnline(userIds, (err, online) => {
                if (!isMounted) return
                const newStatus = {}
                if (!err) activeKeys.forEach((key, i) => {
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
            isMounted = false
            inboxListBond.untie(tieId)
            openInboxBond.untie(tieIdOpenKey)
        }
    }, [])
    return (
        <div {...{
            className: 'inbox-list',
            style: {
                // full height if no inbox is selected
                height: openInboxBond._value ? undefined : '100%'
            },
        }}>
            <ToolsBar {...{
                inverted,
                query,
                onSeachChange: handleSearchChange,
                showAll,
                toggleShowAll: () => setShowAll(!showAll) | expandedBond.changed(false),
            }} />
            <div className='list'>
                {filteredKeys.map(key => (
                    <InboxListItem {...{
                        active: openKey === key,
                        inboxKeys,
                        inboxKey: key,
                        key,
                        name: names[key],
                        filteredMsgId: filteredMsgIds[key],
                        inboxMsgs: msgs[key],
                        inverted,
                        status: status[key],
                        query,
                        settings: allSettings[key],
                    }} />
                ))}

                {query && <Message className='empty-message' content={textsCap.noResultMsg} />}
            </div>
        </div >
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

const InboxListItem = ({
    active,
    filteredMsgId,
    inboxMsgs = [],
    inboxKey,
    inverted,
    status,
    query,
    settings,
    name,
}) => {
    const { hide, deleted, unread } = settings || {}
    const flag = deleted ? texts.deleted : hide && texts.archived
    const isTrollbox = inboxKey === TROLLBOX
    const receiverIds = inboxKey.split(',')
    const isSupport = receiverIds.includes(SUPPORT)
    const isGroup = receiverIds.length > 1
    const icon = isTrollbox ? 'globe' : (
        isSupport ? 'heartbeat' : ( // alts: ambulance, heartbeat, user doctor
            isGroup ? 'group' : 'user'
        )
    )
    const lastMsg = (inboxMsgs || []).filter(m => !!m.message)[0]
    const qMsg = (inboxMsgs || []).find(x => x.id === filteredMsgId) // searched message
    const qIndex = qMsg && qMsg.message.toLowerCase().indexOf(query.toLowerCase())
    const { senderId } = lastMsg || qMsg || {}

    const handleHighlightedClick = e => {
        const isMobile = getLayout() === MOBILE
        e.stopPropagation()
        e.preventDefault()
        createInbox(inboxKey.split(',')) // makes sure inbox is not deleted or archived
        openInboxBond._value !== inboxKey && openInboxBond.changed(inboxKey)
        isMobile && !expandedBond._value && expandedBond.changed(true)
        // scroll to message
        setTimeout(() => {
            const msgEl = document.getElementById(qMsg.id)
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

    return (
        <ErrorBoundary>
            <div {...{
                className: 'list-item' + (active ? ' active' : ''),
                onClick: () => {
                    const isMobile = getLayout() === MOBILE
                    const isOpen = openInboxBond._value === inboxKey
                    const expanded = expandedBond._value

                    if (isMobile && isOpen && !expanded) return expandedBond.changed(true)
                    const key = openInboxBond._value === inboxKey ? null : inboxKey
                    key && createInbox(key.split(','))
                    openInboxBond.changed(key)
                }
            }}>
                <div className='left'>
                    <Label {...{
                        icon: {
                            color: status,
                            name: icon,
                        },
                        content: `${unread || ''}`,
                        title: status === OFFLINE ? textsCap.offline : textsCap.online,
                    }} />
                </div>
                <div className='content'>
                    <b>{textEllipsis(name, 30, 3, false) + ' '}</b>
                    <i>
                        {flag && (
                            <Label {...{
                                color: hide ? 'grey' : 'red',
                                content: flag,
                                key: flag,
                                size: 'mini',
                            }} />
                        )}
                    </i>
                    {!senderId ? '' : (
                        <div className='preview'>
                            <b>{senderId === (getUser() || {}).id ? textsCap.you : `@${senderId}`}</b>: {' '}
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
                <InboxActions {...{
                    inboxKey,
                    inverted,
                    isGroup,
                    isSupport,
                    isTrollbox,
                    numMsgs: inboxMsgs.length,
                    settings,
                }} />
            </div>
        </ErrorBoundary>
    )
}

const InboxActions = ({ inboxKey, isGroup, isSupport, isTrollbox, numMsgs, settings }) => {
    const [showActions, setShowActions] = useState(false)
    const { hide, deleted } = settings || {}
    const actions = [
        isGroup && !isTrollbox && !isSupport && {
            icon: 'pencil',
            onClick: e => e.stopPropagation() | editName(inboxKey, () => setShowActions(false)),
            title: textsCap.changeGroupName,
        },
        !deleted && !hide && {
            icon: 'hide',
            onClick: e => e.stopPropagation() | confirm({
                content: textsCap.archiveConversation,
                onConfirm: () => {
                    inboxSettings(inboxKey, { hide: true }, true)
                    openInboxBond.changed(null)
                },
                size: 'mini'
            }),
            title: textsCap.archiveConversation
        },
        numMsgs > 0 && {
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
                numMsgs === 0 ? removeInbox(inboxKey) : confirm({
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
