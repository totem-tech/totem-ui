import React, { useState, useEffect } from 'react'
import { rxNotifications, visibleBond } from './notification'
import ListItem from './ListItem'
import './style.css'
import { unsubscribe } from '../../services/react'

export default function NotificationList() {
    const [items, setItems] = useState(rxNotifications.value || new map())
    const [visible, setVisible] = useState(visibleBond._value)

    useEffect(() => {
        let mounted = true
        const subscriptions = {}
        subscriptions.notifications = rxNotifications.subscribe(map => mounted && setItems(map))
        const tieIdVisible = visibleBond.tie(visible => {
            const cl = document.getElementById('app').classList
            cl[visible ? 'add' : 'remove']('notification-visible')
            setVisible(visible)
        })
        return () => {
            mounted = false
            visibleBond.untie(tieIdVisible)
            unsubscribe(subscriptions)
        }
    }, [])

    return (
        <div className='notification-list'>
            {visible && Array.from(items).map(([id, notification]) => (
                <ListItem {...{ id, key: id, notification }} />
            ))}
        </div>
    )
}