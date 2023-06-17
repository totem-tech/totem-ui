import React from 'react'
import { UserID } from '../../components/buttons'
import TimeSince from '../../components/TimeSince'
import { Message } from '../../utils/reactjs'
import { isFn } from '../../utils/utils'
import {
    itemViewHandlers,
    remove,
    toggleRead,
} from './notification'

export default function NotificationItem({ id, notification }) {
    const {
        from,
        type,
        childType,
        message,
        tsCreated,
        read,
        status,
    } = notification || {}
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
            ? handler(
                id,
                notification,
                {
                    senderId,
                    senderIdBtn,
                }
            )
            : {
                content: <span>{senderIdBtn} {message}</span>,
                header: !message && (
                    <div className='header'>
                        {/* Remove underscores and dashes from type & childTypes for display purposes */}
                        {`${type || ''}`.replace(/-|_/g, ' ')}
                        {` ${childType || ''}`.replace(/-|_/g, ' ')}
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
    const isLoading = status === 'loading'
    return (
        <Message {...{
            ...msg,
            icon: isLoading
                ? true
                : msg.icon || { name: 'bell outline' },
            className: 'list-item',
            onClick: () => !isLoading && toggleRead(id),
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