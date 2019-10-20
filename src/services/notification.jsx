import React from 'react'
import uuid from 'uuid'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import { secretStore } from 'oo7-substrate'
import { Button, Dropdown } from 'semantic-ui-react'
import { newMessage } from '../utils/utils'
import client, { getUser } from './ChatClient'
import DataStorage from '../utils/DataStorage'
import { showForm } from './modal'
import { addToQueue, QUEUE_TYPES } from './queue'
import SelectIdentityForm from '../forms/SelectIdentity'

const notifications = new DataStorage('totem_service_notifications', true, false)
// store unread counts for individual types
const unreadCounts = new DataStorage('totem_service_notifications-unread-counts', true, false)
const triggerBond = new Bond()
export const newNotificationBond = new Bond()

client.onNotify((id, senderId, type, childType, message, data, tsCreated, confirmReceived) => {
    if (notifications.get(id)) return
    const newNotification = {
        id,
        senderId,
        type,
        childType,
        message,
        data,
        tsCreated,
        deleted: false,
        read: false,
    }
    notifications.set(id, newNotification)
    triggerBond.changed(uuid.v1())
    newNotificationBond.changed(newNotification)
    console.log('Notification received!', id, senderId, tsCreated)
    confirmReceived(true)
})

window.sendNotify = () => {
    // emulate send notification
    const isBrave = getUser().id === 'brave'
    const toUserIds = [isBrave ? 'chromexe' : 'brave']
    const projectHash = isBrave ? '0x007abc020689be19844664a497b23b7bb6f1f1be9bd6fc406e4c983d2b2c0bed' : '0xaa4519740a665105ef3a726fc54cc051083238c90ee8015783ad7acc7ae5d78f'
    const message = isBrave ? 'Time keeping 001' : 'T001'
    client.notify(toUserIds, 'time_keeping', 'invitation', message, { projectHash },
        err => console.log('Notification sent:', !err, err))
}

export const toggleRead = id => {
    const item = notifications.get(id)
    item.read = !item.read
    notifications.set(id, item)
    triggerBond.changed(uuid.v1())
}

export const deleteNotification = id => notifications.delete(id) | triggerBond.changed(uuid.v1())

// ToDo: on bell icon click request new notifications
export default class NotificationDropdown extends ReactiveComponent {
    constructor() {
        super([], { triggerBond })
    }

    // time keeping invite response
    handleTKInviteResponse(id, accepted = false) {
        const notification = notifications.get(id)
        const { childType, data, message: projectName, senderId, type } = notification
        const { projectHash, workerAddress } = data
        const respond = (workerAddress) => {
            console.log({ workerAddress })
            const acceptedStr = accepted ? 'accepted' : 'rejected'
            const queueProps = {
                type: QUEUE_TYPES.BLOCKCHAIN,
                func: 'timeKeeping_invitation_add',
                args: [projectHash, workerAddress, workerAddress],
                title: 'TimeKeeping - invitation (step 1)',
                description: `Project: ${projectName} | Response: ${acceptedStr}`,
                next: {
                    type: QUEUE_TYPES.BLOCKCHAIN,
                    func: 'timeKeeping_invitation_accept',
                    args: [projectHash, workerAddress],
                    title: 'TimeKeeping - invitation (step 2)',
                    next: {
                        type: QUEUE_TYPES.CHATCLIENT,
                        func: 'notify',
                        title: 'TimeKeeping - invitation (step 3)',
                        args: [
                            [senderId],
                            type,
                            childType + 'Response',
                            `${acceptedStr} invitation to project "${projectName}"`,
                            { projectHash, accepted, workerAddress },
                            err => !err && deleteNotification(id)
                        ]
                    }
                },
            }
            addToQueue(queueProps)

        }
        const isWorkerAddressValid = !!workerAddress && !!secretStore.find(workerAddress)
        if (!accepted || isWorkerAddressValid) return respond(workerAddress)

        showForm(SelectIdentityForm, {
            onSubmit: (_, { address }) => respond(address),
            subheader: 'Select an wallet to be use with the invited project',
            submitText: 'Accept Invitation',
        })
    }

    render() {
        const maxHeight = window.innerHeight - 140
        const items = notifications.getAll()
        return items.size === 0 ? '' : (
            <Dropdown
                icon={{
                    name: 'bell outline',
                    size: 'large'
                }}
                item
                scrolling
            >
                <Dropdown.Menu className="notification-service" direction="left" style={{ maxHeight }}>
                    {Array.from(items).filter(([_, { deleted }]) => !deleted).map(([id, item]) => {
                        const { senderId, type, childType, message, data, tsCreated, read } = item
                        const typeSpaced = type.replace('_', ' ')
                        const msg = {
                            // attached: true,
                            icon: { name: 'bell outline', size: 'large' },
                            content: `@${senderId}: ${message}`,
                            header: `${typeSpaced}: ${childType}`,
                            key: id,
                            onClick: () => toggleRead(id),
                            onDismiss: (e) => e.stopPropagation() | deleteNotification(id),
                            status: read ? undefined : 'success',
                            style: { textAlign: 'left' },
                        }

                        switch (type + ':' + childType) {
                            case 'time_keeping:invitation':
                                msg.icon.name = 'clock outline'
                                msg.content = (
                                    <div>
                                        <b>@{senderId}</b> invited you to start booking time on the following project:
                                        <b> {message}</b>
                                        <div title="" style={{ textAlign: 'center', marginTop: 10 }}>
                                            <Button.Group>
                                                <Button positive onClick={e => this.handleTKInviteResponse(id, true)}>
                                                    Accept
                                                </Button>
                                                <Button.Or />
                                                <Button negative onClick={e => this.handleTKInviteResponse(id, false)}>
                                                    Reject
                                                </Button>
                                            </Button.Group>
                                        </div>
                                    </div>
                                )
                                break
                        }

                        msg.content = <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                        msg.header = <div className="header" style={{ textTransform: 'capitalize' }}>{msg.header}</div>

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