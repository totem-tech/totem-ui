import React, { useState, useEffect } from 'react'
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
        let mounted = true
        const tieId = visibleBond.tie(show => {
            if (!mounted) return
            setHiding(!show) // animate
            setTimeout(() => {
                setVisible(show)
                document
                    .getElementById('app')
                    .classList[show ? 'add' : 'remove']('chat-visible')
            }, 200)
        })

        return () => {
            mounted = false
            visibleBond.untie(tieId)
        }
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
        let mounted = true
        const tieIdOpenInbox = openInboxBond.tie(key => mounted && setReceiverIds((key || '').split(',')))
        return () => {
            mounted = false
            openInboxBond.untie(tieIdOpenInbox)
        }
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
