import React from 'react'
import { rxNotifications, rxVisible } from './notification'
import ListItem from './NotificationItem'
import './style.css'
import { useRxSubject } from '../../services/react'

export default React.memo(() => {
    const [visible] = useRxSubject(rxVisible, true, visible => {
        const cl = document.getElementById('app').classList
        cl[visible ? 'add' : 'remove']('notification-visible')
        return visible
    })
    const [items] = useRxSubject(rxNotifications, true, map => Array.from(map).map(
        ([id, notification]) => <ListItem {...{ id, key: id + notification.read, notification }} />
    ))

    return <div className='notification-list'>{visible && items}</div>
})