import React from 'react'
import CatchReactErrors from '../../components/CatchReactErrors'
import { rxIsRegistered } from '../../utils/chatClient'
import { RxSubjectView } from '../../utils/reactjs'
import { rxOpenInboxKey, rxVisible } from './chat'
import Inbox from './Inbox'
import InboxList from './InboxList'
import './style.css'

const ChatBar = () => (
    <CatchReactErrors className='chat-container'>
        <RxSubjectView {...{
            subject: [
                rxIsRegistered,
                rxOpenInboxKey,
                rxVisible,
            ],
            valueModifier: ([
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
            ),
        }} />
    </CatchReactErrors>
)
export default ChatBar