import React, { useState, useEffect } from 'react'
import { Button, Icon } from 'semantic-ui-react'
import { arrSort } from '../../utils/utils'
import { translated } from '../../services/language'
import { showForm } from '../../services/modal'
import FormInput from '../../components/FormInput'
import Message from '../../components/Message'
import { UserID } from '../../components/buttons'
import { inboxBonds, newInboxBond, inboxSettings, openInboxBond, getMessages } from './chat'
import NewInboxForm from './NewInboxForm'

const EVERYONE = 'everyone'
const [_, textsCap] = translated({
    trollbox: 'Totem Trollbox'
}, true)

export default function InboxList(props) {
    const { inverted, style } = props
    const [inboxKeys, setInboxKeys] = useState(Object.keys(inboxBonds))
    const [compact, setCompact] = useState(false)
    const iconSize = compact ? 28 : 42
    const names = inboxKeys.map(key => key === EVERYONE ? textsCap.trollbox : inboxSettings(key).name)
    const msgs = inboxKeys.map(key => getMessages(key).reverse())
    const [kw, setKeywords] = useState('')
    const keywords = kw.trim().toLowerCase()
    let filteredKeys = (!keywords.trim() ? inboxKeys : inboxKeys
        .filter(k => k.includes(keywords) || (names[inboxKeys.indexOf(k)] || '').toLowerCase().includes(keywords))
    )
    // sort by last message timestamp
    filteredKeys = filteredKeys.map(key => ({ key, ts: (msgs[inboxKeys.indexOf(key)][0] || {}).timestamp }))
    filteredKeys = arrSort(filteredKeys, 'ts', true, false).map(x => x.key)

    !openInboxBond._value && openInboxBond.changed(inboxKeys[0])

    useEffect(() => {
        let isMounted = true
        const tieId = newInboxBond.tie(() => isMounted && setInboxKeys(Object.keys(inboxBonds)))
        return () => {
            isMounted = false
            newInboxBond.untie(tieId)
        }
    }, [])

    return (
        <div className='inbox-list' style={style}>
            <div style={{ marginBottom: -13 }}>
                <Button.Group {...{
                    buttons: [
                        {
                            icon: compact ? 'address card' : 'bars',
                            key: 0,
                            onClick: () => setCompact(!compact),
                            style: { padding: 11.75 },
                        },
                        {
                            icon: 'search plus',
                            key: 1,
                            onClick: () => showForm(NewInboxForm, {
                                onSubmit: (ok, { inboxKey }) => ok && openInboxBond.changed(inboxKey)
                            }),
                            style: { padding: 11.75 },
                        }
                    ],
                    style: { display: 'inline-block' }
                }} />
                <div className='search' >
                    <FormInput {...{
                        icon: 'search',
                        name: 'keywords',
                        onChange: (_, { value }) => setKeywords(value),
                        placeholder: 'Search',
                        style: { width: '100%' },
                        type: 'text',
                        value: kw,
                    }} />
                </div>
            </div>
            {filteredKeys.map(key => {
                const index = inboxKeys.indexOf(key)
                const name = names[index] || key
                const isActive = openInboxBond._value === key
                const lastMsg = (msgs[index] || [])[0]

                return (
                    <Message {...{
                        content: compact || !lastMsg ? undefined : (
                            <UserID {...{
                                onClick: null,
                                suffix: `: ${lastMsg.message}`,
                                userId: lastMsg.senderId,
                            }} />
                        ),
                        header: name,
                        icon: {
                            name: 'chat',
                            style: {
                                fontSize: iconSize,
                                width: iconSize,
                            }
                        },
                        color: inverted ? 'black' : undefined,
                        key: key + lastMsg,
                        onClick: () => openInboxBond.changed(key),
                        positive: isActive,
                        style: {
                            borderRadius: 0,
                            cursor: 'pointer',
                            margin: 0,
                            overflow: 'hidden',
                            padding: '5px 10px',
                            whiteSpace: 'nowrap',
                        },
                    }} />
                )
            })}
        </div >
    )
}