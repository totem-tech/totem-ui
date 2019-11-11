import React from 'react'
import uuid from 'uuid'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import { secretStore } from 'oo7-substrate'
import { Button, Dropdown } from 'semantic-ui-react'
import { ButtonAcceptOrReject, UserID } from '../components/buttons'
import { newMessage } from '../utils/utils'
import client, { getUser } from './ChatClient'
import DataStorage from '../utils/DataStorage'
import { showForm } from './modal'
import { addToQueue, QUEUE_TYPES } from './queue'
import SelectIdentityForm from '../forms/SelectIdentity'
import IdentityShareForm from '../forms/IdentityShare'
import PartnerForm from '../forms/Partner'

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
    handleTKIdentityResponse(id, accepted = false) {
        const notification = notifications.get(id)
        const { childType, data, senderId, type } = notification
        const { projectName, projectHash } = data
        const respond = (workerAddress) => {
            const acceptStr = accepted ? 'submit' : 'reject'
            addToQueue({
                type: QUEUE_TYPES.CHATCLIENT,
                func: 'notify',
                title: `TimeKeeping - ${acceptStr} identity`,
                description: `Project: ${projectName}`,
                args: [
                    [senderId],
                    type,
                    childType + '_response',
                    `${acceptStr}ed invitation to project: "${projectName}"`,
                    { accepted, projectHash, workerAddress },
                    err => !err && deleteNotification(id)
                ]
            })
        }

        !accepted ? respond() : showForm(SelectIdentityForm, {
            header: 'Submit Identity',
            message: {
                content: `Your identity will be sent to the project owner. Upon approval you will receive the formal 
                    invitation and once you accept that you will be able to start booking time for the project.`,
                header: 'How it works?',
                icon: 'question circle'
            },
            onSubmit: (_, { address }) => respond(address),
            subheader: 'Select an identity to be use with the invited project',
        })
    }

    handleTKInvitationResponse(id, accepted) {
        const notification = notifications.get(id)
        const { childType, data, senderId, type } = notification
        const { projectHash, projectName, workerAddress } = data
        const acceptedStr = accepted ? 'accepted' : 'rejected'
        addToQueue({
            type: QUEUE_TYPES.BLOCKCHAIN,
            func: 'timeKeeping_invitation_accept',
            args: [projectHash, workerAddress, accepted],
            title: `TimeKeeping - ${accepted ? 'accept' : 'reject'} invitation`,
            description: `Project: ${projectName}`,
            next: {
                type: QUEUE_TYPES.CHATCLIENT,
                func: 'notify',
                args: [
                    [senderId],
                    type,
                    childType + '_response',
                    `${acceptedStr} invitation to project: "${projectName}"`,
                    { accepted, projectHash, workerAddress },
                    err => !err && deleteNotification(id)
                ]
            },
        })
    }

    render() {
        const maxHeight = window.innerHeight - 140
        const items = notifications.getAll()

        return items.size === 0 ? '' : (
            <Dropdown
                icon={{ name: 'bell outline', size: 'large' }}
                item
                scrolling
            >
                <Dropdown.Menu className="notification-service" direction="left" style={{ maxHeight }}>
                    {Array.from(items).filter(([_, { deleted }]) => !deleted).reverse().map(([id, item]) => {
                        const { senderId, type, childType, message, data, tsCreated, read } = item
                        const userIdBtn = <UserID userId={senderId} />
                        const typeSpaced = type.replace('_', ' ')
                        let { projectName } = data
                        const msg = {
                            // attached: true,
                            icon: { name: 'bell outline', size: 'large' },
                            content: <span>{userIdBtn}: {message}</span>,
                            header: `${typeSpaced} ${childType}`,
                            key: id,
                            onClick: () => toggleRead(id),
                            onDismiss: e => e.stopPropagation() | deleteNotification(id),
                            status: read ? undefined : 'success',
                            style: { textAlign: 'left' },
                        }

                        switch (type + ':' + childType) {
                            case 'identity:request':
                                msg.header = <span>{userIdBtn} requested your identity</span>
                                msg.icon.name = 'user'
                                msg.content = (
                                    <div>
                                        <b>Reason:</b> {data.reason}
                                        <ButtonAcceptOrReject
                                            acceptText='Share'
                                            onClick={accepted => !accepted ? deleteNotification(id) : showForm(IdentityShareForm, {
                                                disabledFields: ['userIds'],
                                                onSubmit: success => success && deleteNotification(id),
                                                values: { userIds: [senderId] },
                                            })}
                                        />
                                    </div>
                                )
                                break
                            case 'identity:share':
                                const { address, name } = data
                                msg.header = <span>Identity received from {userIdBtn}</span>
                                msg.icon.name = 'user plus'
                                msg.content = (
                                    <div>
                                        <br />
                                        <ButtonAcceptOrReject
                                            acceptText='Add Partner'
                                            onClick={accepted => !accepted ? deleteNotification(id) : showForm(PartnerForm, {
                                                onSubmit: success => success && deleteNotification(id),
                                                values: { address, name },
                                            })}
                                            rejectText='Ignore'
                                        />
                                    </div>
                                )
                                break
                            case 'time_keeping:identity':
                                msg.icon.name = 'clock outline'
                                msg.content = (
                                    <div>
                                        <b>@{senderId}</b> wants you to join the following project:
                                        <b> {projectName}</b>
                                        <ButtonAcceptOrReject
                                            onClick={accepted => this.handleTKIdentityResponse(id, accepted)}
                                        />
                                    </div>
                                )
                                break
                            case 'time_keeping:invitation':
                                msg.icon.name = 'clock outline'
                                msg.content = (
                                    <div>
                                        <b>@{senderId}</b> invited you to start booking time for the following project:
                                        <b> {projectName}</b>
                                        <ButtonAcceptOrReject
                                            onClick={accepted => this.handleTKInvitationResponse(id, accepted)}
                                        />
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

export const handleIdentityRequest = (notificationId, accepted = false) => {
    const notification = notifications.get(notificationId)
}