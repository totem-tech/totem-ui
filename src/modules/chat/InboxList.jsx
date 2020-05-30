import React, { useState, useEffect } from 'react'
import { inboxBonds, newInboxBond, inboxSettings, openInboxBond, getMessages } from './chat'
import FormInput from '../../components/FormInput'
import Message from '../../components/Message'
import { Button, Icon } from 'semantic-ui-react'
import { UserID } from '../../components/buttons'
import { arrSort } from '../../utils/utils'

export default function InboxList(props) {
    const { inverted, style } = props
    const [inboxKeys, setInboxKeys] = useState(Object.keys(inboxBonds))
    const [keywords, setKeywords] = useState('')
    const [compact, setCompact] = useState(false)
    const iconSize = compact ? 28 : 42
    const names = inboxKeys.map(key => inboxSettings(key).name)
    const msgs = inboxKeys.map(key => getMessages(key).reverse())
    let filteredKeys = (!keywords ? inboxKeys : inboxKeys
        .filter(k => k.includes(keywords) || names[inboxKeys.indexOf(key)].includes(keywords))
    )

    // generate object to filter by last message timestamp
    filteredKeys = filteredKeys.map(key => ({
        key,
        ts: (msgs[inboxKeys.indexOf(key)][0] || {}).timestamp
    }))
    filteredKeys = arrSort(filteredKeys, 'ts', true, false).map(x => x.key)

    useEffect(() => {
        const tieId = newInboxBond.tie(() => {
            const keys = Object.keys(inboxBonds)
            if (JSON.stringify(keys) === JSON.stringify(inboxKeys)) return
            setInboxKeys(keys)
        })
        return () => newInboxBond.untie(tieId)
    }, [])

    return (
        <div style={style}>
            <div>
                <div style={{ display: 'inline-block' }}>
                    <Button {...{
                        color: inverted ? 'black' : undefined,
                        icon: compact ? 'address card' : 'address book',
                        onClick: () => setCompact(!compact),
                        style: {
                            border: 'none',
                            borderRadius: 0,
                            margin: 0,
                            padding: 11.75,
                        },
                    }} />
                </div>
                <div style={{ display: 'inline-block', float: 'right', width: 'calc( 100% - 41px )' }} >
                    <FormInput {...{
                        icon: 'search',
                        name: 'keywords',
                        onChange: (_, { value }) => setKeywords(value),
                        placeholder: 'Search',
                        style: { width: '100%' },
                        type: 'text',
                        value: keywords,
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
                        key,
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