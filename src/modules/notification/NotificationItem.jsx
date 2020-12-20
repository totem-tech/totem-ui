import React from 'react'
import { isFn } from '../../utils/utils'
// components
import { UserID } from '../../components/buttons'
import TimeSince from '../../components/TimeSince'
import { Message } from '../../components/Message'
// services
import { itemViewHandlers, remove, toggleRead } from './notification'

export default React.memo(({ id, notification }) => {
    const { from, type, childType, message, data, tsCreated, read, status } = notification || {}
    const key = `${type}:${childType || ''}`
    const handler = itemViewHandlers[key]
    const senderId = from || notification.senderId // (previously used)
    const senderIdBtn = <UserID userId={senderId} />
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
    return (
        <Message  {...{
            ...msg,
            icon: status === 'loading' ? true : msg.icon || { name: 'bell outline' },
            className: 'list-item',
            onClick: () => toggleRead(id),
            onDismiss: e => e.stopPropagation() | remove(id),
            status: status === 'loading' ? 'loading' : read ? 'basic' : 'info',
            style: {
                ...msg.style,
                cursor: 'pointer',
                textAlign: 'left',
            }
        }} />
    )
})