import React, { useState, useEffect } from 'react'
import { notifications, visibleBond } from './notification'
import ListItem from './ListItem'
import './style.css'

export default function NotificationList() {
    const [items, setItems] = useState(notifications.getAll())
    const [visible, setVisible] = useState(visibleBond._value)

    useEffect(() => {
        const tieId = notifications.bond.tie(() => setItems(notifications.getAll()))
        const tieIdVisible = visibleBond.tie(visible => {
            const cl = document.getElementById('app').classList
            cl[visible ? 'add' : 'remove']('notification-visible')
            setVisible(visible)
        })
        return () => {
            notifications.bond.untie(tieId)
            visibleBond.untie(tieIdVisible)
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