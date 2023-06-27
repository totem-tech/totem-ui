import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import { Button } from 'semantic-ui-react'
import {
    deferred,
    hasValue,
    isDefined,
    isFn,
} from '../../utils/utils'
import {
    BLOCK_DURATION_SECONDS,
    BLOCK_DURATION_REGEX,
    durationToSeconds,
    secondsToDuration,
    blockToDate,
} from '../../utils/time'
import { ButtonAcceptOrReject } from '../../components/buttons'
import FormBuilder, { fillValues, findInput } from '../../components/FormBuilder'
import DataTableVertical from '../../components/DataTableVertical'
// services
import { rxBlockNumber } from '../../services/blockchain'
import { translated } from '../../utils/languageHelper'
import { confirm, confirmAsPromise } from '../../services/modal'
import { addToQueue } from '../../services/queue'
import { unsubscribe } from '../../utils/reactjs'
import { openStatuses, query as queryProject } from '../activity/activity'
import { getSelected } from '../identity/identity'
import AddressName from '../partner/AddressName'
import {
    timerFormValues,
    getProjects,
    NEW_RECORD_HASH,
    query,
    queueables,
    statuses,
} from './timekeeping'
import { handleInvitation } from './notificationHandlers'
import { getIdentityOptions } from '../identity/getIdentityOptions'
import { subjectAsPromise } from '../../utils/reactjs'
import PromisE from '../../utils/PromisE'

// Hash that indicates creation of new record
const DURATION_ZERO = '00:00:00'
const blockCountToDuration = blockCount => secondsToDuration(blockCount * BLOCK_DURATION_SECONDS)
const durationToBlockCount = duration => !BLOCK_DURATION_REGEX.test(duration)
    ? 0
    : parseInt(durationToSeconds(duration) / BLOCK_DURATION_SECONDS)

let textsCap = {
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
    recordSubmittedSuccessfully: 'your time record has been submitted for approval',
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
textsCap = translated(textsCap, true)[1]

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

async function handleSubmitTime(hash, projectName, values, status, reason, checkBanned = true) {
    const { address } = getSelected()
    if (checkBanned) {
        const banned = await query.worker.banned(hash, address)
        if (banned) return this.setState({
            message: {
                header: textsCap.permissionDenied,
                icon: true,
                status: 'error',
            }
        })
    }

    const { onSubmit } = this.props
    const {
        blockCount,
        blockEnd,
        blockStart,
        breakCount,
        duration,
        projectHash,
        workerAddress,
    } = values
    const extraProps = {
        title: textsCap.newRecord,
        description: `${textsCap.activity}: ${projectName} | ${textsCap.duration}: ${values.duration}`,
        then: success => {
            isFn(onSubmit) && onSubmit(success, values)
            this.setState({
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
                submitDisabled: false,
                success,
            })
            success && this.handleReset && this.handleReset()
        },
    }
    const queueProps = queueables.record.save(
        workerAddress,
        projectHash,
        hash,
        status,
        reason,
        blockCount,
        0,
        blockStart,
        blockEnd,
        breakCount,
        extraProps
    )

    const message = {
        content: `${textsCap.requestQueuedMsg1} ${textsCap.requestQueuedMsg2}`,
        header: textsCap.addedToQueue,
        status: 'loading',
        icon: true
    }
    const currentBlock = await subjectAsPromise(rxBlockNumber)[0]
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
                activity: projectName,
                duration: duration,
                numberOfBlocks: blockCount,
                numberOfBreaks: breakCount,
                startedAt: blockToDate(currentBlock, blockStart),
                finishedAt: blockToDate(currentBlock, blockEnd),
            }],
        }} />
    )

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

    addToQueue(queueProps)
    this.setState({
        closeText: textsCap.close,
        message,
        submitDisabled: true,
    })
}

export default class TimekeepingForm extends Component {
    constructor(props) {
        super(props)

        const values = timerFormValues() || {}
        const {
            breakCount,
            duration,
            durationValid,
            inprogress,
            projectHash,
            workerAddress
        } = values
        values.durationValid = !isDefined(durationValid) || durationValid
        values.duration = duration || DURATION_ZERO
        values.breakCount = (breakCount || 0)
        values.workerAddress = workerAddress || getSelected().address
        const projectHashSupplied = hasValue(props.projectHash)
        values.projectHash = projectHashSupplied && !inprogress
            ? props.projectHash
            : projectHash

        this.state = {
            message: {},
            submitDisabled: false,
            values,
            inputs: [
                {
                    rxValue: new BehaviorSubject(),
                    clearable: true,
                    disabled: projectHashSupplied,
                    label: textsCap.activity,
                    name: 'projectHash',
                    onChange: this.handleProjectChange,
                    options: [],
                    placeholder: textsCap.selectAProject,
                    required: true,
                    search: true,
                    selection: true,
                    selectOnNavigation: false,
                    type: 'dropdown',
                },
                {
                    rxValue: new BehaviorSubject(),
                    label: textsCap.identity,
                    name: 'workerAddress',
                    type: 'dropdown',
                    options: [],
                    required: true,
                    search: ['keywords'],
                    selection: true,
                    value: '',
                },
                {
                    autoComplete: 'off',
                    label: textsCap.duration,
                    name: 'duration',
                    // onChange: handleDurationChange.bind(this),
                    placeholder: 'hh:mm:ss',
                    readOnly: values.manualEntry !== true,
                    type: 'text',
                    validate: handleValidateDuration,
                    value: DURATION_ZERO
                },
                {
                    rxValue: new BehaviorSubject(),
                    disabled: !!values.inprogress,
                    multiple: false,
                    name: 'manualEntry',
                    options: [{
                        label: textsCap.manuallyEnterDuration,
                        value: true
                    }],
                    required: false,
                    type: 'checkbox-group',
                },
            ]
        }

        this.originalSetState = this.setState
        this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
    }

    async componentWillMount() {
        this._mounted = true
        this.subscriptions = {}
        const updateValues = blockNumber => {
            if (!this._mounted) return
            const { values: { inprogress } } = this.state
            inprogress
                ? this.saveValues(blockNumber)
                : this.setState({ blockNumber })
        }
        const updateProjects = deferred(projects => {
            if (!this._mounted) return
            const { inputs, values } = this.state
            const projectIn = findInput(inputs, 'projectHash')
            const options = Array
                .from(projects)
                .map(([hash, project]) => {
                    const { name, ownerAddress, userId } = project
                    return {
                        description: (
                            <AddressName {...{
                                address: ownerAddress,
                                title: textsCap.activityOwner,
                                userId,
                            }} />
                        ),
                        key: hash,
                        project,
                        text: name || textsCap.unknown,
                        value: hash,
                    }
                })
            projectIn.options = options
            projectIn.noResultsMessage = options.length === 0
                ? textsCap.noProjectsMsg
                : undefined
            // restore saved values
            if (!this.prefillDone) {
                fillValues(inputs, values, true)
                this.prefillDone = true
            }

            this.setState({ inputs })
        }, 100)
        // this.subscriptions.newHead = await queryBlockchain('api.rpc.chain.subscribeNewHeads', [updateValues])
        // this.subscriptions.blockNumber = await getCurrentBlock(updateValues)
        this.subscriptions.blockNumber = rxBlockNumber.subscribe(updateValues)
        this.subscriptions.projects = await getProjects(true, updateProjects)

    }

    componentWillUnmount() {
        this._mounted = false
        unsubscribe(this.subscriptions)
    }

    // check if project is active (status = open or reopened)
    handleProjectChange = async (_, values, index) => {
        let {
            projectHash: projectId,
            workerAddress = getSelected()?.address
        } = values
        const { inputs } = this.state
        const isValidProject = projectId
            && (inputs[index].options || [])
                .find(x => x.value === projectId)
        if (!isValidProject) {
            // project hash doesnt exists in the options
            if (projectId) inputs[index].rxValue.next(null)
            return
        }

        inputs[index].loading = true
        inputs[index].message = {
            content: textsCap.checkingProjectStatus,
            icon: true,
            status: 'loading',
        }
        this.setState({ inputs, submitDisabled: true })

        // check if project status is open/reopened
        const statusCode = await queryProject.status(projectId)
        const projectActive = openStatuses.includes(statusCode)
        inputs[index].invalid = !projectActive
        inputs[index].message = !projectActive && {
            content: textsCap.selectActiveProject,
            header: textsCap.inactiveProjectSelected,
            icon: true,
            status: 'error',
        }
        if (!projectActive) {
            // project is not active anymore
            inputs[index].loading = false
            return this.setState({ inputs, submitDisabled: false })
        }

        await PromisE.delay(300)
        // check worker ban and invitation status
        const [
            banned,
            invitedAr,
            acceptedAr
        ] = await Promise.all([
            query.worker.banned(projectId, workerAddress),
            query.worker.listInvited(projectId),
            query.worker.listWorkers(projectId),
        ])
        const invited = invitedAr.includes(workerAddress)
        const accepted = acceptedAr.includes(workerAddress)
        console.log({ workerAddress, invited, accepted })
        inputs[index].loading = false
        inputs[index].invalid = banned || !accepted

        if (banned) {
            // user has been banned by activity owner
            inputs[index].message = {
                content: textsCap.workerBannedMsg,
                icon: true,
                status: 'error',
            }
            return this.setState({ inputs, submitDisabled: false })
        }

        inputs[index].message = accepted
            ? undefined
            : {
                content: !invited
                    ? textsCap.inactiveWorkerMsg1
                    : (
                        <div>
                            {textsCap.inactiveWorkerMsg3} <br />
                            <ButtonAcceptOrReject
                                onAction={async (_, accepted) => {
                                    const success = await handleInvitation(
                                        projectId,
                                        workerAddress,
                                        accepted
                                    )
                                    // force trigger change
                                    success && inputs[index].rxValue.next(projectId)
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
        this.setState({ inputs, submitDisabled: false })
        this.setIdentityOptions(projectId, workerAddress)
    }

    handleValuesChange = (_, formValues) => {
        let { inputs, values } = this.state
        values = { ...values, ...formValues }
        const { blockEnd, blockStart, manualEntry } = values
        const duraIn = inputs.find(x => x.name === 'duration')
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
        this.setState({ inputs, values })
        setTimeout(() => this.saveValues(null, duration))
    }

    handleReset(userInitiated) {
        const { inputs, values } = this.state
        const doConfirm = userInitiated
            && values.duration
            && values.duration !== DURATION_ZERO
        const reset = () => {
            values.blockStart = 0
            values.blockEnd = 0
            values.blockCount = 0
            values.duration = DURATION_ZERO
            values.inprogress = false
            values.stopped = false
            values.breakCount = 0
            inputs.find(x => x.name === 'duration').value = DURATION_ZERO
            this.setState({ values, inputs })
            timerFormValues(values)
        }

        !doConfirm
            ? reset()
            : confirm({
                header: textsCap.resetTimer,
                // content: textsCap.resetTimeWarning,
                onConfirm: () => reset(),
                confirmButton: textsCap.yes,
                cancelButton: textsCap.no,
                size: 'mini'
            })
    }

    handleStart() {
        const { blockNumber, inputs, values } = this.state
        inputs.find(x => x.name === 'manualEntry').disabled = true
        const duraIn = inputs.find(x => x.name === 'duration')
        duraIn.readOnly = true
        duraIn.message = null
        values.workerAddress = getSelected().address
        values.blockCount = durationToBlockCount(values.duration)
        values.blockStart = blockNumber - values.blockCount
        values.stopped = false
        values.inprogress = true
        values.durationValid = true
        this.setState({ inputs, values })
        setTimeout(this.saveValues)
    }

    handleStop() {
        const { blockNumber, inputs, values } = this.state
        inputs.find(x => x.name === 'manualEntry').disabled = false
        values.blockEnd = blockNumber
        values.inprogress = false
        values.stopped = true
        this.setState({ inputs, values })
        setTimeout(this.saveValues)
    }

    handleResume() {
        const { blockNumber, inputs, values } = this.state
        values.blockCount = durationToBlockCount(values.duration)
        values.blockEnd = blockNumber
        values.blockStart = blockNumber - values.blockCount
        values.inprogress = true
        values.stopped = false
        values.manualEntry = undefined
        values.breakCount++
        const meIn = inputs.find(x => x.name === 'manualEntry')
        meIn.defaultChecked = false
        meIn.disabled = true
        this.setState({ inputs, values })
        setTimeout(this.saveValues)
    }

    handleSubmit() {
        const { inputs, values } = this.state
        const { projectHash } = values
        const projectOption = findInput(inputs, 'projectHash').options
            .find(option => option.value === projectHash) || {}
        const projectName = projectOption.text
        handleSubmitTime.call(this, NEW_RECORD_HASH, projectName, values, statuses.submit)
    }

    saveValues = (currentBlockNumber, newDuration) => {
        const { blockNumber, inputs, values } = this.state
        const { blockEnd, blockStart, inprogress } = values

        const duraIn = inputs.find(x => x.name === 'duration')
        currentBlockNumber = currentBlockNumber || blockNumber
        if (!!newDuration) {
            values.duration = newDuration
            values.blockCount = durationToBlockCount(newDuration)
            values.blockEnd = currentBlockNumber
            values.blockStart = blockStart || (currentBlockNumber - values.blockCount)
        } else {
            values.blockEnd = inprogress ? currentBlockNumber : blockEnd
            values.blockCount = values.blockEnd - blockStart
            values.blockStart = blockStart || (values.blockEnd - values.blockCount)
            values.duration = blockCountToDuration(values.blockCount)
        }
        if (values.blockEnd - values.blockStart < values.blockCount) {
            // hacky fix
            values.blockStart = values.blockEnd - values.blockCount
        }
        duraIn.value = values.duration
        values.durationValid = BLOCK_DURATION_REGEX.test(values.duration) && values.duration !== DURATION_ZERO
        this.setState({ blockNumber: currentBlockNumber, inputs, message: {}, values })
        timerFormValues(values)
    }

    setIdentityOptions = async (projectId, workerAddress) => {
        if (!projectId) return
        const { inputs } = this.state
        const workers = await query.worker.listWorkers(projectId)
        const identityIn = findInput(inputs, 'workerAddress')
        identityIn.options = getIdentityOptions()
            .filter(x => workers.includes(x.value))
        const isWorker = !!identityIn
            .options
            .find(({ value }) =>
                value === workerAddress
            )
        identityIn.rxValue.next(
            isWorker
                ? workerAddress
                : null
        )
        this.setState({ inputs })
    }

    render() {
        const { closeText: closeTextP, onClose } = this.props
        const { closeText, inputs, message, values } = this.state
        const { duration, stopped, inprogress, manualEntry } = values
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
        inputs.find(x => x.name === 'projectHash').disabled = inprogress
        duraIn.icon = manualEntry ? 'pencil' : null
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
                    onConfirm: this.handleResume.bind(this),
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
                    } = this.state
                    const doCancel = () => {
                        this.handleReset(false)
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
            // style: { background: 'transparent' },
        }
        const submitBtn = (
            <Button {...{
                content: !inprogress
                    ? done
                        ? textsCap.submit
                        : textsCap.start
                    : textsCap.stop,
                icon,
                disabled: (manualEntry || stopped) && !durationValid
                    ? true
                    : undefined,
                // labelPosition: !!inprogress
                //     ? 'right'
                //     : undefined,
                onClick: () => inprogress
                    ? this.handleStop()
                    : done
                        ? this.handleSubmit()
                        : this.handleStart(),
                positive: !inprogress,
                color: inprogress
                    ? 'grey'
                    : undefined,
                size: 'massive',
                style: btnStyle,
            }} />
        )

        return (
            <FormBuilder {...{
                ...this.props,
                ...this.state,
                closeText: closeBtn,
                inputs,
                message: !inprogress
                    ? message
                    : {
                        content: `${textsCap.timerRunningMsg1} ${textsCap.timerRunningMsg2}`,
                        header: textsCap.timerStarted,
                        icon: true,
                        status: 'info'
                    },
                onChange: this.handleValuesChange,
                submitText: submitBtn
            }} />
        )
    }
}
TimekeepingForm.defaultProps = {
    closeOnEscape: true,
    closeOnDimmerClick: true,
    header: textsCap.timekeeping,
    // prevents multiple modal being open
    modalId: 'TimekeepingForm',
    size: 'tiny',
}

TimekeepingForm.propTypes = {
    projectHash: PropTypes.string,
}
// ToDo: separate file and text extraction for language
export class TimekeepingUpdateForm extends Component {
    constructor(props) {
        super(props)

        this.state = {
            message: {},
            onSubmit: this.handleSubmit,
            values: props.values || {},
            inputs: [
                {
                    rxValue: new BehaviorSubject(),
                    label: textsCap.duration,
                    name: 'duration',
                    type: 'text',
                    required: true,
                    validate: this.handleValidateDuration,
                },
                {
                    inline: true,
                    name: 'submit_status',
                    options: [
                        { label: textsCap.saveAsDraft, value: statuses.draft },
                        { label: textsCap.submitForApproval, value: statuses.submit }
                    ],
                    // manually trigger validation of duration
                    onChange: (event, values) => {
                        const { inputs } = this.state
                        const durationIn = findInput(inputs, 'duration')
                        durationIn.rxValue.next('')
                        const { duration } = values
                        setTimeout(() => durationIn.rxValue.next(duration))
                    },
                    required: true,
                    type: 'radio-group',
                },
            ]
        }

        fillValues(this.state.inputs, props.values, true)

        this.originalSetState = this.setState
        this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
    }

    componentWillMount = () => this._mounted = true

    componentWillUnmount = () => this._mounted = false

    handleValidateDuration = (e, _, values) => {
        let err = handleValidateDuration(e, _, values)
        if (err) return err

        // require a value change if record was rejected or setting back to draft
        const { duration, submit_status: newStatus } = values
        const {
            values: {
                duration: durationOriginal,
                status: currentStatus,
            } = {}
        } = this.props
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

    handleSubmit = async (_, { duration, submit_status }) => {
        const { hash: recordId, projectName, values } = this.props
        const blockCount = durationToBlockCount(duration)
        const blockEnd = values.blockStart + blockCount
        const record = await query.record.get(recordId)
        const { nr_of_breaks, reason_code } = { record }
        const newValues = {
            ...values,
            blockCount,
            blockEnd,
            breakCount: nr_of_breaks || 0,
            duration,
        }
        await handleSubmitTime.call(this, recordId, projectName, newValues, submit_status, reason_code)
    }

    render = () => <FormBuilder {...{ ...this.props, ...this.state }} />
}

TimekeepingUpdateForm.propTypes = {
    // record hash
    hash: PropTypes.string.isRequired,
    // record values
    values: PropTypes.shape({
        blockCount: PropTypes.number.isRequired,
        blockEnd: PropTypes.number.isRequired,
        blockStart: PropTypes.number.isRequired,
        duration: PropTypes.string.isRequired,
        projectHash: PropTypes.string.isRequired,
        projectName: PropTypes.string.isRequired,
        status: PropTypes.number.isRequired,
        workerAddress: PropTypes.string.isRequired,
    }).isRequired
}

TimekeepingUpdateForm.defaultProps = {
    closeText: textsCap.close,
    closeOnEscape: false,
    closeOnDimmerClick: false,
    header: `${textsCap.timekeeping} - ${textsCap.updateFormHeader}`,
    size: 'tiny',
    submitText: textsCap.update,
}