import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import { Button, Icon } from 'semantic-ui-react'
import { deferred, hasValue, isDefined, isFn, objCopy } from '../../utils/utils'
import { BLOCK_DURATION_SECONDS, BLOCK_DURATION_REGEX, durationToSeconds, secondsToDuration } from '../../utils/time'
import { ButtonAcceptOrReject } from '../../components/buttons'
import FormBuilder, { fillValues, findInput } from '../../components/FormBuilder'
// services
import { query as queryBlockchain, getCurrentBlock } from '../../services/blockchain'
import { translated } from '../../services/language'
import { confirm, closeModal, showForm } from '../../services/modal'
import { addToQueue } from '../../services/queue'
import { unsubscribe } from '../../services/react'
import { openStatuses, query as queryProject } from '../activity/activity'
import identities, { getSelected } from '../identity/identity'
import { getAddressName } from '../partner/partner'
import { saveFormData, getProjects, NEW_RECORD_HASH, query, queueables, statuses } from './timekeeping'
import { handleInvitation } from './notificationHandlers'

// Hash that indicates creation of new record
const DURATION_ZERO = '00:00:00'
const blockCountToDuration = blockCount => secondsToDuration(blockCount * BLOCK_DURATION_SECONDS)
const durationToBlockCount = duration => !BLOCK_DURATION_REGEX.test(duration) ? 0 :
    parseInt(durationToSeconds(duration) / BLOCK_DURATION_SECONDS)
const wordsCap = translated({
    activity: 'activity',
    close: 'close',
    duration: 'duration',
    error: 'error',
    identity: 'identity',
    no: 'no',
    project: 'project',
    proceed: 'proceed',
    start: 'start',
    submit: 'submit',
    success: 'success',
    timekeeping: 'timekeeping',
    unknown: 'unknown',
    update: 'update',
    yes: 'yes',
    wallet: 'wallet',
}, true)[1]
const [texts] = translated({
    addedToQueue: 'Added to queue',
    areYouSure: 'Are you sure?',
    blockEnd: 'End block',
    blockStart: 'Start block',
    cancelWarning: 'You have a running timer. Would you like to stop and exit?',
    checkingProjectStatus: 'Checking activity status...',
    durationChangeRequired: 'Rejected record requires duration change in order to re-sumbit',
    goBack: 'Go Back',
    hhmmss: 'hh:mm:ss', //????
    inactiveWorkerHeader1: 'You are not part of this Team! Request an invitation',
    inactiveWorkerHeader2: 'Action required',
    inactiveWorkerMsg1: 'Please select an activity you have been invited to and already accepted.',
    inactiveWorkerMsg3: 'You are yet to accept or reject invitation to join this activity team.',
    inactiveProjectSelected: 'This Activity is inactive!',
    invalidDuration: 'Invalid duration',
    invalidDurationMsgPart1: 'Please enter a valid duration using the following format:',
    manuallyEnterDuration: 'Manually enter duration',
    noContinueTimer: 'No, continue timer',
    noProjectsMsg: 'Create a new activity or ask to be invited to the Team',
    numberOfBlocks: 'Number of blocks',
    numberOfBreaks: 'Number of breaks',
    permissionDenied: 'Permission denied',
    recordSubmittedSuccessfully: 'Your Time record has been submitted for approval',
    requestQueuedMsg: 'Request has been added to queue. You will be notified of the progress shortly.',
    resetTimer: 'Reset the Timer',
    resetTimerWarning: 'You are about to reset your timer. Are you sure?',
    resumeTimer: 'Resume the timer',
    resumeTimeWarning: 'Would you like to resume timekeeping on this activity?',
    selectAProject: 'Select an Activity',
    selectActiveProject: 'Please select an active Activity',
    submitConfirmationMsg: 'Please verify the following information and click "Proceed" to submit your time record',
    submitTime: 'Submit time',
    timerStarted: 'Timer started',
    timerRunningMsg: 'You may now close the dialog. Return here at anytime by clicking on the clock icon in the header.',
    tkNewRecord: 'Timekeeping - New Record',
    transactionFailed: 'Blockchain transaction failed!',
    updateFormHeader: 'Timekeeping: Update Record',
    workerBannedMsg: 'Permission denied',
})

function handleDurationChange(e, formValues, i) {
    const { inputs, values } = this.state
    const valid = BLOCK_DURATION_REGEX.test(formValues.duration)
    const invalid = inputs[i].value === DURATION_ZERO && values.manualEntry ? true : !valid
    inputs[i].message = !invalid ? null : {
        content: (
            <span>
                {texts.invalidDurationMsgPart1}<br />
                <b>{texts.hhmmss}</b><br />
            </span>
        ),
        header: texts.invalidDuration,
        icon: true,
        status: 'error',
    }
    inputs[i].invalid = invalid
    inputs[i].error = invalid
    this.setState({ inputs: inputs })
}

async function handleSubmitTime(hash, projectName, values, status, reason, checkBanned = true) {
    const { address } = getSelected()
    if (checkBanned) {
        const banned = await query.worker.banned(hash, address)
        console.log({ banned })
        if (banned) return this.setState({
            message: {
                header: texts.permissionDenied,
                icon: true,
                status: 'error',
            }
        })
    }

    const { onSubmit } = this.props
    const { blockCount, blockEnd, blockStart, breakCount, duration, projectHash, workerAddress } = values
    const extraProps = {
        title: texts.tkNewRecord,
        description: `${wordsCap.activity}: ${projectName} | ${wordsCap.duration}: ${values.duration}`,
        then: success => {
            isFn(onSubmit) && onSubmit(success, values)
            this.setState({
                closeText: undefined,
                message: {
                    content: success ? texts.recordSubmittedSuccessfully : texts.transactionFailed,
                    header: success ? wordsCap.success : wordsCap.error,
                    icon: true,
                    status: success ? 'success' : 'error',
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
        content: texts.requestQueuedMsg,
        header: texts.addedToQueue,
        status: 'loading',
        icon: true
    }

    this.confirmId = showForm(FormBuilder, {
        header: `${texts.submitTime}?`,
        inputs: [
            [wordsCap.submit, getAddressName(workerAddress)],
            [wordsCap.activity, projectName],
            [wordsCap.duration, duration],
            [texts.numberOfBlocks, blockCount],
            [texts.numberOfBreaks, breakCount],
            [texts.blockStart, blockStart],
            [texts.blockEnd, blockEnd],
        ].map(x => ({
            readOnly: true,
            label: x[0],
            name: x[0],
            type: 'text',
            value: x[1]
        })),
        onSubmit: () => {
            closeModal(this.confirmId)
            // send task to queue service
            addToQueue(queueProps)
            this.setState({ closeText: wordsCap.close, message, submitDisabled: true })
        },
        size: 'tiny',
        subheader: texts.submitConfirmationMsg,
        submitText: wordsCap.proceed,
        closeText: texts.goBack,
    })
}

export default class TimekeepingForm extends Component {
    constructor(props) {
        super(props)

        const values = saveFormData() || {}
        const { breakCount, duration, durationValid, inprogress, projectHash, workerAddress } = values
        values.durationValid = !isDefined(durationValid) ? true : durationValid
        values.duration = duration || DURATION_ZERO
        values.breakCount = (breakCount || 0)
        values.workerAddress = workerAddress || getSelected().address
        const projectHashSupplied = hasValue(props.projectHash)
        values.projectHash = projectHashSupplied && !inprogress ? props.projectHash : projectHash

        this.state = {
            message: {},
            submitDisabled: false,
            values,
            inputs: [
                {
                    rxValue: new BehaviorSubject(),
                    clearable: true,
                    disabled: projectHashSupplied,
                    label: wordsCap.activity,
                    name: 'projectHash',
                    onChange: this.handleProjectChange,
                    options: [],
                    placeholder: texts.selectAProject,
                    required: true,
                    search: true,
                    selection: true,
                    selectOnNavigation: false,
                    type: 'dropdown',
                },
                {
                    rxValue: new BehaviorSubject(),
                    label: wordsCap.identity,
                    name: 'workerAddress',
                    type: 'dropdown',
                    options: [],
                    required: true,
                    search: true,
                    selection: true,
                    value: '',
                },
                {
                    autoComplete: 'off',
                    label: wordsCap.duration,
                    name: 'duration',
                    onChange: handleDurationChange.bind(this),
                    placeholder: texts.hhmmss,
                    readOnly: values.manualEntry !== true,
                    type: 'text',
                    value: DURATION_ZERO
                },
                {
                    rxValue: new BehaviorSubject(),
                    disabled: !!values.inprogress,
                    name: 'manualEntry',
                    options: [{
                        label: texts.manuallyEnterDuration,
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
            inprogress ? this.saveValues(blockNumber) : this.setState({ blockNumber })
        }
        const updateProjects = deferred(projects => {
            if (!this._mounted) return
            const { inputs, values } = this.state
            const projectIn = findInput(inputs, 'projectHash')
            const options = Array.from(projects).map(([hash, project]) => ({
                key: hash,
                project,
                text: project.name || wordsCap.unknown,
                value: hash,
            }))
            projectIn.options = options
            projectIn.noResultsMessage = options.length === 0 ? texts.noProjectsMsg : undefined
            // restore saved values
            if (!this.prefillDone) {
                fillValues(inputs, values, true)
                this.prefillDone = true
            }

            this.setState({ inputs })
        }, 100)
        this.subscriptions.newHead = await queryBlockchain('api.rpc.chain.subscribeNewHeads', [updateValues])
        this.subscriptions.blockNumber = await getCurrentBlock(updateValues)
        this.subscriptions.projects = await getProjects(false, updateProjects)

    }

    componentWillUnmount() {
        this._mounted = false
        unsubscribe(this.subscriptions)
    }

    // check if project is active (status = open or reopened)
    handleProjectChange = async (_, values, index) => {
        let { projectHash: projectId, workerAddress } = values
        const { inputs } = this.state
        const isValidProject = projectId && (inputs[index].options || []).find(x => x.value === projectId)
        if (!isValidProject) {
            // project hash doesnt exists in the options
            if (projectId) inputs[index].rxValue.next(null)
            return
        }

        inputs[index].loading = true
        inputs[index].message = {
            content: texts.checkingProjectStatus,
            icon: true,
            status: 'loading',
        }
        this.setState({ inputs, submitDisabled: true })

        // check if project status is open/reopened
        const statusCode = await queryProject.status(projectId)
        const projectActive = openStatuses.includes(statusCode)
        const { address } = getSelected()
        workerAddress = workerAddress || address
        inputs[index].invalid = !projectActive
        inputs[index].message = projectActive ? undefined : {
            content: texts.selectActiveProject,
            header: texts.inactiveProjectSelected,
            icon: true,
            status: 'error',
        }
        if (!projectActive) {
            // project is not active anymore
            inputs[index].loading = false
            return this.setState({ inputs, submitDisabled: false })
        }

        // check worker ban and invitation status
        const [banned, invitedAr, acceptedAr] = await Promise.all([
            query.worker.banned(projectId, workerAddress),
            query.worker.listInvited(projectId),
            query.worker.listWorkers(projectId),
        ])
        const invited = invitedAr.includes(workerAddress)
        const accepted = acceptedAr.includes(workerAddress)
        inputs[index].loading = false
        inputs[index].invalid = banned || !accepted

        if (banned) {
            // user has been banned by activity owner
            inputs[index].message = {
                content: texts.workerBannedMsg,
                icon: true,
                status: 'error',
            }
            return this.setState({ inputs, submitDisabled: false })
        }

        inputs[index].message = accepted ? undefined : {
            content: !invited ? texts.inactiveWorkerMsg1 : (
                <div>
                    {texts.inactiveWorkerMsg3} <br />
                    <ButtonAcceptOrReject
                        onAction={async (_, accepted) => {
                            const success = await handleInvitation(projectId, workerAddress, accepted)
                            // force trigger change
                            success && inputs[index].rxValue.next(projectId)
                        }}
                        style={{ marginTop: 10 }}
                    />
                </div>
            ),
            header: invited ? texts.inactiveWorkerHeader2 : texts.inactiveWorkerHeader1,
            icon: true,
            status: 'error',
        }
        this.setState({ inputs, submitDisabled: false })
        this.setIdentityOptions(projectId, workerAddress)
    }

    handleValuesChange = (_, formValues) => {
        let { inputs, values } = this.state
        values = objCopy(formValues, values)
        const { blockEnd, blockStart, manualEntry } = values
        const duraIn = inputs.find(x => x.name === 'duration')
        let duration
        if (manualEntry) {
            // switched from timer to manual mode
            duration = duraIn.readOnly ? blockCountToDuration(blockEnd - blockStart) : values.duration
        } else if (!manualEntry && !duraIn.readOnly) {
            // switched from manual to timer mode
            duration = values.duration
        }

        // Disable duration input when in timer mode
        duraIn.readOnly = !manualEntry
        this.setState({ inputs: inputs })
        setTimeout(() => this.saveValues(null, duration))
    }

    handleReset(userInitiated) {
        const { inputs, values } = this.state
        const doConfirm = userInitiated && values.duration && values.duration !== DURATION_ZERO
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
            saveFormData(values)
        }

        !doConfirm ? reset() : confirm({
            header: texts.resetTimer,
            content: texts.resetTimeWarning,
            onConfirm: () => reset(),
            confirmButton: wordsCap.yes,
            cancelButton: wordsCap.no,
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
        saveFormData(values)
    }

    setIdentityOptions = async (projectId, workerAddress) => {
        if (!projectId) return
        const { inputs } = this.state
        const identityIn = findInput(inputs, 'workerAddress')
        const allIdentities = identities.getAll()
        const workers = await query.worker.listWorkers(projectId)
        const options = allIdentities
            // exclude projects that hasn't been accepted yet
            .filter(({ address }) => workers.includes(address))
            .map(({ address, name }) => ({
                key: address,
                text: name,
                value: address,
            }))
        identityIn.options = options
        const hasOption = options.find(({ value }) => value === workerAddress)
        identityIn.rxValue.next(hasOption ? workerAddress : null)
        this.setState({ inputs })
    }

    render() {
        const { closeText: closeTextP, onClose } = this.props
        const { closeText, inputs, message, values } = this.state
        const { duration, stopped, inprogress, manualEntry } = values
        const durationValid = values && BLOCK_DURATION_REGEX.test(duration) && duration !== DURATION_ZERO
        const done = stopped || manualEntry
        const duraIn = inputs.find(x => x.name === 'duration')
        const btnStyle = { width: 'calc( 50% - 12px )', margin: '3px 3px 15px' }
        const doneItems = ['workerAddress', 'reset']
        inputs.filter(x => doneItems.indexOf(x.name) >= 0).forEach(x => x.hidden = !done)
        inputs.find(x => x.name === 'projectHash').disabled = inprogress
        duraIn.icon = manualEntry ? 'pencil' : null
        // Show resume item when timer is stopped
        duraIn.action = !stopped || manualEntry ? undefined : {
            icon: 'play',
            // prevents annoying HTML form validation warnings from showing up when clicked
            formNoValidate: true,
            onClick: () => confirm({
                header: texts.resumeTimer,
                content: texts.resumeTimeWarning,
                onConfirm: this.handleResume.bind(this),
                confirmButton: wordsCap.yes,
                cancelButton: wordsCap.no,
                size: 'mini'
            }),
            title: texts.resumeTimer,
        }

        const closeBtn = (
            <Button
                content={closeText || closeTextP}
                size="massive"
                style={btnStyle}
                onClick={(e, d) => {
                    const { values: { inprogress } } = this.state
                    const doCancel = () => this.handleReset(false) | isFn(onClose) && onClose(e, d)
                    !inprogress ? doCancel() : confirm({
                        cancelButton: texts.noContinueTimer,
                        confirmButton: wordsCap.yes,
                        content: texts.cancelWarning,
                        header: texts.areYouSure,
                        onConfirm: doCancel,
                        size: 'tiny'
                    })

                }}
            />
        )
        const submitBtn = (
            <Button
                icon
                disabled={(manualEntry || stopped) && !durationValid ? true : undefined}
                labelPosition={!!inprogress ? "right" : undefined}
                onClick={() => inprogress ? this.handleStop() : (done ? this.handleSubmit() : this.handleStart())}
                positive={!inprogress}
                color={inprogress ? 'grey' : undefined}
                size="massive"
                style={btnStyle}
            >
                {!inprogress ? (done ? wordsCap.submit : wordsCap.start) : (
                    <React.Fragment>
                        <Icon name="clock outline" loading={true} style={{ background: 'transparent' }} />
                        Stop
                    </React.Fragment>
                )}
            </Button>
        )

        return (
            <FormBuilder {...{
                ...this.props,
                ...this.state,
                closeText: closeBtn,
                inputs,
                message: !inprogress ? message : {
                    content: texts.timerRunningMsg,
                    header: texts.timerStarted,
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
    header: wordsCap.timekeeping,
    // prevents multiple modal being open
    modalId: 'TimekeepingForm',
    size: 'tiny'
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
                    label: wordsCap.duration,
                    name: 'duration',
                    onChange: this.handleDurationChange,
                    type: 'text',
                    required: true,
                },
                {
                    inline: true,
                    name: 'submit_status',
                    options: [
                        { label: 'Save as draft', value: statuses.draft },
                        { label: 'Submit for approval', value: statuses.submit }
                    ],
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

    handleDurationChange = (e, values, i) => {
        handleDurationChange.call(this, e, values, i)
        if (this.state.inputs[i].invalid) return
        const { inputs } = this.state
        const { duration } = values
        const { values: { duration: durationOriginal, status } } = this.props
        const input = inputs[i]
        input.invalid = status === statuses.reject && duration === durationOriginal
        input.message = !input.invalid ? null : {
            content: texts.durationChangeRequired,
            status: 'error',
        }
        this.setState({ inputs })
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
    closeText: wordsCap.close,
    closeOnEscape: false,
    closeOnDimmerClick: false,
    header: texts.updateFormHeader,
    size: 'tiny',
    submitText: wordsCap.update,
}