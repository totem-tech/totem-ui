import React from 'react'
import { isFn } from '../../utils/utils'
// components
import { UserID } from '../../components/buttons'
import { Message } from '../../components/Message'
import TimeSince from '../../components/TimeSince'
// services
import { itemViewHandlers, remove, toggleRead } from './notification'

export default function NotificationItem({ id, notification }) {
    const { from, type, childType, message, data, tsCreated, read, status } = notification || {}
    const key = `${type}:${childType || ''}`
    const handler = itemViewHandlers[key]
    const senderId = from || notification.senderId // (previously used)
    const senderIdBtn = (
        <UserID {...{
            style: { color: 'deeppink' },
            userId: senderId,
        }} />
    )
    const isCustom = isFn(handler)
    let msg = {
        ...(isCustom
            ? handler(id, notification, { senderId, senderIdBtn })
            : {
                content: <span>{senderIdBtn} {message}</span>,
                header: !message && (
                    <div className='header'>
                        {`${type || ''}`.replace(/-|_/g, ' ')} {`${childType || ''}`.replace(/-|_/g, ' ')}
                    </div>
                ),
            }
        )
    }
    msg.icon = msg.icon || { name: 'bell outline' }
    msg.content = (
        <div className='details'>
            {msg.content}
            <TimeSince className='time-since' date={tsCreated} />
        </div>
    )
    const msgStatus = msg.status || status
    
    return (
        <Message {...{
            ...msg,
            icon: status === 'loading'
                ? true
                : msg.icon || { name: 'bell outline' },
            className: 'list-item',
            onClick: () => toggleRead(id),
            onDismiss: e => e.stopPropagation() | remove(id),
            status: read
                ? 'basic'
                : ['loading', 'error'].includes(msgStatus)
                    ? msgStatus
                    : 'info',
            style: {
                ...msg.style,
                cursor: 'pointer',
                textAlign: 'left',
            },
        }} />
    )
}