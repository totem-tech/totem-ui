import PropTypes from 'prop-types'
import React from 'react'
import { BehaviorSubject } from 'rxjs'
import { Button } from 'semantic-ui-react'
import { ButtonAcceptOrReject } from '../../components/buttons'
import FormBuilder, { fillValues, findInput } from '../../components/FormBuilder'
import DataTableVertical from '../../components/DataTableVertical'
import { rxBlockNumber } from '../../services/blockchain'
import { translated } from '../../utils/languageHelper'
import { confirm, confirmAsPromise } from '../../services/modal'
import { addToQueue } from '../../services/queue'
import { useRxState } from '../../utils/reactjs'
import {
    BLOCK_DURATION_SECONDS,
    BLOCK_DURATION_REGEX,
    durationToSeconds,
    secondsToDuration,
    blockToDate,
    dateToBlock,
} from '../../utils/time'
import {
    deferred,
    hasValue,
    isDefined,
    isFn,
    objClean,
    objWithoutKeys,
} from '../../utils/utils'
import { openStatuses, query as actQuery } from '../activity/activity'
import { getSelected } from '../identity/identity'
import AddressName from '../partner/AddressName'
import {
    timerFormValues,
    NEW_RECORD_HASH,
    query,
    queueables,
    statuses,
} from './timekeeping'
import { handleInvitation } from './notificationHandlers'
import { getIdentityOptions } from '../identity/getIdentityOptions'
import { subjectAsPromise } from '../../utils/reactjs'
import useTkActivities from './useTKActivities'

const textsCap = {
    activity: 'activity',
    close: 'close',
    duration: 'duration',
    error: 'error',
    identity: 'identity',
    no: 'no',
    proceed: 'proceed',
    start: 'start',
    stop: 'stop',
    submit: 'submit',
    success: 'success',
    timekeeping: 'timekeeping',
    yes: 'yes',
    wallet: 'wallet',

    activityOwner: 'activity owner',
    addedToQueue: 'added to queue',
    areYouSure: 'are you sure?',
    blockEnd: 'end block',
    blockStart: 'start block',
    cancelWarning: 'you have a running timer. Would you like to stop and exit?',
    checkingActivityStatus: 'checking activity status...',
    errRejectedDurationUnchanged: 'rejected record requires duration change in order to re-sumbit',
    finishedAt: 'finished at',
    goBack: 'go Back',
    inactiveActivitySelected: 'this Activity is no longer open!',
    inactiveWorkerHeader1: 'you are not part of this Team! Request an invitation',
    inactiveWorkerHeader2: 'action required',
    inactiveWorkerMsg1: 'please select an activity you have been invited to and already accepted.',
    inactiveWorkerMsg3: 'you are yet to accept or reject invitation to join this activity team.',
    invalidDuration: 'invalid duration',
    invalidDurationMsgPart1: 'please enter a valid duration using the following format:',
    manuallyEnterDuration: 'manually enter duration',
    msgSubmitted: 'your time record has been submitted for approval',
    msgSavedAsDraft: 'your time record has been saved as draft',
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
    selectActivity: 'select an Activity',
    selectOpenActivity: 'please select an open Activity',
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

export const DURATION_ZERO = '00:00:00'

export const inputNames = {
    activityId: 'projectHash',
    duration: 'duration',
    manualEntry: 'manualEntry',
    seconds: 'seconds',
    workerAddress: 'workerAddress',
}

const TimekeepingForm = React.memo(props => {
    const rxActivities = useTkActivities({ subjectOnly: true })
    const [state, setState, rxState] = useRxState(
        getInitialState(props, rxActivities),
        {
            onUnmount: rxState => rxState?.value?.stopCount?.()
        }
    )

    const { closeText: closeTextP, onClose } = props
    let {
        closeText,
        inputs,
        message,
        values
    } = state
    const {
        duration,
        stopped,
        inprogress,
        manualEntry
    } = values
    const durationValid = values
        && BLOCK_DURATION_REGEX.test(duration)
        && duration !== DURATION_ZERO
    const done = stopped || manualEntry
    const duraIn = inputs.find(x => x.name === 'duration')
    const btnStyle = {
        margin: '3px 3px 15px',
        width: 'calc( 50% - 12px )',
    }
    const doneItems = ['workerAddress', 'reset']
    inputs.filter(x => doneItems.indexOf(x.name) >= 0)
        .forEach(x => x.hidden = !done)
    const activityIdIn = inputs.find(x =>
        x.name === inputNames.activityId
    )
    activityIdIn.disabled = inprogress
    duraIn.icon = manualEntry
        ? 'pencil'
        : null
    // Show resume item when timer is stopped
    duraIn.action = !stopped || manualEntry
        ? undefined
        : {
            icon: 'play',
            // prevents annoying HTML form validation warnings from showing up when clicked
            formNoValidate: true,
            onClick: () => confirm({
                header: textsCap.resumeTimer,
                content: textsCap.resumeTimeWarning,
                onConfirm: handleResume(rxState),
                confirmButton: textsCap.yes,
                cancelButton: textsCap.no,
                size: 'mini',
            }),
            title: textsCap.resumeTimer,
        }

    const closeBtn = (
        <Button
            content={closeText || closeTextP}
            size='massive'
            style={btnStyle}
            onClick={(e, d) => {
                const {
                    values: {
                        inprogress
                    } = {},
                } = state
                const doCancel = () => {
                    handleReset(rxState, false)
                    isFn(onClose) && onClose(e, d)
                }
                if (!inprogress) return doCancel()

                confirm({
                    cancelButton: textsCap.noContinueTimer,
                    confirmButton: textsCap.yes,
                    content: textsCap.cancelWarning,
                    header: textsCap.areYouSure,
                    onConfirm: doCancel,
                    size: 'tiny'
                })
            }}
        />
    )
    const icon = {
        loading: inprogress,
        name: !inprogress
            ? done
                ? 'thumbs up'
                : 'play'
            : 'clock outline',
    }

    message = !inprogress
        ? message
        : {
            content: `${textsCap.timerRunningMsg1} ${textsCap.timerRunningMsg2}`,
            header: textsCap.timerStarted,
            icon: true,
            status: 'info'
        }
    return (
        <FormBuilder {...{
            ...props,
            ...state,
            closeText: closeBtn,
            inputs,
            message,
            onChange: deferred((_, formValues) => rxState.next({
                values: {
                    ...rxState?.value?.values,
                    ...formValues,
                }
            }), 100),
            onSubmit: (...args) => inprogress
                ? handlePauseTimer(rxState)
                : done
                    ? handleSubmit(
                        props,
                        rxState,
                        rxActivities
                    )(...args)
                    : handleStartTimer(rxState),
            submitText: {
                content: !inprogress
                    ? done
                        ? textsCap.submit
                        : textsCap.start
                    : textsCap.stop,
                icon: {
                    ...icon,
                    style: {
                        fontSize: 25,
                        height: 25,
                        width: 25,

                    }
                },
                disabled: (manualEntry || stopped) && !durationValid
                    ? true
                    : undefined,
                positive: !inprogress,
                color: inprogress
                    ? 'grey'
                    : undefined,
                size: 'massive',
                style: btnStyle,
            },
        }} />
    )
})
TimekeepingForm.defaultProps = {
    closeOnEscape: true,
    closeOnDimmerClick: true,
    header: textsCap.timekeeping,
    // prevents multiple modal being open
    modalId: 'TimekeepingForm',
    size: 'tiny',
}
TimekeepingForm.propTypes = {
    activityId: PropTypes.string,
    projectHash: PropTypes.string, // ToDo: deprecated
}
export default TimekeepingForm

const getInitialState = (props, rxActivities) => rxState => {
    const {
        projectHash: pph,
        activityId: pActivityId = pph
    } = props
    const values = timerFormValues() || {}
    const {
        projectHash, // to be deprecated
        activityId = projectHash,
        breakCount,
        duration,
        durationValid,
        inprogress,
        tsStarted,
        workerAddress
    } = values
    values.durationValid = !isDefined(durationValid) || durationValid
    values.duration = duration || DURATION_ZERO
    values.breakCount = (breakCount || 0)
    values.workerAddress = workerAddress || getSelected().address
    values.projectHash = !!pActivityId && !inprogress
        ? pActivityId
        : activityId


    const rxManualEntry = new BehaviorSubject()
    const rxDuration = new BehaviorSubject()
    // seconds counter
    const rxSeconds = new BehaviorSubject(
        !tsStarted
            ? 0
            : (new Date() - new Date(tsStarted)) / 1000
    )
    let intervalId
    const startCount = reset => {
        stopCount(reset)
        intervalId = setInterval(
            () => rxSeconds.next(rxSeconds.value + 1),
            1000
        )
    }
    const stopCount = reset => {
        clearInterval(intervalId)
        reset && rxSeconds.next(0)
    }

    const inputs = [
        {
            clearable: true,
            disabled: !!pActivityId,
            label: textsCap.activity,
            name: inputNames.activityId,
            onChange: handleActivityChange(rxState),
            options: [],
            placeholder: textsCap.selectActivity,
            required: true,
            rxOptions: rxActivities,
            rxOptionsModifier: (activities = new Map()) => {
                const { inputs, loading } = rxState.value
                const activityIn = findInput(inputs, inputNames.activityId)
                const options = Array
                    .from(activities)
                    .map(([activityId, activity]) => {
                        const {
                            name,
                            ownerAddress,
                            userId
                        } = activity
                        return {
                            description: (
                                <AddressName {...{
                                    address: ownerAddress,
                                    title: textsCap.activityOwner,
                                    userId,
                                }} />
                            ),
                            key: activityId,
                            project: activity,
                            search: [
                                name,
                                activityId,
                                userId,
                                ownerAddress,
                            ].join(' '),
                            text: name,
                            value: activityId,
                        }
                    })
                activityIn.noResultsMessage = options.length === 0
                    ? textsCap.noProjectsMsg
                    : undefined

                // pre-select activity
                rxState.prefillDone ??= !!activityIn.rxValue.value
                const shouldFill = !rxState.prefillDone && !!activities.get(activityId)
                if (shouldFill) {
                    rxState.prefillDone = true
                    activityIn?.rxValue?.next(activityId)
                }
                // hide form loading spinner
                loading
                    && activities.loaded
                    && setTimeout(() => rxState.next({ loading: false }))
                return options
            },
            rxValue: new BehaviorSubject(),
            search: ['search'],
            selection: true,
            selectOnNavigation: false,
            type: 'dropdown',
        },
        {
            label: textsCap.identity,
            name: inputNames.workerAddress,
            options: [],
            required: true,
            rxValue: new BehaviorSubject(),
            search: ['keywords'],
            selection: true,
            type: 'dropdown',
            value: '',
        },
        {
            hidden: true,
            name: inputNames.seconds,
            onChange: () => {
                if (rxManualEntry.value) return
                const duration = secondsToDuration(rxSeconds.value)
                rxDuration.next(duration)
            },
            rxValue: rxSeconds,
        },
        {
            autoComplete: 'off',
            label: textsCap.duration,
            labelDetails: 'hh:mm:ss',
            name: inputNames.duration,
            onChange: (_, values) => {
                if (!values[inputNames.manualEntry]) return
                const duration = values[inputNames.duration]
                rxSeconds.next(
                    durationToSeconds(duration) || 0
                )
            },
            placeholder: 'hh:mm:ss',
            readOnly: values => !values[inputNames.manualEntry],
            rxValue: rxDuration,
            type: 'text',
            validate: handleValidateDuration,
        },
        {
            disabled: !!values.inprogress,
            multiple: false,
            name: inputNames.manualEntry,
            options: [{
                label: textsCap.manuallyEnterDuration,
                value: true
            }],
            required: false,
            rxValue: rxManualEntry,
            type: 'checkbox-group',
        },
    ]
    const state = {
        inputs: fillValues(
            inputs,
            // activityId to be filled after fetching activityId options.
            // otherwise, it will be emptied by FormInput because the option is not immediately available
            objWithoutKeys(
                values,
                [inputNames.activityId]
            ),
            false,
            false,
        ),
        // set loading status until activity options are loaded
        loading: true,
        startCount,
        stopCount,
        submitDisabled: false,
        values,
    }

    // resume on start??
    inprogress
        && tsStarted
        && setTimeout(() => handleResume(rxState), 100)
    return state
}

// check if project is active (status = open or reopened)
const handleActivityChange = rxState => async (_, values, index) => {
    let {
        projectHash: activityId,
        workerAddress = getSelected()?.address
    } = values
    // no activity has been selected
    if (!activityId) return

    const { inputs = [] } = rxState.value
    const activityIn = findInput(inputs, inputNames.activityId)
    if (!activityIn) return

    const isValidActivity = activityIn
        ?.rxOptions
        ?.value
        ?.get(activityId)
    // activity non-existent in the options
    if (!isValidActivity) return activityIn.rxValue?.next(null)

    activityIn.loading = true
    activityIn.message = {
        content: textsCap.checkingActivityStatus,
        icon: true,
        status: 'loading',
    }
    rxState.next({ inputs, submitDisabled: true })

    // check if project status is open/reopened
    const statusCode = await actQuery.status(activityId)
    // Activity open status
    const isOpen = openStatuses.includes(statusCode)
    activityIn.invalid = !isOpen
    activityIn.message = !isOpen && {
        content: textsCap.selectOpenActivity,
        header: textsCap.inactiveActivitySelected,
        icon: true,
        status: 'error',
    }
    if (!isOpen) {
        // project is not active anymore
        activityIn.loading = false
        return rxState.next({ inputs, submitDisabled: false })
    }

    // check worker ban and invitation status
    const [
        banned,
        invitedAr,
        acceptedAr
    ] = await Promise.all([
        query.worker.banned(activityId, workerAddress),
        query.worker.listInvited(activityId),
        query.worker.listWorkers(activityId),
    ])
    const invited = invitedAr.includes(workerAddress)
    const accepted = acceptedAr.includes(workerAddress)
    activityIn.loading = false
    activityIn.invalid = !!banned || !accepted

    if (banned) {
        // user has been banned by activity owner
        activityIn.message = {
            content: textsCap.workerBannedMsg,
            icon: true,
            status: 'error',
        }
        return rxState.next({ inputs, submitDisabled: false })
    }

    activityIn.message = !accepted && {
        content: !invited
            ? textsCap.inactiveWorkerMsg1
            // user has been invited to the activity and yet to accept the inivitation
            : (
                <div>
                    {textsCap.inactiveWorkerMsg3} <br />
                    <ButtonAcceptOrReject
                        onAction={async (_, accepted) => {
                            const success = await handleInvitation(
                                activityId,
                                workerAddress,
                                accepted
                            )
                            // force trigger change
                            success && activityIn.rxValue?.next(activityId)
                        }}
                        style={{ marginTop: 10 }}
                    />
                </div>
            ),
        header: invited
            ? textsCap.inactiveWorkerHeader2
            : textsCap.inactiveWorkerHeader1,
        icon: true,
        status: 'error',
    }
    await setIdentityOptions(
        rxState,
        activityId,
        workerAddress
    )
    rxState.next({
        inputs,
        submitDisabled: false,
    })
}

const handleReset = async (rxState, userInitiated) => {
    const {
        inputs = [],
        values = {}
    } = rxState.value
    const { tsStarted } = values
    const doConfirm = userInitiated && tsStarted
    const confirmed = !doConfirm || await confirmAsPromise({
        header: textsCap.resetTimer,
        // content: textsCap.resetTimeWarning,
        onConfirm: reset,
        confirmButton: textsCap.yes,
        cancelButton: textsCap.no,
        size: 'mini'
    })
    if (!confirmed) return

    if (userInitiated) {
        values.inprogress = false
        values.stopped = false
        values.breakCount = 0
        values[inputNames.seconds] = 0
        delete values.tsStarted
        delete values.tsStopped
        values[inputNames.manualEntry] = false
        values[inputNames.duration] = DURATION_ZERO

        rxState.next({
            inputs: fillValues(
                inputs,
                values,
                true
            ),
            values,
        })
    }
    // remove all unnecessary values
    timerFormValues(null)
    timerFormValues(
        objClean(
            values,
            [
                inputNames.workerAddress,
                inputNames.activityId,
            ]
        )
    )
}

const handleResume = rxState => () => {
    const {
        inputs,
        startCount,
        values
    } = rxState.value
    values.inprogress = true
    values.stopped = false
    values.manualEntry = undefined
    values.breakCount++
    const meIn = inputs.find(x => x.name === inputNames.manualEntry)
    meIn.defaultChecked = false
    meIn.disabled = true
    rxState.next({ inputs, values })
    startCount?.()
    timerFormValues(values)
}

const handleStartTimer = rxState => {
    const {
        inputs,
        startCount,
        values
    } = rxState.value
    const manualEntryIn = findInput(inputs, inputNames.manualEntry)
    const duraIn = findInput(inputs, inputNames.duration)
    manualEntryIn.disabled = true
    // duraIn.readOnly = true
    duraIn.message = null
    values.workerAddress = getSelected().address
    values.stopped = false
    values.inprogress = true
    values.durationValid = true
    values.tsStarted = new Date().toISOString()
    rxState.next({ inputs, values })
    startCount?.(true)
    timerFormValues(values)
}

const handlePauseTimer = async rxState => {
    const {
        inputs,
        stopCount,
        values
    } = rxState.value
    const manualEntryIn = inputs.find(x => x.name === inputNames.manualEntry)
    manualEntryIn.disabled = false
    values.inprogress = false
    values.stopped = true
    values.tsStopped = new Date().toISOString()
    rxState.next({ inputs, values })
    stopCount?.()
    timerFormValues(values)
}

const handleSubmit = (props, rxState, rxActivities) => async () => {
    const { values = {} } = rxState.value
    const activityId = values[inputNames.activityId]
    // make sure the activity ID is available in the activity options
    const activity = rxActivities?.value?.get?.(activityId)
    activity && await handleSubmitTime(
        props,
        rxState,
        NEW_RECORD_HASH, // specific ID used to indicate creation of new time record
        activity.name,
        values,
        statuses.submit
    )
}

export const handleSubmitTime = async (
    props,
    rxState,
    activityId,
    activityName,
    values,
    status,
    reason,
    checkBanned = true,
) => {
    const blockNumber = await subjectAsPromise(rxBlockNumber)[0]
    const { onSubmit } = props
    const {
        breakCount,
        duration,
        workerAddress,

        // reverse calclulate values when necessary.
        // Eg1: when user directly enters duration without starting the timer
        // Eg2: when updating record using the update form where seconds, tsStarted, tsStopped are not used.
        seconds,
        blockCount = seconds / BLOCK_DURATION_SECONDS,
        tsStarted = blockToDate(blockNumber - blockCount, blockNumber),
        tsStopped = blockToDate(blockNumber, blockNumber),
        blockEnd = dateToBlock(tsStopped, blockNumber),
        blockStart = dateToBlock(tsStarted, blockNumber),
    } = values

    // Check if user is banned from the activity.
    // If user has been banned, they will not be able to submit time any more.
    if (activityId !== NEW_RECORD_HASH && checkBanned) {
        const banned = await query.worker.banned(
            activityId,
            workerAddress
        )
        if (banned) return rxState.next({
            message: {
                header: textsCap.permissionDenied,
                icon: true,
                status: 'error',
            }
        })
    }
    const handleResult = success => {
        isFn(onSubmit) && onSubmit(success, values)
        rxState.next({
            closeText: undefined,
            message: {
                content: success
                    ? status === statuses.draft
                        ? textsCap.msgSavedAsDraft
                        : textsCap.msgSubmitted
                    : textsCap.transactionFailed,
                header: success
                    ? textsCap.success
                    : textsCap.error,
                icon: true,
                status: success
                    ? 'success'
                    : 'error',
            },
            submitInProgress: false,
            success,
        })

        success && setTimeout(() => handleReset(rxState))
    }
    const qDesc = `${textsCap.activity}: ${activityName} | ${textsCap.duration}: ${values.duration}`
    const queueProps = queueables.record.save(
        workerAddress,
        activityId,
        activityId,
        status,
        reason,
        blockCount,
        0,
        blockStart,
        blockEnd,
        breakCount,
        {
            title: textsCap.newRecord,
            description: qDesc,
            then: handleResult,
        }
    )

    const content = (
        <DataTableVertical {...{
            columns: [
                { title: textsCap.identity, key: 'identity' },
                { title: textsCap.activity, key: 'activity' },
                { title: textsCap.duration, key: 'duration' },
                { title: textsCap.numberOfBlocks, key: 'numberOfBlocks' },
                { title: textsCap.numberOfBreaks, key: 'numberOfBreaks' },
                { title: textsCap.startedAt, key: 'startedAt' },
                { title: textsCap.finishedAt, key: 'finishedAt' },
            ],
            data: [{
                identity: <AddressName {...{ address: workerAddress }} />,
                activity: activityName,
                duration: duration,
                numberOfBlocks: blockCount,
                numberOfBreaks: breakCount,
                startedAt: blockToDate(blockNumber, blockStart),
                finishedAt: blockToDate(blockNumber, blockEnd),
            }],
        }} />
    )
    const confirmed = await confirmAsPromise({
        collapsing: true,
        cancelButton: textsCap.goBack,
        confirmButton: (
            <Button {...{
                content: textsCap.proceed,
                positive: true,
            }} />
        ),
        content,
        header: `${textsCap.submitTime}?`,
        size: 'mini',
        subheader: textsCap.submitConfirmationMsg,
    })
    // send task to queue service
    if (!confirmed) return

    // execute the transaction
    addToQueue(queueProps)

    rxState.next({
        closeText: textsCap.close,
        submitInProgress: true,
        message: {
            content: `${textsCap.requestQueuedMsg1} ${textsCap.requestQueuedMsg2}`,
            header: textsCap.addedToQueue,
            status: 'loading',
            icon: true
        },
    })

}

export const handleValidateDuration = (_e, _d, values) => {
    if (!values[inputNames.manualEntry]) return

    const duration = values[inputNames.duration]
    const valid = BLOCK_DURATION_REGEX.test(duration)
        || duration === DURATION_ZERO

    return !valid && {
        content: (
            <span>
                {textsCap.invalidDurationMsgPart1}<br />
                <b>hh:mm:ss</b><br />
            </span>
        ),
        header: textsCap.invalidDuration,
        icon: true,
        status: 'error',
    }
}

// set identity options to only include identities where user is a worker of the selected activity
const setIdentityOptions = async (rxState, activityId, workerAddress) => {
    if (!activityId) return

    const { inputs } = rxState.value
    const workers = await query.worker.listWorkers(activityId)
    const identityIn = findInput(inputs, inputNames.workerAddress)
    identityIn.options = getIdentityOptions()
        .filter(x => workers.includes(x.value))
    const isWorker = !!identityIn.options
        .find(x => x.value === workerAddress)
    identityIn.rxValue.next(
        isWorker
            ? workerAddress
            : null
    )
}