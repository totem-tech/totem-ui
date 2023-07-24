import PropTypes from 'prop-types'
import React from 'react'
import { BehaviorSubject } from 'rxjs'
import { Button } from 'semantic-ui-react'
import FormBuilder, { findInput, fillValues } from '../../components/FormBuilder'
import { showForm } from '../../services/modal'
import {
    addToQueue,
    QUEUE_TYPES,
    statuses
} from '../../services/queue'
import { translated } from '../../utils/languageHelper'
import { useQueueItemStatus, useRxState } from '../../utils/reactjs'
import {
    arrSort,
    textEllipsis,
    deferred
} from '../../utils/utils'
import { openStatuses } from '../activity/activity'
import useActivities, { rxForceUpdate } from '../activity/useActivities'
import identities from '../identity/identity'
import partners, { rxPartners } from '../partner/partner'
import PartnerForm from '../partner/PartnerForm'
import getPartnerOptions from '../partner/getPartnerOptions'
import { query, queueables } from './timekeeping'

const notificationType = 'timekeeping'
const childType = 'invitation'
const textsCap = {
    identity: 'identity',
    invite: 'invite',
    invitee: 'invitee',
    partner: 'partner',
    activity: 'activity',
    activityLabel: 'select an activity',
    addPartner: 'add new partner',
    close: 'close',
    formHeader: 'Timekeeping - invitation to join the Team',
    invitedAndAccepted: 'your identity has been successfully added to the Activity as team member.',
    inviteSuccess: 'invitation sent!',
    inviteSuccessNotifyFailed: 'invitation sent but failed to notify user!',
    partnerAcceptedInvite: 'partner already accepted an invitation to the selected activity',
    partnerInvited: 'partner has already been invited to the selected activity',
    partnerLabel: 'select a partner',
    partnerUserIdWarning: 'selected partner does not include an User ID.',
    queueTitleOwnAccept: 'Timekeeping - accept own invitation',
    txFailed: 'transaction failed',
    updateParner: 'update Partner',
    zeroActivityWarning: 'no activities available',
}
translated(textsCap, true)

export const inputNames = {
    activityId: 'activityId',
    addpartner: 'addpartner',
    workerAddress: 'workerAddress',
}

const TimeKeepingInviteForm = props => {
    const { activityId } = props
    const rxActivities = useActivities({ activityId, subjectOnly: true })
    const [state] = useRxState(getInitialState(props, rxActivities))
    const { message, rxQueueId } = state
    const queueStatus = useQueueItemStatus(rxQueueId)

    return (
        <FormBuilder {...{
            ...props,
            ...state,
            message: queueStatus || message
        }} />
    )
}
export default TimeKeepingInviteForm
TimeKeepingInviteForm.defaultProps = {
    closeText: textsCap.close,
    header: textsCap.formHeader,
    size: 'tiny',
    submitText: textsCap.invite,
}
TimeKeepingInviteForm.inputNames = inputNames
TimeKeepingInviteForm.propTypes = {
    values: PropTypes.shape({
        activityId: PropTypes.string,
        userIds: PropTypes.array,
        workerAddress: PropTypes.string,
    })
}

const getInitialState = (props, rxActivities) => rxState => {
    const { values } = props
    values.activityId ??= values.projectHash
    const rxWorker = new BehaviorSubject()
    const inputs = [
        {
            label: textsCap.activity,
            name: inputNames.activityId,
            options: [],
            placeholder: textsCap.activityLabel,
            required: true,
            rxOptions: rxActivities,
            rxOptionsModifier: (activities = new Map()) => {
                if (!activities.size) return [{
                    key: 'empty',
                    text: textsCap.zeroActivityWarning,
                    value: '',
                }]
                return arrSort(
                    Array.from(activities)
                        // include only active (open/reopened) projects
                        .filter(([_, { status }]) => openStatuses.includes(status))
                        .map(([activityId, activity]) => ({
                            activity,
                            key: activityId,
                            text: activity.name || textEllipsis(activityId, 40),
                            value: activityId,
                        })),
                    'text'
                )
            },
            search: true,
            selection: true,
            type: 'dropdown',
            value: '',
        },
        {
            label: textsCap.partner,
            name: inputNames.workerAddress,
            options: [],
            placeholder: textsCap.partnerLabel,
            required: true,
            rxOptions: rxPartners,
            rxOptionsModifier: partners => getPartnerOptions(
                partners,
                {
                    // trigger re-validation of worker address whenever partner is updated from the options
                    onSubmit: deferred((ok, values) => {
                        const address = rxWorker.value
                        // ignore if not selected worker address
                        if (values.address !== address) return
                        // trigger re-evaluation
                        rxWorker.next('')

                        setTimeout(() => rxWorker.next(`${address}`), 100)
                    }, 200)
                },
                true
            ),
            rxValue: rxWorker,
            search: ['keywords'],
            selection: true,
            type: 'dropdown',
            validate: validateWorker(rxState),
        },
        {
            content: textsCap.addPartner,
            icon: 'plus',
            name: inputNames.addpartner,
            onClick: () => showForm(PartnerForm, {
                // once partner created update the input with newly created partner's address
                onSubmit: (ok, { address }) => ok && rxWorker.next(address)
            }),
            fluid: true,
            type: 'button',
        },
    ]
    const state = {
        inputs: fillValues(inputs, values),
        onSubmit: handleSubmit(
            props,
            rxState,
            rxActivities
        ),
        rxQueueId: new BehaviorSubject(),
        submitDisabled: { workerAddress: false },
    }
    return state
}

const handleSubmit = (
    props,
    rxState,
    rxActivities
) => async (_e, values) => {
    const { onSubmit } = props
    const { rxQueueId } = rxState.value
    const {
        activityId,
        workerAddress
    } = values
    const activity = rxActivities.value?.get?.(activityId)
    if (!activity) return

    const {
        name: activityName,
        ownerAddress
    } = activity
    const workerIdentity = identities.get(workerAddress)
    const isWorker = !!workerIdentity
    // activity owner is also the worker
    const isSelfInvite = isWorker && workerAddress === ownerAddress
    const { name, userId } = workerIdentity
        || partners.get(workerAddress)
    rxState.next({ submitInProgress: true })

    // queue itme to accept invitation of own identity
    const acceptInvitationTask = queueables.worker.accept(
        activityId,
        workerAddress,
        true,
        {
            title: textsCap.queueTitleOwnAccept,
            description: `${textsCap.identity}: ${name}`,
        }
    )

    // mesaging service request to send a notification to worker+partner (if not self)
    const notifyWorkerTask = {
        type: QUEUE_TYPES.CHATCLIENT,
        func: 'notify',
        args: [
            [userId],
            notificationType,
            childType,
            null,
            {
                projectHash: activityId,
                projectName: activityName,
                workerAddress
            },
        ],
    }

    // queue item to invite worker (self or partner)
    const inviteWorkerTask = queueables.worker.add(
        activityId,
        ownerAddress,
        workerAddress,
        {
            title: textsCap.formHeader,
            description: `${textsCap.invitee}: ${name}`,
            next: isSelfInvite
                ? null // runtime will aceept the invitation automatically
                : isWorker
                    ? acceptInvitationTask
                    : notifyWorkerTask,
        }
    )
    const onComplete = status => {
        const success = status === statuses.SUCCESS
        onSubmit?.(success, values)

        rxState.next({
            submitInProgress: false,
            success,
        })
        // trigger an update of list of Activities for the worker address
        rxForceUpdate.next(workerAddress)
    }
    // add to queue and set queue ID to display item status
    rxQueueId.next(addToQueue(inviteWorkerTask, onComplete))
}

const validateWorker = rxState => async (_, { value }, values) => {
    const workerAddress = value
    if (!workerAddress) return

    const { inputs, submitDisabled } = rxState.value
    const activityId = values[inputNames.activityId]
    const workerIn = findInput(inputs, inputNames.workerAddress)
    const partner = partners.get(workerAddress)
    const { userId } = partner || {}
    // do not require user id if selected address belongs to user
    const missingUserId = !identities.get(workerAddress) && !userId
    workerIn.loading = !!activityId && !missingUserId
    if (missingUserId) return {
        content: (
            <p>
                {textsCap.partnerUserIdWarning} <br />
                <Button {...{
                    basic: true,
                    content: textsCap.updateParner,
                    onClick: e => {
                        e.preventDefault()
                        showForm(PartnerForm, {
                            onSubmit: (_, { address, userId }) => {
                                if (!userId) return
                                const { rxValue } = workerIn
                                rxValue.next('')
                                setTimeout(() => rxValue.next(`${address}`), 500)
                            },
                            values: partner,
                        })
                    },
                }} />
            </p>
        ),
        status: 'error'
    }
    if (!workerIn.loading) return

    // disable submit button
    submitDisabled.workerAddress = true
    // check if partner is already invited or accepted
    const [invitedAr, acceptedAr] = await Promise
        .all([
            query.worker.listInvited(activityId),
            query.worker.listWorkers(activityId),
        ])
        .finally(() => submitDisabled.workerAddress = false)

    const accepted = acceptedAr.includes(workerAddress)
    const invited = invitedAr.includes(workerAddress)
    /*
     * accepted values:
     * null => not yet invited or rejected
     * true => invited and already accepted
     * false => invited but hasn't responded
     */
    workerIn.loading = false
    // allows (re-)invitation if user hasn't accepted (!== true) invitation
    const msg = (accepted || invited) && {
        content: accepted
            ? textsCap.partnerAcceptedInvite
            : textsCap.partnerInvited,
        status: accepted
            ? 'error'
            : 'warning' //'info',//'warning',
    }
    return msg
}