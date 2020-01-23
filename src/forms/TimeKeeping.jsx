
import React from 'react'
import PropTypes from 'prop-types'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import { chain } from 'oo7-substrate'
import { Button, Icon } from 'semantic-ui-react'
import { deferred, hasValue, isDefined, isFn, objCopy, objWithoutKeys, textCapitalize } from '../utils/utils'
import {
    BLOCK_DURATION_SECONDS,
    BLOCK_DURATION_REGEX,
    durationToSeconds,
    secondsToDuration,
} from '../utils/time'
import FormBuilder, { fillValues, findInput } from '../components/FormBuilder'
import { ButtonAcceptOrReject } from '../components/buttons'
// services
import identities, { getSelected } from '../services/identity'
import { confirm, closeModal, showForm } from '../services/modal'
import { handleTKInvitation } from '../services/notification'
import { getAddressName } from '../services/partners'
import projectService, { openStatuses } from '../services/project'
import { addToQueue, QUEUE_TYPES } from '../services/queue'
import storage from '../services/storage'
import timeKeeping, { getProjects, getProjectsBond, NEW_RECORD_HASH } from '../services/timeKeeping'

// Hash that indicates creation of new record
const DURATION_ZERO = '00:00:00'
const blockCountToDuration = blockCount => secondsToDuration(blockCount * BLOCK_DURATION_SECONDS)
const durationToBlockCount = duration => BLOCK_DURATION_REGEX.test(duration) ? durationToSeconds(duration) / BLOCK_DURATION_SECONDS : 0
const words = {
    duration: 'duration',
    error: 'error',
    identity: 'identity',
    no: 'no',
    project: 'project',
    proceed: 'proceed',
    start: 'start',
    submit: 'submit',
    success: 'success',
    unknown: 'unknown',
    yes: 'yes',
    wallet: 'wallet',
}
const wordsCap = textCapitalize(words)
const texts = {
    addedToQueue: 'Added to queue',
    areYouSure: 'Are you sure?',
    blockCount: 'Block Count',
    cancelWarning: 'You have a running timer. Would you like to stop and exit?',
    checkingProjectStatus: 'Checking project status...',
    goBack: 'Go Back',
    hhmmss: 'hh:mm:ss', //????
    inactiveWorkerHeader1: 'Uninvited project selected!',
    inactiveWorkerHeader2: 'Action required',
    inactiveWorkerMsg1: 'Please select a project you have been invited to and already accepted.',
    inactiveWorkerMsg3: 'You are yet to accept/reject invitation for this project.',
    inactiveProjectSelected: 'Inactive project selected!',
    invalidDuration: 'Invalid duration',
    invalidDurationMsgPart1: 'Please enter a valid duration in the following format:',
    invalidDurationMsgPart2: 'Seconds must be in increments of 5',
    manuallyEnterDuration: 'Manually enter duration',
    noContinueTimer: 'No, continue timer',
    noProjectsMsg: 'Create a new project or ask to be invited',
    recordSubmittedSuccessfully: 'Time record submitted successfully',
    requestQueuedMsg: 'Request has been added to queue. You will be notified of the progress shortly.',
    resetTimer: 'Reset Timer',
    resetTimerWarning: 'You are about to reset your timer. Are you sure?',
    resumeTimer: 'Resume timer',
    resumeTimeWarning: 'Would you like to resume timer?',
    selectAProject: 'Select a project',
    selectActiveProject: 'Please select an active project',
    submitConfirmationMsg: 'Please vefiry the following information and click "Proceed" to submit',
    submitTime: 'Submit time',
    timerStarted: 'Timer started',
    timeKeeping: 'Time Keeping',
    timerRunningMsg: 'You may now close the dialog and come back to it anytime by clicking on the clock icon in the header.',
    tkNewRecord: 'Time Keeping - New Record',
    transactionFailed: 'Blockchain transaction failed!',
    workerBannedMsg: 'Permission denied',
}

function handleDurationChange(e, formValues, i) {
    const { inputs, values } = this.state
    const valid = BLOCK_DURATION_REGEX.test(formValues.duration)
    const invalid = inputs[i].value === DURATION_ZERO && values.manualEntry ? true : !valid
    inputs[i].message = !invalid ? null : {
        content: (
            <span>
                {texts.invalidDurationMsgPart1}<br />
                <b>{texts.hhmmss}</b><br />
                {texts.invalidDurationMsgPart2}
            </span>
        ),
        header: texts.invalidDuration,
        showIcon: true,
        status: 'error',
    }
    inputs[i].invalid = invalid
    inputs[i].error = invalid
    this.setState({ inputs: inputs })
}

function handleSubmitTime(hash, projectName, values, status, reason, breakCount) {
    const { onSubmit } = this.props
    const { blockCount, blockEnd, blockStart, duration, projectHash, workerAddress } = values
    const queueProps = {
        address: workerAddress, // for balance check
        type: QUEUE_TYPES.BLOCKCHAIN,
        func: 'timeKeeping_record_save',
        args: [workerAddress, projectHash, hash, status, reason, blockCount, 0, blockStart, blockEnd, breakCount],
        title: texts.tkNewRecord,
        description: `${wordsCap.project}: ${projectName} | ${wordsCap.duration}: ${values.duration}`,
        then: success => {
            isFn(onSubmit) && onSubmit(success, values)
            if (!this.mounted) return
            this.setState({
                message: {
                    content: success ? texts.recordSubmittedSuccessfully : texts.transactionFailed,
                    header: success ? wordsCap.success : wordsCap.error,
                    showIcon: true,
                    status: success ? 'success' : 'error',
                },
            })
            success && this.handleReset & this.handleReset()
        },
    }

    const message = {
        content: texts.requestQueuedMsg,
        header: texts.addedToQueue,
        status: 'success',
        showIcon: true
    }

    this.confirmId = showForm(FormBuilder, {
        header: `${texts.submitTime}?`,
        inputs: [
            [wordsCap.submit, getAddressName(workerAddress)],
            [wordsCap.project, projectName],
            [wordsCap.duration, duration],
            [texts.blockCount, blockCount],
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
            this.setState({ message })
        },
        size: 'tiny',
        subheader: texts.submitConfirmationMsg,
        submitText: wordsCap.proceed,
        closeText: texts.goBack,
    })
}

export default class TimeKeepingForm extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.handleValuesChange = this.handleValuesChange.bind(this)
        this.saveValues = this.saveValues.bind(this)

        const values = storage.timeKeeping() || {}
        const { duration, durationValid, inprogress, projectHash } = values
        values.durationValid = !isDefined(durationValid) ? true : durationValid
        values.duration = duration || DURATION_ZERO
        const projectHashSupplied = hasValue(props.projectHash)
        values.projectHash = projectHashSupplied && !inprogress ? props.projectHash : projectHash

        this.state = {
            message: {},
            submitDisabled: false,
            values,
            inputs: [
                {
                    bond: new Bond(),
                    clearable: true,
                    disabled: projectHashSupplied,
                    inline: true,
                    label: wordsCap.project,
                    name: 'projectHash',
                    onChange: this.handleProjectChange.bind(this),
                    options: [],
                    placeholder: texts.selectAProject,
                    required: true,
                    search: true,
                    selection: true,
                    selectOnNavigation: false,
                    type: 'dropdown',
                },
                {
                    label: wordsCap.identity,
                    name: 'workerAddress',
                    type: 'dropdown',
                    options: [],
                    required: true,
                    search: true,
                    selection: true,
                },
                {
                    autoComplete: 'off',
                    label: wordsCap.duration,
                    name: 'duration',
                    onChange: deferred(handleDurationChange, 300, this),
                    placeholder: texts.hhmmss,
                    readOnly: values.manualEntry !== true,
                    type: 'text',
                    value: DURATION_ZERO
                },
                {
                    bond: new Bond(),
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
    }

    componentWillMount() {
        this.mounted = true
        this.tieId = chain.height.tie(blockNumber => {
            const { values: { inprogress } } = this.state
            blockNumber = parseInt(blockNumber)
            inprogress ? this.saveValues(blockNumber) : this.setState({ blockNumber })
        })
        this.tieIdProjects = getProjectsBond.tie(() => getProjects().then(projects => {
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
        }))
    }

    componentWillUnmount() {
        this.mounted = false
        chain.height.untie(this.tieId)
        getProjectsBond.untie(this.tieIdProjects)
    }

    // check if project is active (status = open or reopened)
    handleProjectChange(_, values, index) {
        const { projectHash } = values
        const { inputs } = this.state
        if (!projectHash) return

        inputs[index].loading = true
        inputs[index].message = {
            content: texts.checkingProjectStatus,
            showIcon: true,
            status: 'loading',
        }
        this.setState({ inputs, submitDisabled: true })

        // check if project status is open/reopened
        projectService.status(projectHash).then(statusCode => {
            const projectActive = openStatuses.includes(statusCode)
            const { address: workerAddress } = getSelected()
            inputs[index].invalid = !projectActive
            inputs[index].message = projectActive ? undefined : {
                content: texts.selectActiveProject,
                header: texts.inactiveProjectSelected,
                showIcon: true,
                status: 'error',
            }
            if (!projectActive) {
                inputs[index].loading = false
                return this.setState({ inputs, submitDisabled: false })
            }
            // check if worker's ban and invitation status
            Bond.all([
                timeKeeping.worker.accepted(projectHash, workerAddress),
                timeKeeping.worker.banned(projectHash, workerAddress),
            ]).then(([accepted, banned]) => {
                inputs[index].loading = false
                inputs[index].invalid = banned || !accepted // null => not invited, false => not responded/aceepted
                const invited = accepted === false
                inputs[index].message = banned ? texts.workerBannedMsg : accepted ? undefined : {
                    content: !invited ? texts.inactiveWorkerMsg1 : (
                        <div>
                            {texts.inactiveWorkerMsg3} <br />
                            <ButtonAcceptOrReject
                                onClick={ok => handleTKInvitation(projectHash, workerAddress, ok)}
                            />
                        </div>
                    ),
                    header: invited ? texts.inactiveWorkerHeader2 : texts.inactiveWorkerHeader1,
                    showIcon: true,
                    status: 'error',
                }
                this.setState({ inputs, submitDisabled: false })
            })
        })
    }

    handleValuesChange(_, formValues) {
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
            inputs.find(x => x.name === 'duration').value = DURATION_ZERO
            this.setState({ values, inputs })
            storage.timeKeeping(values)
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
        const meIn = inputs.find(x => x.name === 'manualEntry')
        meIn.defaultChecked = false
        meIn.disabled = true
        this.setState({ inputs, values })
        setTimeout(this.saveValues)
    }

    handleSubmit() {
        const { inputs, values } = this.state
        const { projectHash } = this.props
        const projectOption = findInput(inputs, 'projectHash').options
            .find(option => option.value === projectHash) || {}
        const projectName = projectOption.text
        const reason = {
            ReasonCodeKey: 0,
            ReasonCodeTypeKey: 0
        }
        handleSubmitTime.call(this, NEW_RECORD_HASH, projectName, values, 0, reason, 0)
    }

    saveValues(currentBlockNumber, newDuration) {
        const { blockNumber, inputs, values } = this.state
        const { blockEnd, blockStart, inprogress } = values

        const duraIn = inputs.find(x => x.name === 'duration')
        currentBlockNumber = currentBlockNumber || blockNumber
        if (!!newDuration) {
            values.duration = newDuration
            values.blockCount = durationToBlockCount(newDuration)
            values.blockEnd = currentBlockNumber
            values.blockStart = currentBlockNumber - values.blockCount
        } else {
            values.blockEnd = inprogress ? currentBlockNumber : blockEnd
            values.blockCount = values.blockEnd - blockStart
            values.blockStart = values.blockEnd - values.blockCount
            values.duration = blockCountToDuration(values.blockEnd - blockStart)
        }
        duraIn.value = values.duration
        values.durationValid = BLOCK_DURATION_REGEX.test(values.duration) && values.duration !== DURATION_ZERO
        this.setState({ blockNumber: currentBlockNumber, inputs, message: {}, values })
        storage.timeKeeping(values)
    }

    render() {
        const { onClose } = this.props
        const { inputs, message, values } = this.state
        const { duration, stopped, inprogress, manualEntry } = values
        const durationValid = values && BLOCK_DURATION_REGEX.test(duration) && duration !== DURATION_ZERO
        const done = stopped || manualEntry
        const duraIn = inputs.find(x => x.name === 'duration')
        const btnStyle = { width: 'calc( 50% - 12px )', margin: 3 }
        const doneItems = ['workerAddress', 'reset']
        inputs.filter(x => doneItems.indexOf(x.name) >= 0).forEach(x => x.hidden = !done)
        inputs.find(x => x.name === 'projectHash').disabled = inprogress
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

        // set wallet options
        inputs.find(x => x.name === 'workerAddress')
            .options = identities.getAll().map((wallet, key) => ({
                key,
                text: wallet.name,
                value: wallet.address
            }))

        const closeBtn = (
            <Button
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
                closeText: closeBtn,
                inputs,
                message: !inprogress ? message : {
                    content: texts.timerRunningMsg,
                    header: texts.timerStarted,
                    showIcon: true,
                    status: 'info'
                },
                onChange: this.handleValuesChange,
                submitText: submitBtn
            }} />
        )
    }
}
TimeKeepingForm.defaultProps = {
    closeOnEscape: true,
    closeOnDimmerClick: true,
    header: texts.timeKeeping,
    size: 'tiny'
}

TimeKeepingForm.propTypes = {
    projectHash: PropTypes.string,
}
// ToDo: separate file and text extraction for language
export class TimeKeepingUpdateForm extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.state = {
            message: {},
            values: props.values || {},
            inputs: [
                {
                    label: 'Duration',
                    name: 'duration',
                    onChange: deferred(handleDurationChange, 300, this),
                    type: 'text',
                    required: true,
                },
            ]
        }

        fillValues(this.state.inputs, props.values, true)
    }

    handleSubmit(e, { duration }) {
        const { hash, projectName, values } = this.props
        const blockCount = durationToBlockCount(duration)
        const blockEnd = values.blockStart + blockCount
        handleSubmitTime.call(this, hash, projectName, { ...values, blockCount, blockEnd, duration })
    }

    render() {
        const { inputs, message } = this.state
        return <FormBuilder {...objCopy({
            inputs,
            message,
            onSubmit: this.handleSubmit.bind(this),
        }, objWithoutKeys(this.props, ['entry', 'hash']))} />
    }
}

TimeKeepingUpdateForm.propTypes = {
    // record hash
    hash: PropTypes.string.isRequired,
    projectName: PropTypes.string.isRequired,
    // record values
    values: PropTypes.shape({
        blockCount: PropTypes.number.isRequired,
        blockEnd: PropTypes.number.isRequired,
        blockStart: PropTypes.number.isRequired,
        duration: PropTypes.string.isRequired,
        projectHash: PropTypes.string.isRequired,
        workerAddress: PropTypes.string.isRequired,
    }).isRequired
}

TimeKeepingUpdateForm.defaultProps = {
    closeText: 'Close',
    closeOnEscape: false,
    closeOnDimmerClick: false,
    header: 'Time Keeping: Update Record',
    size: 'tiny',
    submitText: 'Update',
}