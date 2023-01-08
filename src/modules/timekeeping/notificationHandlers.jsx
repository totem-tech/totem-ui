import React from 'react'
import { ButtonGroupOr } from '../../components/buttons'
import { translated } from '../../services/language'
import { closeModal, confirm } from '../../services/modal'
import { addToQueue, QUEUE_TYPES, statuses } from '../../services/queue'
import { fetchProjects } from '../activity/activity'
import { getUser } from '../chat/ChatClient'
import { find as findIdentity } from '../identity/identity'
import IdentityIcon from '../identity/IdentityIcon'
import { getMatchingIds, remove, search, setItemViewHandler } from '../notification/notification'
import { getProject, getProjects, queueables } from './timekeeping'

let textsCap = {
    accept: 'accept',
    reject: 'reject',
    activity: 'activity',
    activityNotFound: 'activity not found',
    tkInvitationMsg: 'invited you to start booking time.',
    tkInviteAcceptMsg: 'accepted your invitation to the following activity',
    tkInviteRejectMsg: 'rejected your invitation to the following activity',
    yourIdentity: 'your identity',

    acceptInvitation: 'accept invitation',
    acceptedInvitation: 'accepted invitation to activity',
    rejectInvitation: 'reject invitation',
    rejectedInvitation: 'rejected invitation to activity',
    timekeeping: 'timekeeping',

    loadingData: 'loading data',
}
textsCap = translated(textsCap, true)[1]
// notification types
const TK_TYPE = 'timekeeping'
const TK_ChildTypes = {
    invitation: 'invitation',
    invitationResponse: 'invitation_response',
}

/**
 * @name    handleInvitation
 * @summary respond to timekeeping invitation
 * 
 * @param   {String}    projectId
 * @param   {String}    workerAddress
 * @param   {Boolean}   accepted
 * @param   {String}    projectOwnerId (optional)
 * @param   {String}    projectName
 * @param   {String}    notificationId
 * 
 * @returns {Boolean}   resolves with a boolean value indicating success or failue
 */
export const handleInvitation = (projectId, workerAddress, accepted, notificationId) => new Promise(async (resolve) => {
    let confirmId
    const resolver = err => {
        resolve(!err)
        // show error message
        err && confirm({
            content: `${err}`,
            confirmButton: null,
            size: 'tiny'
        })
    }
    try {
        const currentUserId = (getUser() || {}).id
        confirmId = confirm({
            cancelButton: null,
            content: textsCap.loadingData,
            size: 'mini',
        })
        const project = (await fetchProjects([projectId]))
            .get(projectId)
        closeModal(confirmId)
        if (!project) return resolver(textsCap.activityNotFound)

        const { name: projectName, userId: projectOwnerId } = project
        // find any notifications matching the for the specific invitation
        notificationId = getMatchingIds( //notificationId || 
            { type: TK_TYPE, childType: TK_ChildTypes.invitation },
            { projectHash: projectId, workerAddress },
        )
        const description = `${textsCap.activity}: ${projectName}`
        const actionStr = `${accepted ? textsCap.acceptInvitation : textsCap.rejectInvitation}`
        const title = `${textsCap.timekeeping} - ${actionStr}`
        const shoudNotify = projectOwnerId && projectOwnerId !== currentUserId
        // notify project owner, if current user is not the owner
        const next = !shoudNotify ? undefined : {
            address: workerAddress, // for automatic balance check
            type: QUEUE_TYPES.CHATCLIENT,
            func: 'notify',
            notificationId,
            args: [
                [projectOwnerId], // recipient user IDs
                TK_TYPE,
                TK_ChildTypes.invitationResponse,
                `${accepted ? textsCap.acceptedInvitation : textsCap.rejectedInvitation}: "${projectName}"`,
                {
                    accepted,
                    projectHash: projectId,
                    projectName,
                    workerAddress,
                },
                err => resolver(err)
            ]
        }
        const queueProps = queueables.worker.accept(
            projectId,
            workerAddress,
            accepted,
            {
                title,
                description,
                notificationId,
                then: success => {
                    remove(notificationId)
                    !shoudNotify && resolver(!success)
                },
                next,
            },
        )

        confirm({
            confirmButton: {
                content: actionStr,
                positive: accepted,
                negative: !accepted,
            },
            onConfirm: () => addToQueue(queueProps),
            size: 'mini',
        })
    } catch (err) {
        resolver(err)
    }
})

setTimeout(() => [
    {
        childType: TK_ChildTypes.invitation,
        handler: (id, notification, { senderId, senderIdBtn }) => {
            const { data, status } = notification
            const item = { icon: 'clock outline' }
            const { projectHash, projectName, workerAddress } = data || {}
            const identity = findIdentity(workerAddress)
            if (!identity) {
                // wrong user id used to send invitation or address no longer belong to user
                remove(id)
                return ''
            }

            const { name, usageType } = identity

            item.content = (
                <div>
                    {senderIdBtn} {textsCap.tkInvitationMsg}<br />
                    {textsCap.yourIdentity}:
                    <b>
                        {' '}
                        <IdentityIcon {...{ usageType }} />
                        {' ' + name}
                    </b>
                    <br />
                    {textsCap.activity}: <b>{projectName}</b><br />
                    <ButtonGroupOr {...{
                        buttons: [
                            {
                                color: 'green',
                                content: textsCap.accept,
                                value: false,
                            },
                            {
                                color: 'red',
                                content: textsCap.reject,
                            },
                        ],
                        disabled: status === statuses.LOADING,
                        fluid: true,
                        loading: status === statuses.LOADING,
                        onAction: (_, accepted) => handleInvitation(
                            projectHash,
                            workerAddress,
                            accepted,
                            id,
                        ),
                        values: [true, false],
                    }} />
                </div>
            )
            return item
        },
        type: TK_TYPE,
    },
    {
        childType: TK_ChildTypes.invitationResponse,
        handler: (id, notification, { senderIdBtn }) => {
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
        },
        type: TK_TYPE,
    }
].forEach(x => setItemViewHandler(x.type, x.childType, x.handler)))