import PropTypes from 'prop-types'
import React from 'react'
import { BehaviorSubject } from 'rxjs'
import { Icon } from 'semantic-ui-react'
import { Button, ButtonAcceptOrReject } from '../../components/buttons'
import DataTable from '../../components/DataTable'
import FormBuilder, { fillValues, findInput } from '../../components/FormBuilder'
import DataTableVertical from '../../components/DataTableVertical'
import { rxBlockNumber } from '../../services/blockchain'
import {
    closeModal,
    confirmAsPromise,
    showForm
} from '../../services/modal'
import { addToQueue, awaitComplete } from '../../services/queue'
import { csvToArr } from '../../utils/convert'
import { translated } from '../../utils/languageHelper'
import {
    RxSubjectView,
    copyRxSubject,
    subjectAsPromise,
    useIsMobile,
    useQueueItemStatus,
    useRxState,
    useRxSubject
} from '../../utils/reactjs'
import {
    BLOCK_DURATION_REGEX,
    blockToDate,
    dateToBlock,
    format,
} from '../../utils/time'
import {
    arrSort,
    className,
    isArr,
    isFn,
    isValidDate,
    objClean,
    objWithoutKeys,
    strFill,
} from '../../utils/utils'
import { openStatuses, query as actQuery } from '../activity/activity'
import ActivityDetails from '../activity/ActivityDetails'
import { getIdentityOptions } from '../identity/getIdentityOptions'
import { getSelected, rxIdentities } from '../identity/identity'
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
import FormInput from '../../components/FormInput'

const sampleCSVFilePath = '/sample-batch-time.csv'
const textsCap = {
    activity: 'activity',
    batchTime: 'import or batch input time',
    close: 'close',
    description: 'description',
    duration: 'duration',
    identity: 'identity',
    no: 'no',
    proceed: 'proceed',
    start: 'start',
    stop: 'stop',
    submit: 'submit',
    timekeeping: 'timekeeping',
    yes: 'yes',
    wallet: 'wallet',

    activityOwner: 'activity owner',
    addMyself: 'add myself',
    areYouSure: 'are you sure?',
    blockEnd: 'end block',
    blockStart: 'start block',
    cancelWarning: 'you have a running timer. Would you like to stop and exit?',
    checkingActivityStatus: 'checking activity status...',
    endTime: 'end time',
    errRejectedDurationUnchanged: 'rejected record requires duration change in order to re-sumbit',
    finishedAt: 'finished at',
    format: 'format',
    goBack: 'go Back',
    id: 'ID',
    inactiveActivitySelected: 'this Activity is no longer open!',
    inactiveWorkerHeader1: 'you are not part of this Team! Request an invitation',
    inactiveWorkerHeader2: 'action required',
    inactiveWorkerMsg1: 'please select an activity you have been invited to and already accepted.',
    inactiveWorkerMsg3: 'you are yet to accept or reject invitation to join this activity team.',
    inactiveWorkerMsg4: 'you must add yourself as a team member in order to start booking time to this activity.',
    invalidDuration: 'invalid duration',
    invalidDurationMsgPart1: 'please enter a valid duration according to the following format:',
    invalidFile: 'Invalid file selected! Please select a CSV file with the following columns:',
    manuallyEnterDuration: 'manually enter duration',
    msgSubmitted: 'your time record has been submitted for approval',
    msgCreateRecord: 'create new time record',
    msgUpdateRecord: 'update time record',
    noActivityMsg: 'create a new activity or ask to be invited to the Team',
    noContinueTimer: 'no, continue timer',
    numberOfBlocks: 'number of blocks',
    numberOfBreaks: 'number of breaks',
    resetTimer: 'reset the Timer',
    // resetTimerWarning: 'you are about to reset your timer.',
    resumeTimer: 'resume the timer',
    resumeTimeWarning: 'would you like to resume timekeeping on this activity?',
    selectActivity: 'select an Activity',
    selectOpenActivity: 'please select an open Activity',
    saveAsDraft: 'save as draft',
    startedAt: 'started at',
    startTime: 'start time',
    submitForApproval: 'submit for approval',
    submitConfirmationMsg: 'please verify the following information and click "Proceed" to submit your time record',
    submitTime: 'submit time',
    timerStarted: 'timer started',
    timerRunningMsg1: 'you may now close the dialog.',
    timerRunningMsg2: 'return here at anytime by clicking on the clock icon in the header.',
    updateFormHeader: 'update Record',
    viewActivity: 'view activity details',
    workerBannedMsg: 'you are banned from this Activity!',
}
translated(textsCap, true)

export const inputNames = {
    activityId: 'activityId',
    batch: 'batch',
    batchData: 'batchData',
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
        'batch',
        'batchData',
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
        rxQueueId,
    } = state
    // when form is submitted rxQueueId is set and queue status (message) will be displayed automatically.
    const queueStatus = useQueueItemStatus(
        rxQueueId,
        message => message?.status !== 'success'
            ? message
            : {
                // replace header and include a button below the success message to open the team list on a modal
                ...message,
                content: textsCap.msgSubmitted,
            },
    )
    const rxActivities = useTkActivities(activitiesQuery)
    const values = useRxSubject(timer.rxValues)[0]
    const {
        batch,
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
            message: queueStatus || (
                !inprogress
                    ? message
                    : {
                        content: `${textsCap.timerRunningMsg1} ${textsCap.timerRunningMsg2}`,
                        header: textsCap.timerStarted,
                        icon: true,
                        status: 'info'
                    }
            ),
            onSubmit: handleSubmit(
                props,
                rxState,
                rxActivities
            ),
            submitText: {
                content: batch
                    ? textsCap.submit
                    : !inprogress
                        ? done
                            ? textsCap.submit
                            : textsCap.start
                        : textsCap.stop,
                disabled: inprogress && !batch
                    ? false // prevents stop button being disabled
                    : undefined,
                icon: {
                    loading: inprogress,
                    name: batch
                        ? 'thumbs up'
                        : !inprogress
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
    size: 'small',
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
            const addressName = (
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
            )
            const renderIcon = (hovered, _, rxHover) => (
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
            )
            const text = (
                <span>
                    <RxSubjectView {...{
                        subject: false, // will create rxHover using default value `false`
                        valueModifier: renderIcon,
                    }} />
                    {' ' + name}
                </span>
            )
            return {
                description: addressName,
                key: activityId,
                search: [
                    name,
                    activityId,
                    userId,
                    ownerAddress,
                ].join(' '),
                text,
                title: `${textsCap.id}: ${activityId}\n${textsCap.description}: ${description}`,
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
    return arrSort(options, 'search')
}
const getInitialState = (props, rxValues) => rxState => {
    const {
        projectHash: pph,
        activityId: pActivityId = pph
    } = props
    rxValues ??= new BehaviorSubject({})
    const values = timer.getValues()
    values[inputNames.batchData] = new Map(values[inputNames.batchData] || [])
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
    const rxBatch = new BehaviorSubject(false)
    const rxBatchData = new BehaviorSubject(new Map())
    // preserve batch & batchData to local storage
    rxBatch.subscribe(batch => timer.rxValues.next({
        [inputNames.batch]: batch
    }))
    rxBatchData.subscribe(data => timer.rxValues.next({
        [inputNames.batchData]: data,
    }))
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
            disabled: values => !values[inputNames.activityId] || !values[inputNames.workerAddress],
            name: inputNames.batch,
            options: [{
                key: 'a',
                label: textsCap.batchTime,
                value: true,
            }],
            onChange: (_, values) => !!values[inputNames.batch] && addBatchLine(true),
            rxValue: rxBatch,
            toggle: true,
            type: 'checkbox-group'
        },
        {

            autoComplete: 'off',
            hidden: values => values[inputNames.batch]
                || !values[inputNames.activityId]
                || !values[inputNames.workerAddress],
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
        { // keeps the duration input synced with timer
            hidden: true,
            name: inputNames.seconds,
            onChange: (_, values) => !values[inputNames.manualEntry]
                && rxDuration.next(timer.getDuration()),
            rxValue: timer.rxInterval,
        },
        { // keeps duration input in-sync with manually entry startus
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
        {
            content: (
                <DataTable {...{
                    key: 'datatable',
                    columns: [
                        {
                            collapsing: true,
                            content: ({ tsStarted = '', ...rest }, id) => (
                                <div>
                                    <FormInput {...{
                                        key: id,
                                        name: 'tsStarted',
                                        onChange: e => {
                                            const newTsStarted = e?.target?.value
                                            newTsStarted && rxBatchData.next(
                                                new Map(
                                                    rxBatchData.value.set(id, {
                                                        ...rest,
                                                        tsStarted: newTsStarted,
                                                    })
                                                )
                                            )
                                        },
                                        preservecursor: 'no',
                                        step: 1, // enables seconds
                                        style: {
                                            border: 'none',
                                            borderRadius: 0,
                                            height: 42,
                                        },
                                        type: 'datetime-local',
                                        value: tsStarted,
                                    }} />
                                </div>
                            ),
                            key: 'tsStarted',
                            style: { padding: 0 },
                            title: textsCap.startTime,
                        },
                        {
                            collapsing: true,
                            content: ({ tsStopped = '', ...rest }, id) => (
                                <div>
                                    <FormInput {...{
                                        key: id,
                                        name: 'tsStopped',
                                        onChange: e => {
                                            const tsStopped = e?.target?.value
                                            tsStopped && rxBatchData.next(
                                                new Map(
                                                    rxBatchData.value.set(id, {
                                                        ...rest,
                                                        tsStopped: tsStopped,
                                                    })
                                                )
                                            )
                                        },
                                        preservecursor: 'no',
                                        step: 1, // enables seconds
                                        style: {
                                            border: 'none',
                                            borderRadius: 0,
                                            height: 42,
                                        },
                                        type: 'datetime-local',
                                        value: tsStopped,
                                    }} />
                                </div>
                            ),
                            key: 'tsStopped',
                            style: { padding: 0 },
                            title: textsCap.endTime,
                        },
                        {
                            collapsing: true,
                            content: ({ duration = '', ...rest }, id) => (
                                <FormInput {...{
                                    key: id,
                                    name: 'duration',
                                    onChange: e => {
                                        const newDuration = e.target.value
                                        rxBatchData.next(
                                            new Map(
                                                rxBatchData.value.set(id, {
                                                    ...rest,
                                                    duration: newDuration,
                                                })
                                            )
                                        )
                                    },
                                    preservecursor: 'no',
                                    step: 1, // enables seconds
                                    style: {
                                        border: 'none',
                                        borderRadius: 0,
                                        height: 42,
                                    },
                                    type: 'time',
                                    value: duration,
                                }} />
                            ),
                            key: 'duration',
                            style: { padding: 0 },
                            title: textsCap.duration,
                        },
                        {
                            collapsing: true,
                            content: (_, key) => (
                                <Button {...{
                                    circular: true,
                                    icon: 'minus',
                                    onClick: e => {
                                        e.preventDefault()
                                        const map = rxBatchData.value
                                        map.delete(key)
                                        rxBatchData.next(new Map(map))
                                    },
                                    style: { margin: 0 },
                                    title: 'Remove'
                                }} />
                            ),
                            key: 'id',
                            style: { padding: 0 },
                            textAlign: 'center',
                        },
                    ],
                    data: rxBatchData,
                    defaultSort: 'id',
                    emptyMessage: null,
                    perPage: 10,
                    searchable: false,
                    // tableProps: {
                    // unstackable: false,
                    // },
                    topLeftMenu: [
                        {
                            content: 'Import CSV',
                            icon: 'file excel outline',
                            onClick: async (_si, _d, e) => {
                                e.preventDefault()
                                const importedData = await importFromFile()
                                if (!isArr(importedData)) return

                                const map = rxBatchData.value
                                importedData.forEach(entry =>
                                    map.set(entry.tsStarted, {
                                        ...entry,
                                        tsStarted: tsToLocalString(entry.tsStarted),
                                        tsStopped: entry.tsStopped
                                            ? tsToLocalString(entry.tsStopped)
                                            : undefined
                                    })
                                )
                                rxBatchData.next(
                                    new Map(map)
                                )
                            }
                        },
                        {
                            content: 'Add line',
                            icon: 'plus',
                            onClick: (_si, _d, e) => {
                                e.preventDefault()
                                addBatchLine()
                            },
                        }
                    ],
                }} />
            ),
            hidden: values => !values[inputNames.batch],
            name: inputNames.batchData,
            rxValue: rxBatchData,
            type: 'html',
            // validate: (e, data) => console.log('validate', { e, data }) || 'validate batch duration',
            widths: 16,
        }
    ]
    const addBatchLine = (onlyIfEmpty = false) => {
        const values = rxValues.value
        const map = rxBatchData.value
        const isEmpty = !map.size
        if (onlyIfEmpty && !isEmpty) return

        const ts = !isEmpty || !values.tsStarted
            ? new Date()
            : new Date(values.tsStarted)
        const id = new Date().toISOString()
        map.set(id, {
            id,
            duration: isEmpty
                && values[inputNames.duration]
                || DURATION_ZERO,
            tsStarted: tsToLocalString(ts),
        })
        rxBatchData.next(map)
    }

    // makes sure all the values from the timer is available in the rxValues
    // remove??
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
        rxBatchData,
        rxQueueId: new BehaviorSubject(),
        rxValues,
        values,
    }

    return state
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

const handleDurationChange = (_, values) => {
    if (!values[inputNames.manualEntry]) return

    const duration = values[inputNames.duration]
    const ignore = !duration
        || duration === DURATION_ZERO
        || !BLOCK_DURATION_REGEX.test(duration)
    if (ignore) return

    timer.setTimeByDuration(duration)
}

const importFromFile = () => new Promise((resolve) => {
    let data, modalId
    const validateFileSelected = (e) => new Promise((resolveValidate, rejectValidate) => {
        try {
            const file = e.target.files[0]
            const name = e.target.value
            var reader = new FileReader()
            if (!name || !name.endsWith('.csv')) throw {
                content: (
                    <div style={{ textAlign: 'left' }}>
                        {textsCap.invalidFile}
                        <ul>
                            <li>{textsCap.startTime} ({textsCap.format}: YYYY-MM-DD HH:mm:ss)</li>
                            <li>{textsCap.endTime} ({textsCap.format}: YYYY-MM-DD HH:mm:ss)</li>
                            <li>{textsCap.duration} ({textsCap.format}: HH:mm:ss)</li>
                        </ul>
                    </div>
                ),
                status: 'error'
            }

            reader.onload = file => {
                try {
                    const content = file.target.result
                    const keys = ['tsStarted', 'tsStopped', 'duration']
                    data = csvToArr(content, keys)
                        .filter(x => {
                            const valid = isValidDate(x.tsStarted)
                                && isValidDate(x.tsStopped)
                                && isValidDate(`2000-01-01T${x.duration}`)
                            if (valid) {
                                x.tsStarted = new Date(x.tsStarted).toISOString()
                                x.tsStopped = new Date(x.tsStopped).toISOString()
                            }
                            return valid
                        })
                        .map(x => objClean(x, keys))
                    if (!data.length) {
                        file.target.value = null // reset file
                        return resolveValidate()
                    }
                    resolveValidate()

                    setTimeout(() => {
                        resolve(data)
                        closeModal(modalId)
                    }, 100)
                } catch (err) {
                    rejectValidate(err)
                }
            }
            reader.readAsText(file)
        } catch (err) {
            resolveValidate(err)
        }
    })
    const inputs = [{
        accept: '.csv',
        label: 'Select a file',
        labelDetails: (
            <a href={sampleCSVFilePath} download>
                Download sample file.
            </a>
        ),
        name: 'file',
        required: true,
        type: 'file',
        validate: validateFileSelected,
    }]
    modalId = showForm(FormBuilder, {
        closeText: null,
        header: `${textsCap.timekeeping}: import CSV file`,
        inputs,
        onClose: () => resolve(),
        submitText: null,
    })
})

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
    const {
        message,
        rxBatchData,
        rxQueueId
    } = rxState.value
    message && rxState.next({ message: null })
    rxQueueId.value && rxQueueId.next(null) // reset any previous failed queue ID
    const { batch = false } = values
    const tValues = timer.getValues()
    const {
        tsStopped,
        inprogress,
        manualEntry
    } = tValues
    // pause timer
    if (!batch && inprogress) return timer.pause()

    const done = tsStopped || manualEntry
    // start/resume timer
    if (!batch && !done) return handleStartTimer(rxState)
    // proceed to submit time
    const activityId = values[inputNames.activityId]
    // make sure the activity ID is available in the activity options
    const activity = rxActivities
        ?.value
        ?.get
        ?.(activityId)
    if (!activity) return rxState.next({
        message: {
            header: textsCap.selectActivity,
            status: 'error',
        }
    })

    console.log({ values: values.batchData, rx: rxBatchData.value })

    const records = !batch
        ? [{
            ...values,
            ...tValues,
            duration: timer.getDuration(),
        }]
        : [...rxBatchData.value].map(([_batchItemId, record]) => {
            // add missing seconds
            let {
                duration,
                tsStarted,
                tsStopped,
            } = record
            if (duration?.length === 5) duration += ':00'
            const ignore = (
                !duration
                || !tsStarted
                || !tsStopped
                || !BLOCK_DURATION_REGEX.test(duration)
                || DURATION_ZERO === duration
                || !isValidDate(tsStarted)
                || !isValidDate(tsStopped)
            )
            return !ignore && {
                ...values,
                ...tValues,
                _batchItemId,
                duration,
                tsStarted,
                tsStopped,
            }
        }).filter(Boolean)
    if (!records.length) return

    const shouldConfirm = records.length > 1
    if (shouldConfirm) {
        const confirmed = await confirmAsPromise(
            {
                header: `${textsCap.msgCreateRecord} (${records.length})?`,
                confirmButton: {
                    content: textsCap.proceed,
                    positive: true,
                },
                content: (
                    <DataTable {...{
                        columns: [
                            {
                                content: ({ tsStarted }) => format(
                                    tsStarted,
                                    true,
                                    false,
                                    false
                                ),
                                key: 'tsStarted',
                                textAlign: 'center',
                                title: textsCap.startTime,
                            },
                            {
                                content: ({ tsStopped }) => format(
                                    tsStopped,
                                    true,
                                    false,
                                    false
                                ),
                                key: 'tsStopped',
                                textAlign: 'center',
                                title: textsCap.startTime,
                            },
                            {
                                key: 'duration',
                                textAlign: 'center',
                                title: textsCap.duration,
                            },
                        ],
                        containerProps: {
                            style: { margin: 0 },
                        },
                        data: records,
                        perPage: 100,
                        searchable: false,
                    }} />
                ),
                size: 'tiny'
            },
            null,
            { style: { padding: 0 } },
        )
        if (!confirmed) return
    }
    const results = []
    for (let i = 0;i < records.length;i++) {
        const record = records[i]
        const { _batchItemId } = record
        const success = await handleSubmitTime(
            props,
            rxState,
            activityId,
            NEW_RECORD_HASH, // specific ID used to indicate creation of new time record
            activity.name,
            record,
            statuses.submit,
            undefined,
            !shouldConfirm,
        ).catch(_ => false)
        results.push(success)
        if (!batch) continue

        if (!rxBatchData || !_batchItemId || !success) continue

        // if success, remove item from table
        rxBatchData.value.delete(_batchItemId)
        rxBatchData.next(
            new Map(rxBatchData.value)
        )
    }
    // clear timer and from values if all success
    results.every(x => x === true) && setTimeout(() => handleReset(rxState))
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
    doConfirm = true
) => {
    const isUpdate = recordId && recordId !== NEW_RECORD_HASH
    const { onSubmit } = props
    const { rxQueueId } = rxState.value
    const blockNumber = await subjectAsPromise(rxBlockNumber)[0]
    console.log('before', { ...values })
    const {
        breakCount = 0,
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
    const qDesc = [
        `${textsCap.activity}: ${activityName}`,
        `${textsCap.startTime}: ${format(tsStarted, true, false, false)}`,
        `${textsCap.duration}: ${values.duration}`
    ].join('\n')

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
            title: !isUpdate
                ? textsCap.msgCreateRecord
                : textsCap.msgUpdateRecord,
            description: qDesc,
        }
    )
    console.log({
        startedAt: blockToDate(blockNumber, blockStart),
        finishedAt: blockToDate(blockNumber, blockEnd),
    })

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
                startedAt: format(tsStarted, true, false, false),
                finishedAt: format(tsStopped, true, false, false),
            }],
        }} />
    )
    const confirmed = !doConfirm || await confirmAsPromise({
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

    rxState.next({
        closeText: textsCap.close,
        message: null,
        submitInProgress: true,
        success: false,
    })
    // execute the transaction
    const queueId = addToQueue(queueProps)
    rxQueueId.next(queueId)
    // wait until the transaction is completed
    const success = await awaitComplete(queueId) === 'success'
    rxState.next({
        closeText: undefined,
        submitInProgress: false,
        success,
    })
    isFn(onSubmit) && onSubmit(success, values)
    return success
}

const tsToLocalString = ts => {
    ts = new Date(ts)
    const ar = [
        ts.getFullYear(),
        ts.getMonth(),
        ts.getDate(),
        ts.getHours(),
        ts.getMinutes(),
        ts.getSeconds(),
    ]
    ar.forEach((x, i) =>
        ar[i] = strFill(
            x,
            i === 0 ? 4 : 2,
            '0',
            false
        )
    )
    return ar.slice(0, 3).join('-')
        + 'T'
        + ar.slice(3).join(':')
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
    const activity = rxActivities.value?.get?.(activityId)
    // activity non-existent in the options
    // this can happen if activityId is prefilled from previous sessions
    if (!activity) {
        setTimeout(() => activityIn.rxValue.next(null))
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

    const triggerRevalidate = () => {
        const { rxValue } = activityIn
        rxValue.next(null)
        setTimeout(() => rxValue.next(activityId), 100)
    }
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
                        success && triggerRevalidate()
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
                            onSubmit: ok => ok && triggerRevalidate(),
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