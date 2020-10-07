import React from 'react'
import { rxNotifications, rxVisible } from './notification'
import ListItem from './NotificationItem'
import './style.css'
import { useRxSubject } from '../../services/react'
import { arrReverse } from '../../utils/utils'
import { MOBILE, rxLayout } from '../../services/window'

export default React.memo(() => {
    const [visible] = useRxSubject(rxVisible, visible => {
        const cl = document.getElementById('app').classList
        cl[visible ? 'add' : 'remove']('notification-visible')
        return visible
    })
    const [items] = useRxSubject(rxNotifications, map => {
        const isMobile = rxLayout.value === MOBILE
        const items = Array.from(map)
            //// dummy notifications for testing only
            // .concat([
            //     {
            //         from: 'jackie',
            //         type: 'task',
            //         childType: 'test',
            //         message: 'this is a test message',
            //         data: {},
            //         tsCreated: new Date().toISOString(),
            //         deleted: false,
            //         read: false,
            //     },
            //     {
            //         from: 'jackie',
            //         type: 'task',
            //         childType: 'invitation',
            //         message: 'this is a test message',
            //         data: {},
            //         tsCreated: new Date().toISOString(),
            //         deleted: false,
            //         read: false,
            //     },
            // ].map((n, id) => [`${id}`, n]))
            .map(([id, notification]) => (
                <ListItem {...{
                    id,
                    key: id + notification.read,
                    notification,
                }} />
            ))
        return arrReverse(items, isMobile)
    })

    return <div className='notification-list'>{visible && items}</div>
})