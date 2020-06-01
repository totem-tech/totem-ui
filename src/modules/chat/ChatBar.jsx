import React, { useState, useEffect } from 'react'
import { Bond } from 'oo7'
import Inbox from './Inbox'
import InboxList from './InboxList'
import { getInboxKey, openInboxBond, visibleBond } from './chat'
import './style.css'

export default function ChatBar({ inverted = false }) {
    const [visible, setVisible] = useState(visibleBond._value)
    const [hiding, setHiding] = useState(false)
    const className = [
        'chat-container',
        inverted ? 'inverted' : '',
        hiding ? 'hiding' : '',
    ].filter(Boolean).join(' ')


    useEffect(() => {
        const tieId = visibleBond.tie(show => {
            setHiding(!show) // animate
            setTimeout(() => {
                setVisible(show)
                document
                    .getElementById('app')
                    .classList[show ? 'add' : 'remove']('chat-visible')
            }, 200)
        })

        return () => visibleBond.untie(tieId)
    }, [])

    return (
        <div className={className}>
            <ChatContents {...{ inverted, visible }} />
        </div>
    )
}

const ChatContents = ({ inverted, visible }) => {
    const [receiverIds, setReceiverIds] = useState((openInboxBond._value || '').split(','))
    const inboxKey = getInboxKey(receiverIds)

    useEffect(() => {
        const tieIdOpenInbox = openInboxBond.tie(key => setReceiverIds((key || '').split(',')))
        return () => openInboxBond.untie(tieIdOpenInbox)
    }, [])

    return !visible ? '' : (
        <div className='chat-contents'>
            <InboxList {...{
                inboxKey,
                inverted,
            }} />
            {receiverIds.length > 0 && (
                <Inbox {...{
                    key: inboxKey,
                    receiverIds,
                    inboxKey,
                }} />
            )}
        </div>
    )
}
