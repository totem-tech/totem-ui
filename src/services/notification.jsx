import React from 'react'
import uuid from 'uuid'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import { Dropdown } from 'semantic-ui-react'
import { ButtonAcceptOrReject, UserID } from '../components/buttons'
import { newMessage } from '../utils/utils'
import client from './ChatClient'
import DataStorage from '../utils/DataStorage'
import { confirm, showForm } from './modal'
import { addToQueue, QUEUE_TYPES } from './queue'
import IdentityShareForm from '../forms/IdentityShare'
import PartnerForm from '../forms/Partner'
import identityService from './identity'

const notifications = new DataStorage('totem_service_notifications', true, false)
// store unread counts for individual types
// const unreadCounts = new DataStorage('totem_service_notifications-unread-counts', true, false)
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
    setTimeout(() => {
        confirmReceived(true)
        notifications.set(id, newNotification)
        triggerBond.changed(uuid.v1())
        newNotificationBond.changed(newNotification)
        console.log('Notification received!', id, senderId, tsCreated)
    })
})

export const toggleRead = id => {
    const item = notifications.get(id)
    item.read = !item.read
    notifications.set(id, item)
    triggerBond.changed(uuid.v1())
}

export const remove = id => setTimeout(() => notifications.delete(id) | triggerBond.changed(uuid.v1()))

export default class NotificationDropdown extends ReactiveComponent {
    constructor() {
        super([], { triggerBond })
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
                    {Array.from(items).filter(([_, { deleted }]) => !deleted).reverse().map(([id, notification]) => {
                        const { senderId, type, childType, message, data, tsCreated, read } = notification
                        const userIdBtn = <UserID userId={senderId} />
                        const typeSpaced = type.replace('_', ' ')
                        const msg = {
                            // attached: true,
                            icon: { name: 'bell outline', size: 'large' },
                            content: <span>{userIdBtn}: {message}</span>,
                            header: `${typeSpaced} ${childType}`,
                            key: id,
                            onClick: () => toggleRead(id),
                            onDismiss: e => e.stopPropagation() | remove(id),
                            status: read ? undefined : 'success',
                            style: { textAlign: 'left' },
                        }

                        switch (type + ':' + childType) {
                            case 'identity:request':
                                // data => {reason}
                                msg.header = undefined
                                msg.icon.name = 'user'
                                msg.content = (
                                    <div>
                                        <div><b>{userIdBtn} requested an Identity from you</b></div>
                                        <b>Reason : </b> {data.reason}
                                        <ButtonAcceptOrReject
                                            acceptText='Share'
                                            onClick={accepted => !accepted ? remove(id) : showForm(IdentityShareForm, {
                                                disabledFields: ['userIds'],
                                                onSubmit: success => success && remove(id),
                                                values: { userIds: [senderId] },
                                            })}
                                        />
                                    </div>
                                )
                                break
                            case 'identity:share':
                                // data => { address, name }
                                msg.header = undefined
                                msg.icon.name = 'user plus'
                                msg.content = (
                                    <div>
                                        <div><b>Identity received from {userIdBtn}</b></div>
                                        <ButtonAcceptOrReject
                                            acceptText='Add Partner'
                                            onClick={accepted => !accepted ? remove(id) : showForm(
                                                PartnerForm,
                                                {
                                                    onSubmit: success => success && remove(id),
                                                    suggestUserId: senderId,
                                                    values: data,
                                                }
                                            )}
                                            rejectText='Ignore'
                                        />
                                    </div>
                                )
                                break
                            case 'time_keeping:invitation':
                                // data => { projectHash, projectName, workerAddress }
                                // wrong user id used to send invitation. address does not belong to user
                                if (!identityService.find(data.workerAddress)) return remove(id)
                                msg.header = undefined
                                msg.icon.name = 'clock outline'
                                msg.content = (
                                    <div>
                                        {userIdBtn} invited you to start booking time on project:
                                        <b> {data.projectName}</b>
                                        <ButtonAcceptOrReject
                                            onClick={accepted => confirm({
                                                onConfirm: () => handleTKInvitation(
                                                    senderId,
                                                    data.projectHash,
                                                    data.projectName,
                                                    data.workerAddress,
                                                    accepted,
                                                    id,
                                                ),
                                                size: 'mini',
                                            }
                                            )} />
                                    </div>
                                )
                                break
                            case 'time_keeping:invitation_response':
                                // data => { projectHash, projectName, workerAddress }
                                const acceptedStr = data.accepted ? 'accepted' : 'rejected'
                                msg.header = undefined
                                msg.icon.name = 'clock outline'
                                msg.content = (
                                    <div>
                                        {userIdBtn} {acceptedStr} your invitation to project:
                                        <b> {data.projectName}</b>
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
                    }).filter(x => !!x)}
                </Dropdown.Menu>
            </Dropdown>
        )
    }
}


// respond to time keeping invitation
export const handleTKInvitation = (
    projectOwnerId, projectHash, projectName, workerAddress, accepted, notifyId
) => {
    const acceptedStr = accepted ? 'accepted' : 'rejected'
    const type = 'time_keeping'
    const childType = 'invitation'
    // find notification if not supplied
    notifyId = notifyId || Array.from(notifications.search({
        senderId: projectOwnerId,
        type,
        childType
    })).reduct((notifyId, [xNotifyId, xNotification]) => {
        if (!!notifyId) return notifyId
        const { data: { projectHash: hash, workerAddress: address } } = xNotification
        const match = hash === projectHash && address === workerAddress
        return match ? xNotifyId : null
    }, null)

    addToQueue({
        type: QUEUE_TYPES.BLOCKCHAIN,
        func: 'timeKeeping_worker_accept',
        args: [projectHash, workerAddress, accepted],
        title: `TimeKeeping - ${accepted ? 'accept' : 'reject'} invitation`,
        description: `Project: ${projectName}`,
        next: {
            type: QUEUE_TYPES.CHATCLIENT,
            func: 'notify',
            args: [
                [projectOwnerId],
                type,
                'invitation_response',
                `${acceptedStr} invitation to project: "${projectName}"`,
                { accepted, projectHash, projectName, workerAddress },
                err => !err && remove(notifyId)
            ]
        },
    })
}