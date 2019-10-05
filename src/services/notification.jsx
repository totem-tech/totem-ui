import React from 'react'
import uuid from 'uuid'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import { Button, Dropdown } from 'semantic-ui-react'
import { newMessage } from '../utils/utils'
import client, {getUser} from './ChatClient'
import DataStorage from '../utils/DataStorage'
const notifications = new DataStorage('totem_service_notifications', true, false)
const unreadCounts = new DataStorage('totem_service_notifications-unread-counts', true, false)
const triggerBond = new Bond()

client.onNotify((id, senderId, type, childType, message, data, tsCreated, confirmReceived) => {
    if (notifications.get(id)) return
    notifications.set(id, {
        senderId,
        type,
        childType,
        message,
        data,
        tsCreated,
        deleted: false,
        read: false,
    })
    triggerBond.changed(uuid.v1())
    console.log('notification.js')
    confirmReceived(true)
})

client.onNotify((id, senderId, type, childType, message, data, tsCreated, confirm) => { 
    confirm(true)
    console.log('Notification received!', id, senderId, tsCreated)
})

window.sendNotify = () => {
    // emulate send notification
    const isBrave = getUser().id === 'brave'
    const toUserIds = [isBrave ? 'chromexe' : 'brave']
    const projectHash = isBrave ? '0x007abc020689be19844664a497b23b7bb6f1f1be9bd6fc406e4c983d2b2c0bed' : '0xaa4519740a665105ef3a726fc54cc051083238c90ee8015783ad7acc7ae5d78f'
    const message = isBrave ? 'Time keeping 001' : 'T001'
    client.notify(toUserIds, 'time_keeping', 'invitation', message, {projectHash}, 
        err => console.log('Notification sent:', !err, err))
}
// console.log('window', window)

export const toggleRead = id => {
    const item = notifications.get(id)
    item.read = !item.read
    notifications.set(id, item)
    triggerBond.changed(uuid.v1())
}

export const markDeleted = id => {

}

export default class NotificationService extends ReactiveComponent {
    constructor() {
        super([], {triggerBond})
    }

    render() {
        const maxHeight = window.innerHeight - 140
        return (
            <Dropdown
                icon={{
                    name: 'bell outline',
                    size: 'large'
                }}
                item
                scrolling
            >
                <Dropdown.Menu className="notification-service" direction="left" style={{maxHeight}}>
                    {Array.from(notifications.getAll()).filter(([_, {deleted}]) => !deleted).map(([id, item]) => {
                        const {senderId, type, childType, message, data, tsCreated, read} = item
                        const typeSpaced = type.replace('_', ' ')
                        const msg = {
                            // attached: true,
                            icon: {name: 'bell outline', size: 'large'},
                            content: `@${senderId}: ${message}`,
                            header: `${typeSpaced}: ${childType}`,
                            key: id,
                            onClick: () => toggleRead(id),
                            onDismiss: (e) => e.stopPropagation() | markDeleted(id),
                            status: read ? undefined : 'success',
                            style: {textAlign: 'left'},
                        }

                        switch(type) {
                            case 'time_keeping':
                                msg.icon.name = 'clock outline'
                                msg.content = (
                                    <div>
                                        <b>@{senderId}</b> invited you to start booking time on the following project:
                                        <b>{message}</b>
                                        <div title="" style={{textAlign: 'center', marginTop: 10}}>
                                            <Button.Group>
                                                <Button positive onClick={e => e.stopPropagation()}>Accept</Button>
                                                <Button.Or />
                                                <Button negative onClick={e => e.stopPropagation()}>Reject</Button>
                                            </Button.Group>
                                        </div>
                                    </div>
                                )
                            break
                        }

                        msg.content = <div style={{whiteSpace: 'pre-wrap'}}>{msg.content}</div>
                        msg.header = <div className="header" style={{textTransform: 'capitalize'}}>{msg.header}</div>

                        return (
                            <Dropdown.Item
                                className="no-padding"
                                key={id}
                                onClick={e => e.stopPropagation()}
                                style={{ minWidth: 400 }}
                            >
                                {newMessage(msg)}
                            </Dropdown.Item>
                        )
                    })}
                </Dropdown.Menu>
            </Dropdown>
        )
    }
}

// export class Notification 