import React from 'react'
import { Button, ButtonGroupOr } from '../../components/buttons'
import {
    closeModal,
    confirm,
    confirmAsPromise
} from '../../services/modal'
import {
    addToQueue,
    QUEUE_TYPES,
    statuses
} from '../../services/queue'
import { getUser } from '../../utils/chatClient'
import { translated } from '../../utils/languageHelper'
import ActivityDetails from '../activity/ActivityDetails'
import ActivityName from '../activity/ActivityName'
import { fetchById } from '../activity/useActivities'
import { find as findIdentity } from '../identity/identity'
import IdentityIcon from '../identity/IdentityIcon'
import {
    getMatchingIds,
    remove,
    setItemViewHandler
} from '../notification/notification'
import { queueables } from './timekeeping'

const textsCap = {
    accept: 'accept',
    acceptedInvitation: 'accepted invitation to activity',
    acceptInvitation: 'accept invitation',
    activity: 'activity',
    activityNotFound: 'activity not found',
    loadingData: 'loading data...',
    reject: 'reject',
    rejectedInvitation: 'rejected invitation to activity',
    rejectInvitation: 'reject invitation',
    timekeeping: 'timekeeping',
    tkInvitationMsg: 'invited you to start booking time.',
    tkInviteAcceptMsg: 'accepted your invitation to the following activity',
    tkInviteRejectMsg: 'rejected your invitation to the following activity',
    viewActivity: 'view activity',
    yourIdentity: 'your identity',
}
translated(textsCap, true)
// notification types
const TK_TYPE = 'timekeeping'
const TK_ChildTypes = {
    invitation: 'invitation',
    invitationResponse: 'invitation_response',
}

/**
 * @name    handleInvitation
 * @summary worker responds to timekeeping invitation
 * 
 * @param   {String}    activityId
 * @param   {String}    workerAddress
 * @param   {Boolean}   accepted
 * @param   {String}    projectOwnerId (optional)
 * @param   {String}    projectName
 * @param   {String}    notificationId
 * 
 * @returns {Boolean}   true: success, false: error/user-cancellation
 */
export const handleInvitation = (
    activityId,
    workerAddress,
    accepted,
    notificationId
) => new Promise(async (resolve) => {
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
        // show loading modal 
        confirmId = confirm({
            confirmButton: null,
            content: textsCap.loadingData,
            size: 'mini',
        })
        const activity = await fetchById(activityId, { workerAddress })
        // close loading 
        closeModal(confirmId)
        if (!activity) return resolver(textsCap.activityNotFound)

        const {
            name: activityName,
            ownerAddress,
            userId: activityOwnerId
        } = activity
        // find any notifications matching the for the specific invitation
        notificationId = getMatchingIds(
            {
                type: TK_TYPE,
                childType: TK_ChildTypes.invitation,
            },
            {
                projectHash: activityId,
                workerAddress,
            },
        )
        const description = `${textsCap.activity}: ${activityName}`
        const actionStr = accepted
            ? textsCap.acceptInvitation
            : textsCap.rejectInvitation
        const actionDoneStr = accepted
            ? textsCap.acceptedInvitation
            : textsCap.rejectedInvitation
        const title = `${textsCap.timekeeping} - ${actionStr}`
        const shouldNotify = activityOwnerId
            && activityOwnerId !== currentUserId
        // notify project owner, if current user is not the owner
        const next = shouldNotify && {
            address: workerAddress, // for automatic balance check
            type: QUEUE_TYPES.CHATCLIENT,
            func: 'notify',
            notificationId,
            args: [
                [activityOwnerId], // recipient user IDs
                TK_TYPE,
                TK_ChildTypes.invitationResponse,
                `${actionDoneStr}: "${activityName}"`,
                {
                    accepted,
                    projectHash: activityId,
                    projectName: activityName,// unused
                    ownerAddress,
                    workerAddress,
                },
                err => resolver(err)
            ]
        }
        const queueProps = queueables
            .worker
            .accept(
                activityId,
                workerAddress,
                accepted,
                {
                    title,
                    description,
                    notificationId,
                    then: success => {
                        remove(notificationId)
                        !shouldNotify && resolver(!success)
                    },
                    next,
                },
            )

        const confirmed = await confirmAsPromise({
            confirmButton: {
                content: actionStr,
                positive: accepted,
                negative: !accepted,
            },
            size: 'mini',
        }, confirmId)
        if (!confirmed) return resolver()

        addToQueue(
            queueProps,
            // resolve when queueItem is completes execution (success/error)
            status => resolver(status !== 'success'),
        )
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
        // partner responded to invition to join activity team
        childType: TK_ChildTypes.invitationResponse,
        handler: (_id, notification, { senderIdBtn }) => {
            const { data } = notification
            const {
                accepted,
                projectHash: activityId,
                workerAddress,
            } = data || {}
            const ownerAddress = findIdentity(workerAddress)?.address
            const item = { icon: 'clock outline' }
            const msg = accepted
                ? textsCap.tkInviteAcceptMsg
                : textsCap.tkInviteRejectMsg
            const render = activity => (
                <span>
                    <Button {...{
                        icon: 'eye',
                        onClick: e => {
                            e?.stopPropagation?.()
                            return ActivityDetails.asModal({
                                activityId,
                                ownerAddress,
                                workerAddress
                            })
                        },
                        size: 'mini',
                        title: textsCap.viewActivity,
                    }} />
                    {' ' + activity.name}
                </span>
            )
            item.content = (
                <div>
                    {senderIdBtn}
                    {` ${msg}:`}
                    <div style={{ fontWeight: 'bold' }}>
                        <ActivityName {...{ activityId, render }} />
                    </div>
                </div>
            )
            return item
        },
        type: TK_TYPE,
    }
].forEach(x =>
    setItemViewHandler(
        x.type,
        x.childType,
        x.handler
    )
))