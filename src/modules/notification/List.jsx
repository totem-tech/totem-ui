import React, { useState, useEffect } from 'react'
import { rxNotifications, visibleBond } from './notification'
import ListItem from './ListItem'
import './style.css'
import { useRxSubject } from '../../services/react'

export default React.memo(() => {
    const [visible, setVisible] = useState(visibleBond._value)
    const [items] = useRxSubject(rxNotifications, true, mapToEls)

    useEffect(() => {
        let mounted = true
        const tieIdVisible = visibleBond.tie(visible => {
            if (!mounted) return
            const cl = document.getElementById('app').classList
            cl[visible ? 'add' : 'remove']('notification-visible')
            setVisible(visible)
        })
        return () => {
            mounted = false
            visibleBond.untie(tieIdVisible)
        }
    }, [])

    return <div className='notification-list'>{visible && items}</div>
})

const mapToEls = map => Array.from(map).map(([id, notification]) => (
    <ListItem {...{
        id,
        key: id + notification.read,
        notification,
    }} />
))