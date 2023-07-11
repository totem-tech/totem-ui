import PropTypes from 'prop-types'
import React from 'react'
import { BehaviorSubject } from 'rxjs'
import { Button } from 'semantic-ui-react'
import FormBuilder, { findInput, fillValues } from '../../components/FormBuilder'
import { showForm } from '../../services/modal'
import { addToQueue, QUEUE_TYPES } from '../../services/queue'
import { translated } from '../../utils/languageHelper'
import { useRxState } from '../../utils/reactjs'
import {
    isFn,
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
    addedToQueueDesc: 'invitation request has been added to background queue',
    addedToQueue: 'added to queue',
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

    return <FormBuilder {...{ ...props, ...state }} />
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
        submitDisabled: { workerAddress: false },
        loading: false,
        message: {},
        onSubmit: handleSubmit(
            props,
            rxState,
            rxActivities
        ),
        success: false,
        inputs: fillValues(inputs, values),
    }
    return state
}

const handleSubmit = (
    props,
    rxState,
    rxActivities
) => (e, values) => {
    const { onSubmit } = props
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
    rxState.next({
        submitInProgress: true,
        loading: true,
        message: {
            content: textsCap.addedToQueueDesc,
            header: textsCap.addedToQueue,
            icon: true,
            status: 'loading'
        }
    })

    // display/update self invite status message
    const updateSelfInviteMsg = skipOnSuccess => success => {
        // update message when 
        if (skipOnSuccess && success) return
        rxState.next({
            submitInProgress: false,
            loading: false,
            success,
            message: {
                header: success
                    ? textsCap.invitedAndAccepted
                    : textsCap.txFailed,
                icon: true,
                status: success
                    ? 'success'
                    : 'error'
            }
        })
        isFn(onSubmit) && onSubmit(success, values)
        // trigger an update of list of timekeeping projects
        rxForceUpdate.next(workerAddress)
    }
    // queue itme to accept invitation of own identity
    const acceptInvitationTask = queueables.worker.accept(
        activityId,
        workerAddress,
        true,
        {
            title: textsCap.queueTitleOwnAccept,
            description: `${textsCap.identity}: ${name}`,
            then: updateSelfInviteMsg(),
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
            err => {
                rxState.next({
                    submitInProgress: false,
                    loading: false,
                    success: !err,
                    message: {
                        header: !err
                            ? textsCap.inviteSuccess
                            : textsCap.inviteSuccessNotifyFailed,
                        content: err || '',
                        icon: true,
                        status: !err
                            ? 'success'
                            : 'warning',
                    }
                })
                isFn(onSubmit) && onSubmit(!err, values)
            }
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
            then: isSelfInvite
                ? updateSelfInviteMsg(true)
                : (success, err) => {
                    if (success) return
                    rxState.next({
                        submitInProgress: false,
                        loading: false,
                        message: {
                            header: textsCap.txFailed,
                            content: `${err}`,
                            icon: true,
                            status: 'error',
                        }
                    })
                },
            next: isSelfInvite
                ? null
                : isWorker
                    ? acceptInvitationTask
                    : notifyWorkerTask,
        }
    )
    addToQueue(inviteWorkerTask)
}

const validateWorker = rxState => async (_, { value }, values) => {
    const workerAddress = value
    if (!workerAddress) return

    const { inputs, submitDisabled } = rxState.value
    const activityId = values[inputNames.activityId]
    const partnerIn = findInput(inputs, inputNames.workerAddress)
    const partner = partners.get(workerAddress)
    const { userId } = partner || {}
    // do not require user id if selected address belongs to user
    const missingUserId = !identities.get(workerAddress) && !userId
    partnerIn.loading = !!activityId && !missingUserId
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
                                const { rxValue } = partnerIn
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
    if (!partnerIn.loading) return

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
    partnerIn.loading = false
    // allows (re-)invitation if user hasn't accepted (!== true) invitation
    return (accepted || invited) && {
        content: accepted
            ? textsCap.partnerAcceptedInvite
            : textsCap.partnerInvited,
        status: accepted
            ? 'error'
            : 'warning'
    }
}