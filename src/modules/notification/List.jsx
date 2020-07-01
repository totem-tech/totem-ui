import React, { useState, useEffect } from 'react'
import { notifications, visibleBond } from './notification'
import ListItem from './ListItem'

export default function NotificationList({ forceVisible = false, inline = false, isMobile }) {
    const [items, setItems] = useState(notifications.getAll())
    const [visible, setVisible] = useState(visibleBond._value)

    useEffect(() => {
        const tieId = notifications.bond.tie(() => setItems(notifications.getAll()))
        const tieIdVisible = visibleBond.tie(visible => setVisible(visible))
        return () => {
            notifications.bond.untie(tieId)
            visibleBond.untie(tieIdVisible)
        }
    }, [])

    return (
        <div
            className='notification-list'
            style={inline ? undefined : {
                bottom: isMobile ? 48 : undefined,
                position: 'fixed',
                top: !isMobile ? 63 : undefined,
                right: 0,
                width: !isMobile ? 400 : '100%',
                zIndex: 2,
            }}
        >
            {
                forceVisible || visible && Array.from(items)
                    .map(([id, notification]) => <ListItem {...{ id, key: id, notification }} />)
            }
        </div>
    )
}