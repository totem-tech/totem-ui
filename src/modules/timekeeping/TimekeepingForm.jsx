import PropTypes from 'prop-types'
import React from 'react'
import { BehaviorSubject } from 'rxjs'
import { Icon } from 'semantic-ui-react'
import { Button, ButtonAcceptOrReject } from '../../components/buttons'
import FormBuilder, { fillValues, findInput } from '../../components/FormBuilder'
import DataTableVertical from '../../components/DataTableVertical'
import { rxBlockNumber } from '../../services/blockchain'
import { confirmAsPromise, showForm } from '../../services/modal'
import { addToQueue } from '../../services/queue'
import { translated } from '../../utils/languageHelper'
import {
    RxSubjectView,
    copyRxSubject,
    subjectAsPromise,
    useIsMobile,
    useRxState,
    useRxSubject
} from '../../utils/reactjs'
import {
    BLOCK_DURATION_REGEX,
    blockToDate,
    dateToBlock,
} from '../../utils/time'
import {
    className,
    isFn,
    objClean,
    objWithoutKeys,
} from '../../utils/utils'
import { openStatuses, query as actQuery } from '../activity/activity'
import ActivityDetails from '../activity/ActivityDetails'
import { getIdentityOptions } from '../identity/getIdentityOptions'
import { get, getSelected, rxIdentities } from '../identity/identity'
import AddressName from '../partner/AddressName'
import { handleInvitation } from './notificationHandlers'
import {
    DURATION_ZERO,
    durationToBlockCount,
    NEW_RECORD_HASH,
    query,
    queueables,
    statuses,
} from './timekeeping'
import TimeKeepingInviteForm, { inputNames as invInputNames } from './TimekeepingInviteForm'
import Timer from './Timer'
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
    addMyself: 'add myself',
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
    inactiveWorkerMsg4: 'you must add yourself as a team member in order to start booking time to this activity.',
    invalidDuration: 'invalid duration',
    invalidDurationMsgPart1: 'please enter a valid duration according to the following format:',
    manuallyEnterDuration: 'manually enter duration',
    msgSubmitted: 'your time record has been submitted for approval',
    msgSavedAsDraft: 'your time record has been saved as draft',
    newRecord: 'new Record',
    noActivityMsg: 'create a new activity or ask to be invited to the Team',
    noContinueTimer: 'no, continue timer',
    numberOfBlocks: 'number of blocks',
    numberOfBreaks: 'number of breaks',
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
    viewActivity: 'view activity details',
    workerBannedMsg: 'you are banned from this Activity!',
}
translated(textsCap, true)

export const inputNames = {
    activityId: 'activityId',
    duration: 'duration',
    manualEntry: 'manualEntry',
    seconds: 'seconds',
    workerAddress: 'workerAddress',
}
export const timer = new Timer(
    0,
    1000,
    false, // will only auto start if cached value indicates timer is already started
    'timer',
    [ // only save these properties to the cache storage
        inputNames.activityId,
        inputNames.manualEntry,
        inputNames.workerAddress,
        // default timer properties
        'breakCount',
        'inprogress',
        'tsFrom',
        'tsStarted',
        'tsStopped',
    ]
)

const TimekeepingForm = React.memo(({
    closeText: closeTextP,
    onClose,
    isMobile = useIsMobile(),
    ...props
}) => {
    const [state, _, rxState] = useRxState(getInitialState(props))
    let {
        activitiesQuery,
        closeText = closeTextP,
        inputs,
        message,
    } = state
    const rxActivities = useTkActivities(activitiesQuery)
    const values = useRxSubject(timer.rxValues)[0]
    const {
        tsStarted,
        tsStopped,
        inprogress,
        manualEntry
    } = values
    const done = tsStopped || manualEntry
    const duraIn = findInput(inputs, inputNames.duration)

    const disabled = manualEntry || inprogress
    duraIn.inlineLabel = {
        className: className({ disabled }),
        icon: {
            className: 'no-margin',
            name: 'pencil',
        },
        onClick: e => {
            e.stopPropagation()
            e.preventDefault()
            if (disabled) return

            timer
                .rxValues
                .next({ manualEntry: true })
            inprogress && timer.pause()
        },
        style: { cursor: 'pointer' },
        title: !disabled && textsCap.manuallyEnterDuration || '',
    }
    duraIn.action = !inprogress
        && (!!tsStarted || manualEntry)
        && {
        icon: 'play',
        // prevents annoying HTML form validation warnings from showing up when clicked
        formNoValidate: true,
        onClick: () => confirmAsPromise({
            header: textsCap.resumeTimer,
            content: textsCap.resumeTimeWarning,
            onConfirm: () => timer.start(),
            confirmButton: textsCap.yes,
            cancelButton: textsCap.no,
            size: 'mini',
        }),
        title: textsCap.resumeTimer,
    }
    const btnStyle = {
        margin: '3px 3px 15px',
        width: 'calc( 50% - 12px )',
        zoom: isMobile
            ? 0.7
            : undefined,
    }

    return (
        <FormBuilder {...{
            ...props,
            ...state,
            closeText: {
                content: closeText,
                size: 'massive',
                style: btnStyle,
                onClick: handleCancel(onClose, rxState),
            },
            inputs,
            message: !inprogress
                ? message
                : {
                    content: `${textsCap.timerRunningMsg1} ${textsCap.timerRunningMsg2}`,
                    header: textsCap.timerStarted,
                    icon: true,
                    status: 'info'
                },
            onSubmit: handleSubmit(
                props,
                rxState,
                rxActivities
            ),
            submitText: {
                content: !inprogress
                    ? done
                        ? textsCap.submit
                        : textsCap.start
                    : textsCap.stop,
                disabled: inprogress
                    ? false // prevents stop button being disabled
                    : undefined,
                icon: {
                    loading: inprogress,
                    name: !inprogress
                        ? done
                            ? 'thumbs up'
                            : 'play'
                        : 'clock outline',
                    style: {
                        fontSize: 25,
                        height: 25,
                        width: 25,

                    }
                },
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

const getActivityOptions = (
    activityId,
    rxState
) => (activities = new Map()) => {
    const { inputs, loading } = rxState.value
    const activityIn = findInput(inputs, inputNames.activityId)
    const options = Array
        .from(activities)
        .map(([activityId, activity]) => {
            const {
                description,
                name,
                ownerAddress,
                userId
            } = activity
            return {
                description: (
                    <AddressName {...{
                        address: ownerAddress,
                        // allowCopy: false,
                        maxLength: 21,
                        // fixes alignment issue when add button is displayed
                        styleAddButton: {
                            padding: 5,
                            marginTop: -3,
                        },
                        title: textsCap.activityOwner,
                        userId,
                    }} />
                ),
                key: activityId,
                search: [
                    name,
                    activityId,
                    userId,
                    ownerAddress,
                ].join(' '),
                text: (
                    <span>
                        <RxSubjectView {...{
                            subject: false, // will create rxHover using default value `false`
                            valueModifier: (hovered, _, rxHover) => (
                                <Icon {...{
                                    className: 'no-margin',
                                    color: hovered
                                        ? 'blue'
                                        : undefined,
                                    name: 'eye',
                                    onClick: e => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        return ActivityDetails.asModal({ activity, activityId })
                                    },
                                    onMouseEnter: () => rxHover?.next(true),
                                    onMouseLeave: () => rxHover?.next(false),
                                    style: { cursor: 'pointer' },
                                    title: textsCap.viewActivity,
                                }} />
                            ),
                        }} />
                        {' ' + name}
                    </span>
                ),
                title: `ID: ${activityId}\nDescription: ${description}`,
                value: activityId,
            }
        })
    activityIn.noResultsMessage = options?.length > 0
        ? undefined
        : textsCap.noActivityMsg

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
}
const getInitialState = (
    props,
    rxValues = new BehaviorSubject({}),
) => rxState => {
    const {
        projectHash: pph,
        activityId: pActivityId = pph
    } = props
    const values = timer.getValues()
    const { breakCount, inprogress } = values
    const activityId = values[inputNames.activityId]
    const workerAddress = values[inputNames.workerAddress]
        || getSelected().address
    values.duration = DURATION_ZERO
    values.breakCount = (breakCount || 0)
    values.projectHash = !!pActivityId && !inprogress
        ? pActivityId
        : activityId
    const rxActivities = new BehaviorSubject(new Map())
    const rxManualEntry = copyRxSubject(
        timer.rxValues,
        null,
        values => {
            const me = !!values?.manualEntry
            return me
        },
    )
    const rxDuration = copyRxSubject(
        timer.rxValues,
        null,
        () => timer.getDuration(),
    )
    const rxWorkerAddress = new BehaviorSubject(workerAddress)
    const inputs = [
        {
            // disabled: () => {
            //     const values = timer.getValues()
            //     return values.inprogress && !!values[inputNames.workerAddress]
            // },
            label: textsCap.identity,
            name: inputNames.workerAddress,
            options: [],
            required: true,
            rxOptions: rxIdentities,
            rxOptionsModifier: getIdentityOptions,
            rxValue: rxWorkerAddress,
            search: ['keywords'],
            selection: true,
            type: 'dropdown',
            // validate: validateWorkerAddress(rxState)
        },
        {
            clearable: true,
            // disabled: !!pActivityId,
            // disabled: () => {
            //     if (!!pActivityId) return true

            //     const values = timer.getValues()
            //     return values.inprogress && !!values[inputNames.activityId]
            // },
            label: textsCap.activity,
            name: inputNames.activityId,
            options: [],
            placeholder: textsCap.selectActivity,
            required: true,
            rxOptions: rxActivities,
            rxOptionsModifier: getActivityOptions(activityId, rxState),
            rxValue: new BehaviorSubject(),
            search: ['search'],
            selection: true,
            selectOnNavigation: false,
            type: 'dropdown',
            validate: validateActiviy(rxState, rxActivities)
        },
        {

            autoComplete: 'off',
            hidden: values => !values[inputNames.activityId] || !values[inputNames.workerAddress],
            labelPosition: 'left',
            label: textsCap.duration,
            labelDetails: 'hh:mm:ss',
            name: inputNames.duration,
            onChange: handleDurationChange,
            placeholder: 'hh:mm:ss',
            readOnly: values => !values[inputNames.manualEntry],
            required: true,
            rxValue: rxDuration,
            type: 'text',
            validate: validateDuration,
        },
        { // keep the duration input synced with timer
            hidden: true,
            name: inputNames.seconds,
            onChange: (_, values) => !values[inputNames.manualEntry]
                && rxDuration.next(timer.getDuration()),
            rxValue: timer.rxInterval,
        },
        {
            hidden: true,
            disabled: () => timer.rxInprogress.value,
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
    // makes sure all the valeus from the timer is available in the rxValues
    copyRxSubject(
        timer.rxValues,
        rxValues,
        timerValues => ({
            ...rxValues.value,
            ...timerValues,
        }),
    )
    const state = {
        activitiesQuery: {
            // makes sure the correct list of activites are retrieved even when the selected identity changes.
            identity: rxWorkerAddress,
            includeOwned: true,
            subject: rxActivities,
            subjectOnly: true,
        },
        inputs: fillValues(
            inputs,
            // activityId to be filled after fetching activityId options.
            // otherwise, it will be emptied by FormInput because the option is not immediately available
            objWithoutKeys(values, [inputNames.activityId]),
            false,
            false,
        ),
        // set loading status until activity options are loaded
        loading: true,
        rxValues,
        submitDisabled: false,
        values,
    }

    return state
}

const handleDurationChange = (_, values) => {
    if (!values[inputNames.manualEntry]) return

    const duration = values[inputNames.duration]
    const ignore = !duration
        || duration === DURATION_ZERO
        || !BLOCK_DURATION_REGEX.test(duration)
    if (ignore) return

    timer.setTimeByDuration(duration)
}

const handleCancel = (onClose, rxState) => async (e, d) => {
    const { inprogress } = timer.getValues()
    const confirmed = !inprogress || await confirmAsPromise({
        cancelButton: textsCap.noContinueTimer,
        confirmButton: textsCap.yes,
        content: textsCap.cancelWarning,
        header: textsCap.areYouSure,
        size: 'tiny'
    })
    if (!confirmed) return

    handleReset(rxState, false)
    isFn(onClose) && onClose(e, d)
}

const handleReset = async (rxState, shouldConfirm) => {

    const { values = {} } = rxState.value
    const { tsStarted } = values
    const doConfirm = shouldConfirm && tsStarted
    const proceed = !doConfirm || await confirmAsPromise({
        header: textsCap.resetTimer,
        // content: textsCap.resetTimeWarning,
        onConfirm: reset,
        confirmButton: textsCap.yes,
        cancelButton: textsCap.no,
        size: 'mini'
    })

    // remove all unnecessary values
    proceed && timer.reset()
}

const handleStartTimer = rxState => {
    const { values } = rxState.value
    const tValues = objClean(values, [
        inputNames.activityId,
        inputNames.workerAddress,
    ])
    timer.start(tValues)
}
const handleSubmit = (
    props,
    rxState,
    rxActivities
) => async (_, values) => {
    const tValues = timer.getValues()
    const {
        tsStopped,
        inprogress,
        manualEntry
    } = tValues
    // pause timer
    if (inprogress) return timer.pause()

    const done = tsStopped || manualEntry
    // start/resume timer
    if (!done) return handleStartTimer(rxState)

    // proceed to submit time
    const activityId = values[inputNames.activityId]
    // make sure the activity ID is available in the activity options
    const activity = rxActivities
        ?.value
        ?.get
        ?.(activityId)
    activity && await handleSubmitTime(
        props,
        rxState,
        activityId,
        NEW_RECORD_HASH, // specific ID used to indicate creation of new time record
        activity.name,
        {
            ...values,
            ...tValues,
            duration: timer.getDuration(),
        },
        statuses.submit
    )
}

export const handleSubmitTime = async (
    props,
    rxState,
    activityId,
    recordId,
    activityName,
    values,
    status,
    reason,
) => {
    const blockNumber = await subjectAsPromise(rxBlockNumber)[0]
    const { onSubmit } = props
    const {
        breakCount,
        duration,
        workerAddress,

        // reverse calclulate values when necessary.
        // Eg1: when user directly enters duration without starting the timer
        // Eg2: when updating record using the update form where tsStarted, tsStopped are not used.
        blockCount = durationToBlockCount(duration),
        tsStarted = blockToDate(blockNumber - blockCount, blockNumber),
        tsStopped = blockToDate(blockNumber, blockNumber),
        blockEnd = dateToBlock(tsStopped, blockNumber),
        blockStart = dateToBlock(tsStarted, blockNumber),
    } = values

    // Check if user is banned from the activity.
    // If user has been banned, they will not be able to submit time to this activity any more.
    const banned = await query.worker.banned(activityId, workerAddress)
    if (banned) return rxState.next({
        message: {
            header: textsCap.workerBannedMsg,
            icon: true,
            status: 'error',
        }
    })
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
        recordId,
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
                duration,
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

const validateActiviy = (
    rxState,
    rxActivities
) => async (_, _d, values) => {
    const activityId = values[inputNames.activityId]
    const workerAddress = values[inputNames.workerAddress]
    // no activity has been selected
    if (!activityId || !workerAddress) return

    const { inputs = [] } = rxState.value
    const activityIn = findInput(inputs, inputNames.activityId)
    const workerIn = findInput(inputs, inputNames.workerAddress)
    const activity = rxActivities.value?.get?.(activityId)
    // activity non-existent in the options
    // this can happen if activityId is prefilled from previous sessions
    if (!activity) {
        setTimeout(() => activityIn.rxValue?.next(null))
        return
    }

    const { ownerAddress } = activity
    // check if Activity status is open/reopened
    const statusCode = await actQuery.status(activityId)
    // Activity open status
    const isOpen = openStatuses.includes(statusCode)
    // Activity is not active anymore
    if (!isOpen) return {
        content: textsCap.selectOpenActivity,
        header: textsCap.inactiveActivitySelected,
        icon: true,
        status: 'error',
    }

    // check worker ban and invitation status
    const [
        banned = false,
        invitees = [],
        workers = []
    ] = await Promise.all([
        query.worker.banned(activityId, workerAddress),
        query.worker.listInvited(activityId),
        query.worker.listWorkers(activityId),
    ])
    const isWorker = workers.includes(workerAddress)

    // user has been banned by activity owner
    if (banned) return {
        content: textsCap.workerBannedMsg,
        icon: true,
        status: 'error',
    }
    // save worker address, activityId... to cache storage
    timer.rxValues.next(values)

    // valid
    if (isWorker) return

    const isInvited = invitees.includes(workerAddress)
    const isOwner = rxIdentities.value.get(ownerAddress)
    let content, header

    if (!isInvited && !isOwner) {
        content = textsCap.inactiveWorkerMsg1
        header = textsCap.inactiveWorkerHeader1
        // check if any of the other identities have accepted and allow to select that identity?
    } else if (isInvited) {
        // user is yet to accept/reject invitation
        content = (
            // user has been invited to the activity and yet to accept the inivitation
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
                        success && workerIn.rxValue?.next(activityId)
                    }}
                    style={{ marginTop: 10 }}
                />
            </div>
        )
        header = textsCap.inactiveWorkerHeader2
    } else if (isOwner) {
        content = (
            // user is the owner
            <div>
                {textsCap.inactiveWorkerMsg4}
                <Button {...{
                    content: textsCap.addMyself,
                    onClick: e => {
                        e.preventDefault()
                        const values = {}
                        values[invInputNames.activityId] = activityId
                        values[invInputNames.workerAddress] = ownerAddress
                        return showForm(TimeKeepingInviteForm, {
                            closeOnSubmit: true,
                            inputsHidden: [invInputNames.addpartner],
                            onSubmit: ok => ok
                                && activityIn
                                    .rxValue
                                    .next(activityId),
                            values,
                        })
                    },
                    size: 'mini',
                }} />
            </div>
        )
    }
    return {
        content,
        header,
        icon: true,
        status: 'error',
    }
}

export const validateDuration = (_e, _d, values) => {
    const {
        inprogress,
        manualEntry,
        tsStopped,
    } = timer.getValues()

    const done = tsStopped || manualEntry
    const duration = values[inputNames.duration]
    const isZero = duration === DURATION_ZERO

    if (isZero) return !inprogress && !!done
    if (!manualEntry) return

    const valid = BLOCK_DURATION_REGEX.test(duration) || isZero

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