import React, { useCallback } from 'react'
import { rxIsRegistered } from '../../utils/chatClient'
import { RxSubjectView } from '../../utils/reactjs'
import { rxOpenInboxKey, rxVisible } from './chat'
import Inbox from './Inbox'
import InboxList from './InboxList'
import './style.css'

const ChatBar = () => {
    const valueModifier = useCallback(([
        registered,
        inboxKey,
        visible,
    ]) => !!registered && (
        <div className='chat-container'>
            {visible && (
                <div className='chat-contents'>
                    <InboxList {...{ inboxKey }} />
                    {inboxKey && <Inbox {...{ inboxKey, key: inboxKey }} />}
                </div>
            )}
        </div>
    ))
    return (
        <RxSubjectView {...{
            subject: [
                rxIsRegistered,
                rxOpenInboxKey,
                rxVisible,
            ],
            valueModifier,
        }} />
    )
}

export default ChatBar