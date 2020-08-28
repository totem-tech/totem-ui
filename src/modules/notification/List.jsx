import React, { useState, useEffect } from 'react'
import { rxNotifications, visibleBond } from './notification'
import ListItem from './ListItem'
import './style.css'
import { isFn } from '../../utils/utils'

export default function NotificationList() {
    const [items, setItems] = useState()
    const [visible, setVisible] = useState(visibleBond._value)

    useEffect(() => {
        let mounted = true
        const unsubscribers = {}
        unsubscribers.notifications = rxNotifications.subscribe(map => mounted && setItems(map)).unsubscribe
        const tieIdVisible = visibleBond.tie(visible => {
            const cl = document.getElementById('app').classList
            cl[visible ? 'add' : 'remove']('notification-visible')
            setVisible(visible)
        })
        return () => {
            mounted = false
            visibleBond.untie(tieIdVisible)
            Object.values(unsubscribers).forEach(fn => isFn(fn) && fn())
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