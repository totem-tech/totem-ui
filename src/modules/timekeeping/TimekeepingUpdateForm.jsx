import PropTypes from 'prop-types'
import React from 'react'
import { BehaviorSubject } from 'rxjs'
import FormBuilder, { fillValues, findInput } from '../../components/FormBuilder'
import { translated } from '../../utils/languageHelper'
import { useRxState } from '../../utils/reactjs'
import {
    DURATION_ZERO,
    durationToBlockCount,
    query,
    statuses
} from './timekeeping'
import { handleSubmitTime, validateDuration } from './TimekeepingForm'

const textsCap = {
    errRecordNotFound: 'record not found',
    msgSaveAsDraft: 'saving as draft will not submit the record for approval. You will have to submit it for approval at your convenience.',

    activity: 'activity',
    close: 'close',
    duration: 'duration',
    error: 'error',
    identity: 'identity',
    no: 'no',
    project: 'project',
    proceed: 'proceed',
    start: 'start',
    stop: 'stop',
    submit: 'submit',
    success: 'success',
    timekeeping: 'timekeeping',
    unknown: 'unknown',
    update: 'update',
    yes: 'yes',
    wallet: 'wallet',

    activityOwner: 'activity owner',
    addedToQueue: 'added to queue',
    areYouSure: 'are you sure?',
    blockEnd: 'end block',
    blockStart: 'start block',
    cancelWarning: 'you have a running timer. Would you like to stop and exit?',
    checkingProjectStatus: 'checking activity status...',
    errRejectedDurationUnchanged: 'rejected record requires duration change in order to re-sumbit',
    finishedAt: 'finished at',
    goBack: 'go Back',
    inactiveWorkerHeader1: 'you are not part of this Team! Request an invitation',
    inactiveWorkerHeader2: 'action required',
    inactiveWorkerMsg1: 'please select an activity you have been invited to and already accepted.',
    inactiveWorkerMsg3: 'you are yet to accept or reject invitation to join this activity team.',
    inactiveProjectSelected: 'this Activity is inactive!',
    invalidDuration: 'invalid duration',
    invalidDurationMsgPart1: 'please enter a valid duration using the following format:',
    manuallyEnterDuration: 'manually enter duration',
    newRecord: 'new Record',
    noContinueTimer: 'no, continue timer',
    noProjectsMsg: 'create a new activity or ask to be invited to the Team',
    numberOfBlocks: 'number of blocks',
    numberOfBreaks: 'number of breaks',
    permissionDenied: 'permission denied',
    requestQueuedMsg1: 'request has been added to queue.',
    requestQueuedMsg2: 'you will be notified of the progress shortly.',
    resetTimer: 'reset the Timer',
    // resetTimerWarning: 'you are about to reset your timer.',
    resumeTimer: 'resume the timer',
    resumeTimeWarning: 'would you like to resume timekeeping on this activity?',
    selectAProject: 'select an Activity',
    selectActiveProject: 'please select an active Activity',
    saveAsDraft: 'save as draft',
    startedAt: 'started at',
    submitForApproval: 'submit for approval',
    submitConfirmationMsg: 'please verify the following information and click "Proceed" to submit your time record',
    submitTime: 'submit time',
    timerStarted: 'timer started',
    timerRunningMsg1: 'you may now close the dialog.',
    timerRunningMsg2: 'return here at anytime by clicking on the clock icon in the header.',
    transactionFailed: 'blockchain transaction failed!',
    updateFormHeader: 'update Record',
    workerBannedMsg: 'permission denied',
}
translated(textsCap, true)

const inputNames = {
    duration: 'duration',
    manualEntry: 'manualEntry',
    submitStatus: 'submit_status'
}

const TimekeepingUpdateForm = props => {
    const [state] = useRxState(getInitialState(props))

    return <FormBuilder {...{ ...props, ...state }} />
}
export default TimekeepingUpdateForm
TimekeepingUpdateForm.defaultProps = {
    closeText: textsCap.close,
    closeOnEscape: false,
    closeOnDimmerClick: false,
    header: `${textsCap.timekeeping} - ${textsCap.updateFormHeader}`,
    size: 'tiny',
    submitText: textsCap.update,
}
TimekeepingUpdateForm.inputNames = inputNames
TimekeepingUpdateForm.propTypes = {
    activityId: PropTypes.string.isRequired,
    activityName: PropTypes.string.isRequired,
    recordId: PropTypes.string.isRequired,
    // record values
    values: PropTypes.shape({
        blockCount: PropTypes.number.isRequired,
        blockEnd: PropTypes.number.isRequired,
        blockStart: PropTypes.number.isRequired,
        duration: PropTypes.string.isRequired,
        status: PropTypes.number.isRequired,
        workerAddress: PropTypes.string.isRequired,
    }).isRequired
}
const getInitialState = props => rxState => {
    const { values = {} } = props
    const inputs = [
        {
            label: textsCap.duration,
            name: inputNames.duration,
            type: 'text',
            required: true,
            rxValue: new BehaviorSubject(DURATION_ZERO),
            validate: _handleValidateDuration(props),
        },
        {
            hidden: true,
            name: inputNames.manualEntry,
            value: true,
        },
        {
            inline: true,
            name: inputNames.submitStatus,
            options: [
                {
                    label: textsCap.saveAsDraft,
                    value: statuses.draft,
                },
                {
                    label: textsCap.submitForApproval,
                    value: statuses.submit,
                }
            ],
            // manually trigger validation of duration
            onChange: handleStatusChange(rxState),
            required: true,
            type: 'radio-group',
        },
    ]
    const state = {
        ...props,
        inputs: fillValues(
            inputs,
            values,
            true
        ),
        onSubmit: handleSubmit(props, rxState),
        values: values,
    }
    return state
}

const handleStatusChange = rxState => (_, values) => {
    const { inputs = [] } = rxState.value
    const statusIn = findInput(inputs, inputNames.submitStatus)
    const status = values[inputNames.submitStatus]
    statusIn.message = status === statuses.draft && {
        content: textsCap.msgSaveAsDraft,
    }

    const durationIn = findInput(inputs, inputNames.duration)
    const duration = values[inputNames.duration]
    durationIn.rxValue.next('')
    setTimeout(() => durationIn.rxValue.next(duration))
}

const handleSubmit = (props, rxState) => async (_, formValues) => {
    const duration = formValues[inputNames.duration]
    const submitStatus = formValues[inputNames.submitStatus]
    const {
        activityId,
        activityName,
        recordId,
        values
    } = props
    const blockCount = durationToBlockCount(duration)
    const blockEnd = values.blockStart + blockCount
    const record = await query.record.get(recordId)
    if (!record) throw new Error(textsCap.errRecordNotFound)

    const { nr_of_breaks, reason_code } = record
    const newValues = {
        ...values,
        blockCount,
        blockEnd,
        breakCount: nr_of_breaks || 0,
        duration,
    }
    await handleSubmitTime(
        props,
        rxState,
        activityId,
        recordId,
        activityName,
        newValues,
        submitStatus,
        reason_code,
    )
}

// validate duration and also check if duration has change
const _handleValidateDuration = props => (e, _, values) => {
    let err = validateDuration(e, _, values)
    if (err) return err

    // require a value change if record was rejected or setting back to draft
    const duration = values[inputNames.duration]
    const newStatus = values[inputNames.submitStatus]
    const {
        values: valuesOrg
    } = props
    const durationOriginal = valuesOrg[inputNames.duration]
    const currentStatus = valuesOrg.status
    const isChanged = duration !== durationOriginal
    const isRejected = currentStatus === statuses.reject
    const requireChange = isRejected || newStatus === statuses.draft
    const invalid = !isChanged && requireChange
    err = !invalid
        ? false
        : !isRejected
            ? true
            : {
                content: textsCap.errRejectedDurationUnchanged,
                status: 'error',
            }
    return err
}