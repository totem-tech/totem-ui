import React from 'react'
import { useRxSubject } from '../../utils/reactjs'
import { rxOpenInboxKey, rxVisible } from './chat'
import Inbox from './Inbox'
import InboxList from './InboxList'
import './style.css'

export default function ChatBar() {
    const [visible] = useRxSubject(rxVisible)
    const [inboxKey] = useRxSubject(rxOpenInboxKey)

    return (
        <div className='chat-container'>
            {visible && (
                <div className='chat-contents'>
                    <InboxList {...{ inboxKey }} />
                    {inboxKey && <Inbox {...{
                        inboxKey,
                        key: inboxKey,
                    }} />}
                </div>
            )}
        </div>
    )
}