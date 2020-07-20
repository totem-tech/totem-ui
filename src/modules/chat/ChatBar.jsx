import React, { useState, useEffect } from 'react'
import Inbox from './Inbox'
import InboxList from './InboxList'
import { openInboxBond, visibleBond } from './chat'
import './style.css'

export default function ChatBar({ inverted = false }) {
    const [visible, setVisible] = useState(visibleBond._value)
    const [inboxKey, setInboxKey] = useState(openInboxBond._value)
    const receiverIds = (inboxKey || '').split(',')
    const container = 'chat-container'
    const className = [
        container,
        inverted ? 'inverted' : '',
    ].filter(Boolean).join(' ')


    useEffect(() => {
        let mounted = true
        const tieIdOpenInbox = openInboxBond.tie(key => mounted && setInboxKey(key))
        const tieId = visibleBond.tie(show => {
            if (!mounted) return
            document.querySelector('.' + container)
                .classList[show ? 'remove' : 'add']('hiding')

            setTimeout(() => {
                setVisible(show)
                document.getElementById('app')
                    .classList[show ? 'add' : 'remove']('chat-visible')
            }, 350)
        })

        return () => {
            mounted = false
            visibleBond.untie(tieId)
            openInboxBond.untie(tieIdOpenInbox)
        }
    }, [])

    return (
        <div className={className}>
            {!visible ? '' : (
                <div className='chat-contents'>
                    <InboxList {...{ inverted, inboxKey }} />
                    {receiverIds.length > 0 && (
                        <Inbox {...{
                            inboxKey,
                            key: inboxKey,
                            receiverIds,
                        }} />
                    )}
                </div>
            )}
        </div>
    )
}