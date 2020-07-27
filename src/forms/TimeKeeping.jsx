
import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Bond } from 'oo7'
import { Button, Icon } from 'semantic-ui-react'
import { deferred, hasValue, isDefined, isFn, objCopy } from '../utils/utils'
import {
    BLOCK_DURATION_SECONDS,
    BLOCK_DURATION_REGEX,
    durationToSeconds,
    secondsToDuration,
} from '../utils/time'
import FormBuilder, { fillValues, findInput } from '../components/FormBuilder'
import { ButtonAcceptOrReject } from '../components/buttons'
// services
import { query as queryBlockchain } from '../services/blockchain'
import identities, { getSelected } from '../services/identity'
import { translated } from '../services/language'
import { confirm, closeModal, showForm } from '../services/modal'
import { handleTKInvitation } from '../modules/notification/notification'
import { getAddressName } from '../services/partner'
import project, { openStatuses, query as queryProject } from '../services/project'
import { addToQueue } from '../services/queue'
import {
    formData,
    getProjects,
    NEW_RECORD_HASH,
    query,
    queueables,
    statuses
} from '../services/timeKeeping'

// Hash that indicates creation of new record
const DURATION_ZERO = '00:00:00'
const blockCountToDuration = blockCount => secondsToDuration(blockCount * BLOCK_DURATION_SECONDS)
const durationToBlockCount = duration => BLOCK_DURATION_REGEX.test(duration) ?
    durationToSeconds(duration) / BLOCK_DURATION_SECONDS : 0
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
    inactiveWorkerMsg3: 'You are yet to accept/reject invitation for this activity.',
    inactiveProjectSelected: 'This Activity is inactive!',
    invalidDuration: 'Invalid duration',
    invalidDurationMsgPart1: 'Please enter a valid duration using the following format:',
    invalidDurationMsgPart2: 'Seconds must be in increments of 5',
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

async function handleSubmitTime(hash, projectName, values, status, reason, checkBanned = true) {
    const { address } = getSelected()
    if (checkBanned) {
        const banned = await query.worker.banned(hash, address)
        console.log({ banned })
        if (banned) return this.setState({
            message: {
                header: texts.permissionDenied,
                showIcon: true,
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
                    showIcon: true,
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
        tatus,
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
        showIcon: true
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

export default class TimeKeepingForm extends Component {
    constructor(props) {
        super(props)

        const values = formData() || {}
        const { breakCount, duration, durationValid, inprogress, projectHash, stopped, workerAddress } = values
        values.durationValid = !isDefined(durationValid) ? true : durationValid
        values.duration = duration || DURATION_ZERO
        values.breakCount = (breakCount || 0)
        values.workerAddress = inprogress || stopped && workerAddress || getSelected().address
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
                    bond: new Bond(),
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

        this.originalSetState = this.setState
        this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
    }

    async componentWillMount() {
        this._mounted = true
        this.unsubscribers = {}
        const updateValues = newHead => {
            if (!this._mounted) return
            const { values: { inprogress } } = this.state
            newHead.number = parseInt(newHead.number)
            inprogress ? this.saveValues(newHead.number) : this.setState({ blockNumber: newHead.number })
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
        this.unsubscribers.newHead = await queryBlockchain('api.rpc.chain.subscribeNewHeads', [updateValues])
        this.unsubscribers.projects = await getProjects(false, updateProjects)

    }

    componentWillUnmount() {
        this._mounted = false
        Object.values(this.unsubscribers).forEach(fn => isFn(fn) && fn)
    }

    // check if project is active (status = open or reopened)
    handleProjectChange = async (_, values, index) => {
        let { projectHash: projectId, workerAddress } = values
        const { inputs } = this.state
        const isValidProject = projectId && (inputs[index].options || []).find(x => x.value === projectId)
        if (!isValidProject) {
            // project hash doesnt exists in the options
            if (projectId) inputs[index].bond.changed(null)
            return
        }

        inputs[index].loading = true
        inputs[index].message = {
            content: texts.checkingProjectStatus,
            showIcon: true,
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
            showIcon: true,
            status: 'error',
        }
        if (!projectActive) {
            inputs[index].loading = false
            return this.setState({ inputs, submitDisabled: false })
        }
        // check worker ban and invitation status
        const [accepted, banned] = await Promise.all([
            query.worker.accepted(projectId, workerAddress),
            query.worker.banned(projectId, workerAddress),
        ])
        inputs[index].loading = false
        inputs[index].invalid = banned || !accepted // null => not invited, false => not responded/aceepted
        const invited = accepted === false
        inputs[index].message = banned ? texts.workerBannedMsg : accepted ? undefined : {
            content: !invited ? texts.inactiveWorkerMsg1 : (
                <div>
                    {texts.inactiveWorkerMsg3} <br />
                    <ButtonAcceptOrReject onClick={async (accepted) => {
                        const success = await handleTKInvitation(projectId, workerAddress, accepted)
                        // force trigger change
                        success && inputs[index].bond.changed(projectId)
                    }} />
                </div>
            ),
            header: invited ? texts.inactiveWorkerHeader2 : texts.inactiveWorkerHeader1,
            showIcon: true,
            status: 'error',
        }
        this.setState({ inputs, submitDisabled: false })
        if (!inputs[index].message) this.setIdentityOptions()
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
            formData(values)
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
        formData(values)
    }

    setIdentityOptions = async () => {
        const { inputs, values } = this.state
        const { projectHash: projectId, workerAddress } = values
        if (!projectId) return
        const identityIn = findInput(inputs, 'workerAddress')
        const allIdentities = identities.getAll()
        const ownerAddresses = allIdentities.map(({ address }) => address)

        // check user's own identities that has accepted the project
        const acceptedAr = await query.worker.accepted(
            ownerAddresses.map(() => projectId),
            ownerAddresses
        )
        const options = allIdentities
            // exclude projects that hasn't been accepted yet
            .filter((_, i) => !!acceptedAr[i])
            .map(({ address, name }) => ({
                key: address,
                text: name,
                value: address,
            }))
        identityIn.options = options

        let value = workerAddress
        // if only option, preselect it
        if (options.length === 1) {
            value = options[0].value
        } else if (!options.find(x => x.value === value)) {
            // if existing value is not in options list
            value = null
        }
        identityIn.bond.changed(value)
        this.setState({ inputs })
    }

    render() {
        const { closeText: closeTextP, onClose } = this.props
        const { closeText, inputs, message, values } = this.state
        const { duration, stopped, inprogress, manualEntry } = values
        const durationValid = values && BLOCK_DURATION_REGEX.test(duration) && duration !== DURATION_ZERO
        const done = stopped || manualEntry
        const duraIn = inputs.find(x => x.name === 'duration')
        const btnStyle = { width: 'calc( 50% - 12px )', margin: 3 }
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

        // set wallet options
        // inputs.find(x => x.name === 'workerAddress')
        //     .options = identities.getAll().map((wallet, key) => ({
        //         key,
        //         text: wallet.name,
        //         value: wallet.address
        //     }))

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
    header: wordsCap.timekeeping,
    size: 'tiny'
}

TimeKeepingForm.propTypes = {
    projectHash: PropTypes.string,
}
// ToDo: separate file and text extraction for language
export class TimeKeepingUpdateForm extends Component {
    constructor(props) {
        super(props)

        this.state = {
            message: {},
            onSubmit: this.handleSubmit,
            values: props.values || {},
            inputs: [
                {
                    bond: new Bond(),
                    label: wordsCap.duration,
                    name: 'duration',
                    onChange: deferred(this.handleDurationChange, 300),
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

TimeKeepingUpdateForm.propTypes = {
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

TimeKeepingUpdateForm.defaultProps = {
    closeText: wordsCap.close,
    closeOnEscape: false,
    closeOnDimmerClick: false,
    header: texts.updateFormHeader,
    size: 'tiny',
    submitText: wordsCap.update,
}