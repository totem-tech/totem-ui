import React, { useState, useEffect } from 'react'
import Inbox from './Inbox'
import InboxList from './InboxList'
import { openInboxBond, visibleBond } from './chat'
import './style.css'

export default function ChatBar({ inverted = false }) {
    const [visible, setVisible] = useState(visibleBond._value)
    const [hiding, setHiding] = useState(false)
    const [inboxKey, setInboxKey] = useState(openInboxBond._value)
    const receiverIds = (inboxKey || '').split(',')
    const className = [
        'chat-container',
        inverted ? 'inverted' : '',
        hiding ? 'hiding' : '',
    ].filter(Boolean).join(' ')


    useEffect(() => {
        let mounted = true
        const tieIdOpenInbox = openInboxBond.tie(key => mounted && setInboxKey(key))
        const tieId = visibleBond.tie(show => {
            if (!mounted) return
            setHiding(!show) // animate
            setTimeout(() => {
                setVisible(show)
                document.getElementById('app').classList[show ? 'add' : 'remove']('chat-visible')
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
                            hiding,
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