import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { BehaviorSubject } from 'rxjs'
import { Button } from 'semantic-ui-react'
import { ButtonAcceptOrReject } from '../../components/buttons'
import FormBuilder, { fillValues, findInput } from '../../components/FormBuilder'
import DataTableVertical from '../../components/DataTableVertical'
import { rxBlockNumber } from '../../services/blockchain'
import { translated } from '../../utils/languageHelper'
import { confirm, confirmAsPromise } from '../../services/modal'
import { addToQueue } from '../../services/queue'
import { copyRxSubject, unsubscribe, useRxState, useRxSubject } from '../../utils/reactjs'
import {
    BLOCK_DURATION_SECONDS,
    BLOCK_DURATION_REGEX,
    durationToSeconds,
    secondsToDuration,
    blockToDate,
} from '../../utils/time'
import {
    deferred,
    hasValue,
    isDefined,
    isFn,
    isPositiveInteger,
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
import PromisE from '../../utils/PromisE'
import useTkActivities from './useTKActivities'

const textsCap = {
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
    newRecord: 'new Record',
    noContinueTimer: 'no, continue timer',
    noProjectsMsg: 'create a new activity or ask to be invited to the Team',
    numberOfBlocks: 'number of blocks',
    numberOfBreaks: 'number of breaks',
    permissionDenied: 'permission denied',
    recordSubmittedSuccessfully: 'your time record has been submitted for approval',
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

// Hash that indicates creation of new record
const DURATION_ZERO = '00:00:00'
const blockCountToDuration = blockCount => secondsToDuration(
    blockCount * BLOCK_DURATION_SECONDS
)
const durationToBlockCount = (duration = '') => BLOCK_DURATION_REGEX.test(duration)
    && parseInt(
        durationToSeconds(duration) / BLOCK_DURATION_SECONDS
    )
    || 0

export const inputNames = {
    activityId: 'projectHash',
    duration: 'duration',
    manualEntry: 'manualEntry',
    workerAddress: 'workerAddress',
}

const TimekeepingForm = React.memo(props => {
    const rxActivities = useTkActivities({ subjectOnly: true })
    const [state, setState, rxState] = useRxState(
        getInitialState(props, rxActivities),
        {
            // subject: () => copyRxSubject(
            //     rxBlockNumber,
            //     rxState,
            //     // when copying blockNumber from rxBlockNumber make sure to merge with previous state
            //     (blockNumber, state = {}, rxState) => {
            //         const {
            //             loading,
            //             values: {
            //                 inprogress
            //             } = {}
            //         } = state

            //         const shouldSave = inprogress
            //             && isPositiveInteger(blockNumber)
            //             && !loading
            //         if (shouldSave) saveValues(rxState)

            //         return { ...state, blockNumber }
            //     },
            //     0,
            // ),
            onUnmount: rxState => rxState?.value?.stopCount?.()
        }
    )


    // async componentWillMount() {
    //     this._mounted = true
    //     this.subscriptions = {}
    //     const updateValues = blockNumber => {
    //         if (!this._mounted) return
    //         const { values: { inprogress } } = this.state
    //         inprogress
    //             ? this.saveValues(blockNumber)
    //             : this.setState({ blockNumber })
    //     }

    //     // this.subscriptions.newHead = await queryBlockchain('api.rpc.chain.subscribeNewHeads', [updateValues])
    //     // this.subscriptions.blockNumber = await getCurrentBlock(updateValues)
    //     this.subscriptions.blockNumber = rxBlockNumber.subscribe(updateValues)

    // }


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
    message && console.log({ message, state })
    return (
        <FormBuilder {...{
            ...props,
            ...state,
            closeText: closeBtn,
            inputs,
            message,
            onChange: handleValuesChange(rxState),
            onSubmit: (...args) => inprogress
                ? handleStopTimer(rxState)
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
                // labelPosition: !!inprogress
                //     ? 'right'
                //     : undefined,
                // onClick: 
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

export const TimekeepingUpdateForm = TimekeepingForm

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
        workerAddress
    } = values
    values.durationValid = !isDefined(durationValid) || durationValid
    values.duration = duration || DURATION_ZERO
    values.breakCount = (breakCount || 0)
    values.workerAddress = workerAddress || getSelected().address
    values.projectHash = !!pActivityId && !inprogress
        ? pActivityId
        : activityId
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
                            text: name || textsCap.unknown,
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
            autoComplete: 'off',
            label: textsCap.duration,
            labelDetails: 'hh:mm:ss',
            name: inputNames.duration,
            placeholder: 'hh:mm:ss',
            readOnly: values.manualEntry !== true,
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
            rxValue: new BehaviorSubject(),
            type: 'checkbox-group',
        },
    ]
    const rxCount = new BehaviorSubject(0)
    let intervalId
    const startCount = () => {
        clearInterval(intervalId)
        intervalId = setInterval(() => rxCount.next(rxCount.value + 1), 1000)
    }
    const stopCount = () => {
        clearInterval(intervalId)
        rxCount.next(0)
    }
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
        rxCount,
        startCount,
        stopCount,
        submitDisabled: false,
        values,
    }
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
        console.log('activity not open')
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
    const { inputs = [], values = {} } = rxState.value
    const { duration } = values
    const doConfirm = userInitiated
        && duration
        && duration !== DURATION_ZERO
    const confirmed = !doConfirm || await confirmAsPromise({
        header: textsCap.resetTimer,
        // content: textsCap.resetTimeWarning,
        onConfirm: reset,
        confirmButton: textsCap.yes,
        cancelButton: textsCap.no,
        size: 'mini'
    })
    if (!confirmed) return

    values.blockStart = 0
    values.blockEnd = 0
    values.blockCount = 0
    values.duration = DURATION_ZERO
    values.inprogress = false
    values.stopped = false
    values.breakCount = 0
    values[inputNames.manualEntry] = false
    values[inputNames.duration] = ''//DURATION_ZERO

    console.log('handleReset', { inputs, values, rxState, v: rxState.value.values })
    userInitiated && rxState.next({
        inputs: fillValues(
            inputs,
            values,
            true
        ),
        values,
    })
    timerFormValues(values)
}

const handleResume = rxState => () => {
    const {
        blockNumber,
        inputs,
        startCount,
        values
    } = rxState.value
    values.blockCount = durationToBlockCount(values.duration)
    values.blockEnd = blockNumber
    values.blockStart = blockNumber - values.blockCount
    values.inprogress = true
    values.stopped = false
    values.manualEntry = undefined
    values.breakCount++
    const meIn = inputs.find(x => x.name === inputNames.manualEntry)
    meIn.defaultChecked = false
    meIn.disabled = true
    rxState.next({ inputs, values })
    console.log('handleResume', values)
    startCount?.()
    saveValues(rxState)
}

const handleStartTimer = rxState => {
    const {
        blockNumber,
        inputs,
        startCount,
        values
    } = rxState.value
    const manualEntryIn = inputs.find(x => x.name === inputNames.manualEntry)
    const duraIn = inputs.find(x => x.name === inputNames.duration)
    manualEntryIn.disabled = true
    duraIn.readOnly = true
    duraIn.message = null
    values.workerAddress = getSelected().address
    values.blockCount = durationToBlockCount(values.duration)
    values.blockStart = blockNumber - values.blockCount
    values.stopped = false
    values.inprogress = true
    values.durationValid = true
    rxState.next({ inputs, values })
    console.log('handleStartTimer', values)
    startCount?.()
    saveValues(rxState)
}

const handleStopTimer = async rxState => {
    const {
        blockNumber,
        inputs,
        stopCount,
        values
    } = rxState.value
    const manualEntryIn = inputs.find(x => x.name === inputNames.manualEntry)
    manualEntryIn.disabled = false
    values.blockEnd = blockNumber
    values.inprogress = false
    values.stopped = true
    rxState.next({ inputs, values })
    stopCount?.()
    saveValues(rxState)
}

const handleSubmit = (props, rxState, rxActivities) => () => {
    const { values = {} } = rxState.value
    const activityId = values[inputNames.activityId]
    const activity = rxActivities?.value?.get?.(activityId)
    if (!activity) return console.log('Activity not found')

    handleSubmitTime(
        props,
        rxState,
        NEW_RECORD_HASH, // specific ID used to indicate creation of new time record
        activity.name || textsCap.unknown,
        values,
        statuses.submit
    )
}

const handleSubmitTime = async (
    props,
    rxState,
    activityId,
    activityName,
    values,
    status,
    reason,
    checkBanned = true
) => {
    const {
        blockNumber = await subjectAsPromise(rxBlockNumber)[0]
    } = rxState.value
    const { onSubmit } = props
    const {
        blockCount,
        blockEnd,
        blockStart,
        breakCount,
        duration,
        workerAddress,
    } = values
    // Check if user is banned from the activity.
    // If user has been banned, they will not be able to submit time any more.
    if (activityId !== NEW_RECORD_HASH && checkBanned) {
        const banned = await query
            .worker
            .banned(activityId, workerAddress)
        if (banned) return rxState.next({
            message: {
                header: textsCap.permissionDenied,
                icon: true,
                status: 'error',
            }
        })
    }

    // return handleReset(rxState)
    const handleResult = success => {
        isFn(onSubmit) && onSubmit(success, values)
        rxState.next({
            closeText: undefined,
            message: {
                content: success
                    ? textsCap.recordSubmittedSuccessfully
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
        console.log('onSuccess', { values: rxState.value.values })

        // success && setTimeout(() => handleReset(rxState))
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
    console.log('handleSubmit', { values, blockNumber })
    const proceed = await confirmAsPromise({
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
    if (!proceed) return

    // addToQueue(queueProps)

    console.log('set loading')
    rxState.next({
        closeText: textsCap.close,
        submitInProgress: true,
        message: {
            content: `${textsCap.requestQueuedMsg1} ${textsCap.requestQueuedMsg2}`,
            header: textsCap.addedToQueue,
            status: 'loading',
            icon: true
        },
        submitDisabled: true,
    })

    setTimeout(() => handleResult(true), 5000)
}

const handleValidateDuration = (_1, _2, values) => {
    const { duration, manualEntry } = values
    const valid = BLOCK_DURATION_REGEX.test(duration)
    const invalid = !manualEntry
        ? !valid
        : duration === DURATION_ZERO || !valid

    return invalid && {
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

const handleValuesChange = rxState => (_, formValues) => {
    let { inputs, values } = rxState.value
    values = { ...values, ...formValues }
    const {
        blockEnd,
        blockStart,
        manualEntry
    } = values
    const duraIn = inputs.find(x => x.name === inputNames.duration)
    let duration
    if (manualEntry) {
        // switched from timer to manual mode
        duration = duraIn.readOnly
            ? blockCountToDuration(blockEnd - blockStart)
            : values.duration
    } else if (!manualEntry && !duraIn.readOnly) {
        // switched from manual to timer mode
        duration = values.duration
    }

    // Disable duration input when in timer mode
    duraIn.readOnly = !manualEntry
    rxState.next({ inputs, values })
    console.log('handleValuesChange', { values })
    saveValues(rxState, duration)
}

/**
 * @name    saveValues
 * 
 * @param   {BehaviorSubject}   rxState 
 * @param   {String}            newDuration   (optional) only needed if duration is changed by user manually
 */
const saveValues = PromisE.deferred(
    (rxState, newDuration) => [rxState, newDuration],
    200,
    {
        onResult: async ([rxState, newDuration]) => {
            const {
                blockNumber,
                inputs = [],
                success,
                values = {}
            } = rxState.value
            if (success) return

            const {
                blockEnd,
                blockStart,
                inprogress
            } = values

            const duraIn = inputs.find(x => x.name === inputNames.duration)
            if (!isPositiveInteger(blockNumber)) return

            if (!!newDuration) {
                values.duration = newDuration
                values.blockCount = durationToBlockCount(newDuration)
                values.blockEnd = blockNumber
                values.blockStart = blockStart || (blockNumber - values.blockCount)
            } else {
                values.blockEnd = inprogress
                    ? blockNumber
                    : blockEnd
                values.blockCount = values.blockEnd - blockStart
                values.blockStart = blockStart
                    || (values.blockEnd - values.blockCount)
                values.duration = blockCountToDuration(values.blockCount)
            }
            if (values.blockEnd - values.blockStart < values.blockCount) {
                // hacky fix
                values.blockStart = values.blockEnd - values.blockCount
            }
            duraIn.value = values.duration
            values.durationValid = BLOCK_DURATION_REGEX.test(values.duration)
                && values.duration !== DURATION_ZERO

            // execute this on onResult
            rxState.next({
                blockNumber,
                inputs,
                // message,
                values
            })
            timerFormValues(values)
        },
        throttle: true,
    })

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