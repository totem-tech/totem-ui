import React, { createRef, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import InboxView from './InboxView'
import FormInput from '../../components/FormInput'
import { getInboxKey, getMessages, newInbox, send } from './service'
import { translated } from '../../services/language'
import { confirm } from '../../services/modal'

const [_, textsCap] = translated({
    inputPlaceholder: 'type something and press enter to send',
    loginRequired: 'login/registration required',
    messageError: 'error'
}, true)

function Chat(props) {
    const { receiverIds } = props
    const [messages, setMessages] = useState(getMessages(receiverIds))
    const [sending, setSending] = useState(false)

    useEffect(() => {
        // on mount
        let mounted = true
        let bond = newInbox(receiverIds)
        let tieId = bond.tie(() => mounted && setMessages(getMessages(receiverIds)))
        // on unmount
        return () => {
            mounted = false
            bond.untie(tieId)
        }
    })
    return (
        <div className='totem-chat'>
            <InboxView {...{ messages, receiverIds }} />
            <MessageInput {...{ receiverIds, sending, setSending }} />
        </div>
    )
}
export default Chat
Chat.propTypes = {}
Chat.defaultProps = {
    receiverIds: ['everyone'],
}

const refs = {}
const MessageInput = props => {
    const { receiverIds, sending, setSending } = props
    const [draft, setDraft] = useState()
    const inboxKey = getInboxKey(receiverIds)

    const handleSend = async (e) => {
        e.preventDefault()
        setSending(true)
        await send(receiverIds, draft)
        setSending(false)
        setDraft('')
        refs[inboxKey] && refs[inboxKey].focus()
    }

    return (
        <form onSubmit={handleSend}>
            <FormInput {...{
                action: {
                    disabled: sending,
                    loading: sending,
                    icon: 'chat',
                    onClick: handleSend
                },
                autoFocus: true,
                disabled: sending,
                elementRef: r => {
                    refs[inboxKey] = r
                },
                fluid: true,
                name: 'message',
                onChange: (_, { value }) => setDraft(value),
                placeholder: textsCap.inputPlaceholder,
                type: 'text',
                useInput: true,
                value: draft,
            }} />
        </form>
    )
}