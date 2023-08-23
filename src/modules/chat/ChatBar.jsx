import React from 'react'
import CatchReactErrors from '../../components/CatchReactErrors'
import { rxIsRegistered } from '../../utils/chatClient'
import { RxSubjectView } from '../../utils/reactjs'
import { rxVisible } from './chat'
import Inbox from './Inbox'
import InboxList from './InboxList'
import './style.css'

const ChatBar = () => (
    <CatchReactErrors className='chat-container'>
        <RxSubjectView {...{
            subject: [rxIsRegistered, rxVisible],
            valueModifier: ([registered, visible]) => !!registered && (
                <div className='chat-container'>
                    {visible && (
                        <div className='chat-contents'>
                            <InboxList />
                            <Inbox />
                        </div>
                    )}
                </div>
            ),
        }} />
    </CatchReactErrors>
)
export default ChatBar