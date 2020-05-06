import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { getMessages, newInbox, send } from './service'
import InboxView from './InboxView'
import FormInput from '../../components/FormInput'

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


const MessageInput = props => {
    const { receiverIds, sending, setSending } = props
    const [draft, setDraft] = useState('')
    const ref = React.createRef()

    const handleSend = async (e) => {
        e.preventDefault()
        setSending(true)
        await send(receiverIds, draft)
        setSending(false)
        setDraft('')
        ref.focus()
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
                fluid: true,
                name: 'message',
                onChange: (_, { value }) => setDraft(value),
                placeholder: 'Enter message here',
                elementRef: ref,
                type: 'text',
                useInput: true,
                value: draft,
            }} />
        </form>
    )
}