import React, { useState, useEffect } from 'react'
import uuid from 'uuid'
import { Button } from 'semantic-ui-react'
import { arrSort, deferred, textEllipsis } from '../../utils/utils'
import Message from '../../components/Message'
import { translated } from '../../services/language'
import { showForm } from '../../services/modal'
import FormInput from '../../components/FormInput'
import { inboxBonds, newInboxBond, inboxSettings, openInboxBond, getMessages, newMsgBond, inboxesSettings, newInbox } from './chat'
import NewInboxForm from './NewInboxForm'

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
    const handleChange = async (_, { value }) => {
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
        // update list every time new message is received/sent
        // const tieIdMsg = newMsgBond.tie(key => setTimeout(() => setKey(key)))
        return () => {
            isMounted = false
            newInboxBond.untie(tieId)
            // newMsgBond.untie(tieIdMsg)
        }
    }, [])

    return (
        <div {...{
            className: 'inbox-list',
            // key,
            style: {
                // full height if no inbox is selected
                height: openInboxBond._value ? undefined : '100%'
            },
        }}>
            <div className='tools'>
                <div className='search'>
                    <FormInput {...{
                        action: !query ? undefined : {
                            basic: true,
                            icon: 'close',
                            onClick: () => handleChange({}, { value: '' }),
                        },
                        icon: query ? undefined : 'search',
                        name: 'keywords',
                        onChange: handleChange,
                        placeholder: textsCap.searchPlaceholder,
                        type: 'text',
                        value: query,
                    }} />
                </div>
                <Button.Group {...{
                    fluid: true,
                    className: 'buttons',
                    widths: 3,
                    buttons: [
                        {
                            active: compact,
                            color: inverted ? 'grey' : 'black',
                            icon: compact ? 'address card' : 'bars',
                            key: 0,
                            onClick: () => setCompact(!compact),
                            title: compact ? textsCap.detailed : textsCap.compact
                        },
                        {
                            active: showAll,
                            color: inverted ? 'grey' : 'black',
                            icon: 'history',
                            key: 1,
                            onClick: () => setShowAll(!showAll),
                            title: !showAll ? textsCap.showAll : textsCap.showActive,
                        },
                        {
                            active: false,
                            color: inverted ? 'grey' : 'black',
                            icon: 'plus',
                            key: 2,
                            onClick: () => showForm(NewInboxForm, {
                                onSubmit: (ok, { inboxKey }) => ok && openInboxBond.changed(inboxKey)
                            }),
                            title: textsCap.startChat,
                        }
                    ],
                }} />
            </div>
            <div>
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

const InboxListItem = ({ compact, filteredMsgId, inboxMsgs = [], inboxKey, inverted, query, settings, name }) => {
    const [showTools, setShowTools] = useState(true)
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
        key && newInbox(key.split(','))
        openInboxBond.changed(key)
    }
    const handleHighlightedClick = e => {
        e.stopPropagation()
        newInbox(inboxKey.split(',')) // makes sure inbox is not deleted or archived
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
            content: (
                <div>
                    {unread > 0 && (
                        <div className={`unread-count ${compact ? 'compact' : ''}`}>
                            ( {unread} )
                        </div>
                    )}
                    {!qMsg && lastMsg && `${lastMsg.senderId}: ${lastMsg.message}`}
                    {qMsg && qIndex >= 0 && (
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
                    {textEllipsis(name, 30, 3, false)} {flag && <b><i>( {flag} )</i></b>}
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

const InboxTools = ({
    inboxKey,
    isGroup,
    isTrollbox,
    messages,
    receiverIds,
    showMembers,
    setShowMembers,
    title,
}) => {
    const [expanded, setExpanded] = useState(false)
    const [online, setOnline] = useState(false)
    const [showTools, setShowTools] = useState(false)
    const isMobile = getLayout() === 'mobile'
    const toolIconSize = isMobile ? undefined : 'mini'
    const { id: userId } = getUser() || {}
    const toggleExpanded = () => {
        document.getElementById('app').classList[expanded ? 'remove' : 'add']('chat-expanded')
        setExpanded(!expanded)
    }

    !isGroup && useEffect(() => {
        let isMounted = true
        const frequency = 60000 // check user status every 60 seconds
        const friend = receiverIds[0]
        const checkOnline = () => {
            if (!isMounted) return
            if (!loginBond._value) return setOnline(false)
            const { timestamp } = arrReverse(messages).find(m => m.senderId === friend) || {}
            const tsDiff = new Date() - new Date(timestamp)
            // received a message from friend within the frequency duration => assume online
            if (tsDiff < frequency) return setOnline(true)
            client.isUserOnline(receiverIds[0], (err, online) => !err && setOnline(!!online))
        }
        const intervalId = setInterval(checkOnline, frequency)
        checkOnline()
        return () => {
            isMounted = false
            intervalId && clearInterval(intervalId)
        }
    }, [])

    return (
        <div className='header-container'>
            {!isGroup && online && (
                <div className='online-indicator'>
                    <Icon {...{
                        color: 'green',
                        name: 'circle',
                        title: textsCap.online,
                    }} />
                </div>
            )}
            <h1 className='header'>
                <span style={{ opacity: showTools ? 0.1 : 1 }}>
                    {inboxKey === EVERYONE ? textsCap.trollbox : (
                        title || inboxSettings(inboxKey).name || textEllipsis(`Chatting with @${inboxKey}`, 16, 3, false)
                    )}
                </span>

                <div className='tools'>
                    {showTools && (
                        <React.Fragment>
                            {isGroup && !isTrollbox && (
                                <Button {...{
                                    active: false,
                                    circular: true,
                                    icon: 'pencil',
                                    inverted: true,
                                    onClick: () => editName(inboxKey, () => setShowTools(false)),
                                    size: toolIconSize,
                                    title: textsCap.changeGroupName,
                                }} />
                            )}

                            {isGroup && (
                                <Button {...{
                                    active: false,
                                    circular: true,
                                    icon: 'group',
                                    inverted: !showMembers,
                                    key: 'showMembers',
                                    onClick: () => setShowMembers(!showMembers),
                                    size: toolIconSize,
                                    title: textsCap.members
                                }} />
                            )}

                            <Button {...{
                                active: false,
                                circular: true,
                                icon: 'hide',
                                inverted: true,
                                key: 'hideConversation',
                                onClick: () => confirm({
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

                            {messages.length > 0 && (
                                <Button {...{
                                    active: false,
                                    circular: true,
                                    icon: 'erase',
                                    inverted: true,
                                    key: 'removeMessages',
                                    onClick: () => confirm({
                                        confirmButton: <Button negative content={textsCap.remove} />,
                                        header: textsCap.removeMessages,
                                        onConfirm: e => removeInboxMessages(inboxKey),
                                        size: 'mini',
                                    }),
                                    size: toolIconSize,
                                    title: textsCap.removeMessages
                                }} />
                            )}

                            {!isTrollbox && (
                                <Button {...{
                                    active: false,
                                    circular: true,
                                    icon: 'trash',
                                    inverted: true,
                                    key: 'removeConversation',
                                    onClick: () => messages.length === 0 ? removeInbox(inboxKey) : confirm({
                                        confirmButton: <Button negative content={textsCap.remove} />,
                                        header: textsCap.removeConversation,
                                        onConfirm: () => removeInbox(inboxKey) | openInboxBond.changed(null),
                                        size: 'mini',
                                    }),
                                    size: toolIconSize,
                                    title: textsCap.removeConversation
                                }} />
                            )}
                            <Button {...{
                                active: false,
                                circular: true,
                                icon: 'arrows alternate vertical',
                                inverted: !expanded,
                                onClick: toggleExpanded,
                                size: toolIconSize,
                                title: expanded ? textsCap.shrink : textsCap.expand,
                            }} />
                        </React.Fragment>
                    )}
                    <Button {...{
                        active: false,
                        circular: true,
                        icon: showTools ? 'close' : 'cog',
                        inverted: !showTools,
                        onClick: () => setShowTools(!showTools),
                        size: toolIconSize,
                        title: showTools ? textsCap.toolsHide : textsCap.toolsShow,
                    }} />
                </div>
            </h1>
            <h4 className='subheader'>
                {textsCap.loggedInAs}: @{userId}
            </h4>
        </div>
    )
}
