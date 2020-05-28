import React, { useState, useEffect } from 'react'
import { Bond } from 'oo7'
import Inbox from './Inbox'
import InboxList from './InboxList'
import { getInboxKey, openInboxBond, getMessages } from './chat'

const EVERYONE = 'everyone'
export const visibleBond = new Bond().defaultTo(true)

export default function ChatBar({ isMobile, inverted = false }) {
    const [visible, setVisible] = useState(visibleBond._value)
    const [hiding, setHiding] = useState(false)
    const width = isMobile ? window.innerWidth : 400

    useEffect(() => {
        const tieId = visibleBond.tie(show => {
            setHiding(!show)
            setTimeout(() => setVisible(show), 200)
        })

        return () => visibleBond.untie(tieId)
    }, [])

    return (
        <div className='chat-container' style={{
            position: 'fixed',
            right: !visible || hiding ? -width : 0,
            top: 61,
            bottom: isMobile ? 54 : 0,
            background: inverted ? '#1b1c1d' : 'white',
            border: '1px solid #1b1c1d',
            color: inverted ? 'white' : 'black',
            width: width,
            transition: 'all 0.2s linear',
            zIndex: 1,
        }}>
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
        <div style={{ height: '100%', position: 'relative' }}>
            <InboxList {...{
                inboxKey,
                inverted,
                style: { height: '30%', overflowX: 'auto' },
            }} />
            {receiverIds.length > 0 && (
                <Inbox {...{
                    key: inboxKey,
                    receiverIds,
                    inboxKey,
                    // messages: getMessages(inboxKey),
                    style: { height: '70%' }
                }} />
            )}
        </div>
    )
}
