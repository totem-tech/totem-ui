import React, { useState, useEffect } from 'react'
import uuid from 'uuid'
import { Button } from 'semantic-ui-react'
import { arrSort, deferred } from '../../utils/utils'
import Message from '../../components/Message'
import { translated } from '../../services/language'
import { showForm } from '../../services/modal'
import FormInput from '../../components/FormInput'
import { inboxBonds, newInboxBond, inboxSettings, openInboxBond, getMessages, newMsgBond, inboxesSettings, newInbox } from './chat'
import NewInboxForm from './NewInboxForm'

const EVERYONE = 'everyone'
const [texts, textsCap] = translated({
    allConvos: 'all conversations',
    archived: 'archived',
    compact: 'compact',
    deleted: 'deleted',
    detailed: 'detailed',
    jumpToMsg: 'jump to message',
    noResultMsg: 'Your search yielded no results',
    searchPlaceholder: 'search conversations',
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
    const [key, setKey] = useState(uuid.v1())
    const [compact, setCompact] = useState(false)
    const [query, setQuery] = useState('')
    const iconSize = compact ? 18 : 28
    const names = []
    const msgs = []
    inboxKeys.forEach((key, i) => {
        names[i] = key === EVERYONE ? textsCap.trollbox : allSettings[key].name
        msgs[i] = getMessages(key).reverse() // latest first
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
            const index = inboxKeys.indexOf(key)
            const keyOrNameMatch = key.includes(q) || (names[inboxKeys.indexOf(key)] || '')
                .toLowerCase().includes(q)
            const msg = (msgs[index] || []).find(m => (m.message || '').includes(q))
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
            ts: ((msgs[inboxKeys.indexOf(key)] || [])[0] || {}).timestamp || 'z', // 'z' => empty inboxes at top
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
        const tieIdMsg = newMsgBond.tie(key => setTimeout(() => setKey(key)))
        return () => {
            isMounted = false
            newInboxBond.untie(tieId)
            newMsgBond.untie(tieIdMsg)
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
                <Button.Group {...{
                    fluid: true,
                    className: 'buttons',
                    widths: 3,
                    buttons: [
                        {
                            icon: compact ? 'address card' : 'bars',
                            key: 0,
                            onClick: () => setCompact(!compact),
                            title: compact ? textsCap.detailed : textsCap.compact
                        },
                        {
                            color: showAll ? 'grey' : undefined,
                            icon: 'history',
                            key: 1,
                            onClick: () => {
                                setShowAll(!showAll)
                            },
                            title: textsCap.allConvos,
                        },
                        {
                            icon: 'plus',
                            key: 2,
                            onClick: () => showForm(NewInboxForm, {
                                onSubmit: (ok, { inboxKey }) => ok && openInboxBond.changed(inboxKey)
                            }),
                            title: textsCap.startChat,
                        }
                    ],
                }} />
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
            </div>
            <div>
                {filteredKeys.map(key => {
                    const index = inboxKeys.indexOf(key)
                    const isTrollbox = key === EVERYONE
                    const isGroup = key.split(',').length > 1
                    const icon = isTrollbox ? 'globe' : (isGroup ? 'group' : 'chat')
                    const name = names[index] || key
                    const isActive = openInboxBond._value === key
                    const inboxMsgs = msgs[index] || []
                    const lastMsg = !compact && (inboxMsgs || []).filter(m => !!m.message)[0]
                    const qMsg = (inboxMsgs || []).find(x => x.id === filteredMsgIds[key]) // searched message
                    const qIndex = qMsg && qMsg.message.toLowerCase().indexOf(query.toLowerCase())
                    const { hide, deleted, unread } = allSettings[key] || {}
                    const flag = deleted ? texts.deleted : hide && texts.archived
                    const handleClick = () => {
                        const inboxKey = openInboxBond._value === key ? null : key
                        inboxKey && newInbox(key.split(','))
                        openInboxBond.changed(inboxKey)
                    }
                    const handleHighlightedClick = e => {
                        e.stopPropagation()
                        newInbox(key.split(',')) // makes sure inbox is not deleted or archived
                        openInboxBond.changed(key)
                        // scroll to message
                        setTimeout(() => {
                            const msgEl = document.getElementById(qMsg.id)
                            if (!msgEl) return
                            msgEl.classList.add('blink')
                            document.querySelector('.chat-container .messages')
                                .scrollTo(0, msgEl.offsetTop)
                            setTimeout(() => msgEl.classList.remove('blink'), 5000)
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
                                <span>
                                    {name} {flag && <b><i>( {flag} )</i></b>}
                                </span>
                            ),
                            icon: {
                                name: icon,
                                style: {
                                    fontSize: iconSize,
                                    width: iconSize,
                                }
                            },
                            color: inverted ? 'black' : undefined,
                            key: JSON.stringify({ key, ...inboxMsgs[0] }),
                            onClick: handleClick,
                            status: isActive ? 'success' : unread ? 'info' : '',
                        }} />
                    )
                })}

                <Message className='empty-message' content={textsCap.noResultMsg} />
            </div>
        </div >
    )
}