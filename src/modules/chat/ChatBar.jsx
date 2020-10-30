import React from 'react'
import Inbox from './Inbox'
import InboxList from './InboxList'
import { rxOpenInboxKey, rxVisible } from './chat'
import './style.css'
import { useRxSubject } from '../../services/react'

export default function ChatBar() {
    const [visible] = useRxSubject(rxVisible)
    const [inboxKey] = useRxSubject(rxOpenInboxKey)
    const receiverIds = (inboxKey || '').split(',')

    return (
        <div className='chat-container'>
            {!visible ? '' : (
                <div className='chat-contents'>
                    <InboxList inboxKey={inboxKey} />
                    {receiverIds.length > 0 && <Inbox {...{ inboxKey, key: inboxKey, receiverIds }} />}
                </div>
            )}
        </div>
    )
}