import React, { useState, useEffect } from 'react'
import { Bond } from 'oo7'
import Inbox from './Inbox'
import InboxList from './InboxList'
import { getInboxKey, openInboxBond, getMessages } from './chat'
// import './style.css'

const EVERYONE = 'everyone'
export const visibleBond = new Bond().defaultTo(true)

export default function ChatBar({ isMobile, inverted = false }) {
    const [visible, setVisible] = useState(visibleBond._value)
    const [hiding, setHiding] = useState(false)
    const width = isMobile ? window.innerWidth : 400


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
        <div className='chat-container' style={{
            position: 'fixed',
            right: !visible || hiding ? -width : 0,
            top: 61,
            bottom: isMobile ? 54 : 0,
            background: inverted ? '#1b1c1d' : 'white',
            boxShadow: '3px 8px 8px 8px grey',
            color: inverted ? 'white' : 'black',
            transition: 'all 0.2s linear',
            width: width,
            zIndex: 1,
        }}>
            <ChatContents {...{ inverted, isMobile, visible }} />
        </div>
    )
}

const ChatContents = ({ inverted, isMobile, visible }) => {
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
                style: {
                    height: isMobile ? '30%' : '40%',
                    overflowX: 'auto',
                },
            }} />
            {receiverIds.length > 0 && (
                <Inbox {...{
                    key: inboxKey,
                    receiverIds,
                    inboxKey,
                    style: { height: isMobile ? '70%' : '60%' }
                }} />
            )}
        </div>
    )
}
