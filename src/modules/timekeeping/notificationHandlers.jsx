import React from 'react'
import { ButtonAcceptOrReject } from '../../components/buttons'
import { translated } from '../../services/language'
import { confirm } from '../../services/modal'
import { addToQueue, QUEUE_TYPES, statuses } from '../../services/queue'
import { getProject } from '../activity/activity'
import { getUser } from '../chat/ChatClient'
import { find as findIdentity } from '../identity/identity'
import { remove, search, setItemViewHandler } from '../notification/notification'
import { queueables } from './timekeeping'

const textsCap = translated({
    activity: 'activity',
    tkInvitationMsg: 'invited you to start booking time.',
    tkInviteAcceptMsg: 'accepted your invitation to the following activity',
    tkInviteRejectMsg: 'rejected your invitation to the following activity',
    yourIdentity: 'your identity',


    acceptInvitation: 'accept invitation',
    acceptedInvitation: 'accepted invitation to activity',
    rejectInvitation: 'reject invitation',
    rejectedInvitation: 'rejected invitation to activity',
    timekeeping: 'timekeeping',
}, true)[1]

/**
 * @name    handleInvitation
 * @summary respond to time keeping invitation
 * 
 * @param   {String}    projectId
 * @param   {String}    workerAddress
 * @param   {Boolean}   accepted
 * @param   {String}    projectOwnerId (optional)
 * @param   {String}    projectName
 * @param   {String}    notificationId
 * 
 */
export const handleInvitation = (
    projectId, workerAddress, accepted,
    // optional args
    projectOwnerId, projectName
) => new Promise(resolve => {
    const type = 'timekeeping'
    const childType = 'invitation'
    const currentUserId = (getUser() || {}).id
    // relevant notifications
    const notifications = search({ from: projectOwnerId, type, childType, }, true, true)
    const notificationIds = Array.from(notifications)
        .filter(([_, notification]) => {
            const { data } = notification
            const { projectHash: iProjectId, workerAddress: iWorkerAddress } = data || {}
            return iProjectId === iProjectId && iWorkerAddress === workerAddress
        })
        .map(([id]) => id)
    const notificationId = notificationIds.slice(-1)[0]

    const getprops = (projectOwnerId, projectName) => queueables.worker.accept(projectId, workerAddress, accepted, {
        title: `${textsCap.timekeeping} - ${accepted ? textsCap.acceptInvitation : textsCap.rejectInvitation}`,
        description: `${textsCap.activity}: ${projectName}`,
        notificationId,
        then: success => !success && resolve(false),
        // no need to notify if current user is the project owner
        next: !projectOwnerId || projectOwnerId === currentUserId ? undefined : {
            address: workerAddress, // for automatic balance check
            type: QUEUE_TYPES.CHATCLIENT,
            func: 'notify',
            notificationId,
            args: [
                [projectOwnerId],
                type,
                'invitation_response',
                `${accepted ? textsCap.acceptedInvitation : textsCap.rejectedInvitation}: "${projectName}"`,
                { accepted, projectHash: projectId, projectName, workerAddress },
                err => {
                    // remove all invitation notifications matching exact save type and data
                    if (!err) notificationIds.forEach(([id]) => remove(id))
                    resolve(!err)
                }
            ]
        }
    })

    if (!!projectOwnerId && !!projectName) return addToQueue(getprops(projectOwnerId, projectName))

    // retrieve project details to get project name and owners user id
    getProject(projectId).then(project => {
        const { name, userId } = project || {}
        addToQueue(getprops(userId, name))
    })
})

/**
* @name    hanldeInvitationItemView
* @summary handles how timekeeping invitation notification is diplayed
*/
const hanldeInvitationItemView = (id, notification, { senderId, senderIdBtn }) => {
    const { data, status } = notification
    const item = { icon: 'clock outline' }
    const { projectHash, projectName, workerAddress } = data || {}
    const identity = findIdentity(workerAddress)
    if (!identity) {
        // wrong user id used to send invitation or address no longer belong to user
        remove(id)
        return ''
    }

    item.content = (
        <div>
            {senderIdBtn} {textsCap.tkInvitationMsg}<br />
            {textsCap.yourIdentity}: <b>{identity.name}</b><br />
            {textsCap.activity}: <b>{projectName}</b><br />
            <ButtonAcceptOrReject
                acceptColor='blue'
                disabled={status === statuses.LOADING}
                onClick={accepted => confirm({
                    onConfirm: () => handleInvitation(
                        projectHash,
                        workerAddress,
                        accepted,
                        senderId,
                        projectName,
                        id,
                    ),
                    size: 'mini',
                })}
            />
        </div>
    )
    return item
}

const handleInvitationResponseItemView = (id, notification, { senderIdBtn }) => {
    const { data } = notification
    const { accepted, projectName } = data || {}
    const item = { icon: 'clock outline' }
    item.content = (
        <div>
            {senderIdBtn} {accepted ? textsCap.tkInviteAcceptMsg : textsCap.tkInviteRejectMsg}:
            <b> {projectName}</b>
        </div>
    )
    return item
}

export const itemViewHandlers = [
    {
        childType: 'invitation',
        handler: hanldeInvitationItemView,
        type: 'timekeeping',
    },
    {
        childType: 'invitation_response',
        handler: handleInvitationResponseItemView,
        type: 'timekeeping',
    }
]


// set notification item handlers
export const setHandlers = () => itemViewHandlers.forEach(x => setItemViewHandler(x.type, x.childType, x.handler))