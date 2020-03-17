import React, { Component } from 'react'
import uuid from 'uuid'
import { Bond } from 'oo7'
import { Dropdown } from 'semantic-ui-react'
import { deferred } from '../utils/utils'
import DataStorage from '../utils/DataStorage'
// components
import { ButtonAcceptOrReject, UserID } from '../components/buttons'
import Message from '../components/Message'
// forms
import IdentityShareForm from '../forms/IdentityShare'
import PartnerForm from '../forms/Partner'
// services
import client, { getUser } from './chatClient'
import identityService from './identity'
import { translated } from './language'
import { confirm, showForm } from './modal'
import { getProject } from './project'
import { addToQueue, QUEUE_TYPES } from './queue'
import { workerTasks } from './timeKeeping'

const MODULE_KEY = 'totem_notifications'
const notifications = new DataStorage(MODULE_KEY, true, false)
// store unread counts for individual types
// const unreadCounts = new DataStorage('totem_service_notifications-unread-counts', true, false)
const triggerBond = new Bond()
export const newNotificationBond = new Bond()
const [words, wordsCap] = translated({
    activity: 'activity',
    ignore: 'ignore',
    reason: 'reason',
    timekeeping: 'timekeeping'
}, true)
const [texts] = translated({
    addPartner: 'Add partner',
    acceptInvitation: 'accept invitation',
    acceptedInvitation: 'accepted invitation to activity',
    indentityIntroduceMsg: 'recommended you to share your identity with the following user: ',
    identityRequestMsg: 'requested an identity',
    identityShareMsg: 'Identity received from:',
    rejectInvitation: 'reject invitation',
    rejectedInvitation: 'rejected invitation to activity',
    tkInvitationMsg: 'invited you to start booking time.',
    tkInviteAcceptMsg: 'accepted your invitation to the following activity',
    tkInviteRejectMsg: 'rejected your invitation to the following activity',
    yourIdentity: 'Your identity',

})

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

export default class NotificationDropdown extends Component {
    constructor(props) {
        super(props)

        this.state = {
            blinkClass: '',
            items: notifications.getAll(),
            open: false,
        }

        this.iconAddBlink = () => this.setState({ blinkClass: 'blink' })
        this.iconRemoveBlink = deferred(() => this.setState({ blinkClass: '' }), 5000, this)
    }

    componentWillMount() {
        this.tieId = triggerBond.tie(() => this.setState({ items: notifications.getAll() }))
        this.tieIdClass = newNotificationBond.tie(() => {
            if (this.state.open) return
            this.iconAddBlink()
            this.iconRemoveBlink()
        })
    }

    componentWillUnmount() {
        triggerBond.untie(this.tieId)
        newNotificationBond.untie(this.tieIdClass)
    }

    render() {
        const { blinkClass, items } = this.state
        const style = { maxHeight: window.innerHeight - 140 }
        const allRead = Array.from(items).every(([_, { read }]) => read)
        const classNames = [
            'notification-dropdown',
            blinkClass,
            !allRead && 'has-unread'
        ].filter(Boolean).join(' ')

        return items.size === 0 ? '' : (
            <Dropdown
                className={classNames}
                icon={{ className: 'no-margin', name: 'bell', size: 'large' }}
                item
                onClick={() => this.setState({ blinkClass: '' })}
                onClose={() => this.setState({ open: false })}
                onOpen={() => this.setState({ open: true })}
                scrolling
            >
                <Dropdown.Menu className='notifictaions' direction="left" style={style}>

                    {Array.from(items).filter(([_, { deleted }]) => !deleted).reverse().map(([id, notification]) => {
                        const { senderId, type, childType, message, data, tsCreated, read } = notification
                        const userIdBtn = <UserID userId={senderId} />
                        const typeSpaced = type.replace('_', ' ')
                        const msg = {
                            // attached: true,
                            icon: { name: 'bell outline' },
                            content: <span>{userIdBtn}: {message}</span>,
                            header: `${typeSpaced} ${childType}`,
                            key: id,
                            onClick: () => toggleRead(id),
                            onDismiss: e => e.stopPropagation() | remove(id),
                            status: read ? undefined : 'success',
                            style: { textAlign: 'left' },
                        }

                        switch (type + ':' + childType) {
                            case 'identity:introduce': // data => {userId}
                            case 'identity:request': // data => {reason}
                                const isIntroduce = childType === 'introduce'
                                msg.header = undefined
                                msg.icon.name = isIntroduce ? 'handshake' : 'user'
                                const recipientId = isIntroduce ? data.userId : senderId
                                msg.content = (
                                    <div>
                                        <div>
                                            <b>{userIdBtn} {!isIntroduce ? texts.identityRequestMsg : texts.indentityIntroduceMsg}</b>
                                            {isIntroduce ? <UserID userId={recipientId} /> : (
                                                <div><b>{wordsCap.reason} :</b> {data.reason}</div>
                                            )}
                                        </div>
                                        <ButtonAcceptOrReject
                                            acceptText='Share'
                                            onClick={accepted => !accepted ? remove(id) : showForm(IdentityShareForm, {
                                                inputsDisabled: ['userIds'],
                                                onSubmit: success => success && remove(id),
                                                values: {
                                                    introducedBy: isIntroduce ? senderId : null,
                                                    userIds: [recipientId],
                                                },
                                            })}
                                        />
                                    </div>
                                )
                                break
                            case 'identity:share': // data => { address, introducedBy, name }
                                msg.header = undefined
                                msg.icon.name = 'user plus'
                                msg.content = (
                                    <div>
                                        <div><b>{texts.identityShareMsg} {userIdBtn}</b></div>
                                        <ButtonAcceptOrReject
                                            acceptText={texts.addPartner}
                                            onClick={accepted => !accepted ? remove(id) : showForm(
                                                PartnerForm,
                                                {
                                                    onSubmit: success => success && remove(id),
                                                    values: { ...data, userId: data.introducedBy || senderId },
                                                }
                                            )}
                                            rejectText={wordsCap.ignore}
                                        />
                                        <div>{message}</div>
                                    </div>
                                )
                                break
                            case 'time_keeping:invitation': // data => { projectHash, projectName, workerAddress }
                                // wrong user id used to send invitation. address does not belong to user
                                const identity = identityService.find(data.workerAddress)
                                if (!identity) return remove(id)
                                msg.header = undefined
                                msg.icon.name = 'clock outline'
                                msg.content = (
                                    <div>
                                        {userIdBtn} {texts.tkInvitationMsg}<br />
                                        {texts.yourIdentity}: <b>{identity.name}</b><br />
                                        {wordsCap.activity}: <b>{data.projectName}</b><br />
                                        <ButtonAcceptOrReject
                                            onClick={accepted => confirm({
                                                onConfirm: () => handleTKInvitation(
                                                    data.projectHash,
                                                    data.workerAddress,
                                                    accepted,
                                                    senderId,
                                                    data.projectName,
                                                    id,
                                                ),
                                                size: 'mini',
                                            }
                                            )} />
                                    </div>
                                )
                                break
                            case 'time_keeping:invitation_response': // data => { projectHash, projectName, workerAddress }
                                msg.header = undefined
                                msg.icon.name = 'clock outline'
                                msg.content = (
                                    <div>
                                        {userIdBtn} {data.accepted ? texts.tkInviteAcceptMsg : texts.tkInviteRejectMsg}:
                                        <b> {data.projectName}</b>
                                    </div>
                                )
                                break
                        }

                        msg.content = <div style={styles.messageContent}>{msg.content}</div>
                        msg.header = <div className="header" style={styles.messageHeader}>{msg.header}</div>
                        return (
                            <Dropdown.Item
                                className="no-padding"
                                key={id}
                                onClick={e => e.stopPropagation()}
                            // style={{ minWidth: 400 }}
                            >
                                <Message {...msg} />
                            </Dropdown.Item>
                        )
                    }).filter(x => !!x)}
                </Dropdown.Menu >
            </Dropdown >
        )
    }
}

// respond to time keeping invitation
export const handleTKInvitation = (
    projectHash, workerAddress, accepted,
    // optional args
    projectOwnerId, projectName, notifyId
) => new Promise(resolve => {
    const type = 'time_keeping'
    const childType = 'invitation'
    const currentUserId = (getUser() || {}).id
    // find notification if not supplied
    notifyId = notifyId || Array.from(notifications.search({
        senderId: projectOwnerId,
        type,
        childType
    })).reduce((notifyId, [xNotifyId, xNotification]) => {
        if (!!notifyId) return notifyId
        const { data: { projectHash: hash, workerAddress: address } } = xNotification
        const match = hash === projectHash && address === workerAddress
        return match ? xNotifyId : null
    }, null)

    const getprops = (projectOwnerId, projectName) => workerTasks.accept(projectHash, workerAddress, accepted, {
        title: `${wordsCap.timekeeping} - ${accepted ? texts.acceptInvitation : texts.rejectInvitation}`,
        description: `${wordsCap.activity}: ${projectName}`,
        then: success => !success && resolve(false),
        // no need to notify if rejected or current user is the project owner
        next: !accepted || !projectOwnerId || projectOwnerId === currentUserId ? undefined : {
            address: workerAddress, // for automatic balance check 
            type: QUEUE_TYPES.CHATCLIENT,
            func: 'notify',
            args: [
                [projectOwnerId],
                type,
                'invitation_response',
                `${accepted ? texts.acceptedInvitation : texts.rejectedInvitation}: "${projectName}"`,
                { accepted, projectHash, projectName, workerAddress },
                err => {
                    !err && notifyId && remove(notifyId)
                    resolve(!err)
                }
            ]
        }
    })

    if (!!projectOwnerId && !!projectName) return addToQueue(getprops(projectOwnerId, projectName))

    // retrieve project details to get project name and owners user id
    getProject(projectHash).then(project => {
        const { name, userId } = project || {}
        addToQueue(getprops(userId, name))
    })
})

const styles = {
    messageContent: { whiteSpace: 'pre-wrap', padding: '0 12px 0 55px' },
    messageHeader: { textTransform: 'capitalize' },
}