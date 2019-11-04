
import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { chain, secretStore } from 'oo7-substrate'
import { Button, Icon } from 'semantic-ui-react'
import { arrReadOnly, deferred, hasValue, isDefined, isFn, objCopy, objClean, objWithoutKeys } from '../utils/utils'
import {
    BLOCK_DURATION_SECONDS,
    BLOCK_DURATION_REGEX,
    durationToSeconds,
    secondsToDuration,
} from '../utils/time'
import FormBuilder, { fillValues, findInput } from '../components/FormBuilder'
import { confirm, closeModal, showForm } from '../services/modal'
import storage from '../services/storage'
import { projectDropdown, handleSearch, getAddressName } from '../components/ProjectDropdown'
import { addToQueue, QUEUE_TYPES } from '../services/queue'
import { projectHashStatus, timeKeeping } from '../services/blockchain'

const DURATION_ZERO = '00:00:00'
const blockCountToDuration = blockCount => secondsToDuration(blockCount * BLOCK_DURATION_SECONDS)
const durationToBlockCount = duration => BLOCK_DURATION_REGEX.test(duration) ? durationToSeconds(duration) / BLOCK_DURATION_SECONDS : 0
const validKeys = arrReadOnly([
    'hash',
    'address',
    'approved',
    'blockStart',
    'blockEnd',
    'blockCount',
    'duration',
    'projectHash',
    'totalAmount',
    'tsCreated',
    'tsUpdated',
], true)

// Hash that indicates creation of new record
const NEW_RECORD_HASH = '0xe4d673a76e8b32ca3989dbb9f444f71813c88d36120170b15151d58c7106cc83'

function handleDurationChange(e, formValues, i) {
    const { inputs, values } = this.state
    const valid = BLOCK_DURATION_REGEX.test(formValues.duration)
    const invalid = inputs[i].value === DURATION_ZERO && values.manualEntry ? true : !valid
    inputs[i].message = !invalid ? null : {
        content: <span>Please enter a valid duration in the following format:<br /><b>hh:mm:ss</b><br />Seconds must be in increments of 5</span>,
        header: 'Invalid duration',
        showIcon: true,
        status: 'error',
    }
    inputs[i].invalid = invalid
    inputs[i].error = invalid
    this.setState({ inputs: inputs })
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
            values,
            inputs: [
                objCopy(projectDropdown, {
                    disabled: projectHashSupplied,
                    onChange: this.handleProjectChange.bind(this),
                    onSearchChange: deferred(handleSearch, 300, this),
                    required: true,
                    selectOnNavigation: false,
                }, true),
                {
                    label: 'Account/Wallet',
                    name: 'address',
                    type: 'dropdown',
                    options: [],
                    required: true,
                    search: true,
                    selection: true,
                },
                {
                    autoComplete: 'off',
                    label: 'Duration',
                    name: 'duration',
                    onChange: deferred(handleDurationChange, 300, this),
                    placeholder: 'hh:mm:ss',
                    readOnly: values.manualEntry !== true,
                    type: 'text',
                    value: DURATION_ZERO
                },
                {
                    disabled: !!values.inprogress,
                    name: 'manualEntry',
                    options: [{
                        label: 'Manually enter duration',
                        value: true
                    }],
                    required: false,
                    type: 'checkbox-group',
                },
            ]
        }

        // restore saved values
        fillValues(this.state.inputs, values, true)
        setTimeout(() => handleSearch.call(this, {}, { searchQuery: values.projectHash }))
        values.projectHash && setTimeout(() => this.handleProjectChange({}, { projectHash: values.projectHash }, 0))
    }

    componentWillMount() {
        this.tieId = chain.height.tie(blockNumber => {
            const values = this.state.values
            const inprogress = values.inprogress
            blockNumber = parseInt(blockNumber)
            inprogress ? this.saveValues(blockNumber) : this.setState({ blockNumber })
        })
    }

    componentWillUnmount() {
        chain.height.untie(this.tieId)
    }

    handleProjectChange(_, values, index) {
        const { projectHash } = values
        const { inputs } = this.state
        inputs[index].loading = true
        inputs[index].message = {
            content: 'Checking project status...',
            showIcon: true,
            status: 'loading',
        }
        this.setState({ inputs })

        projectHashStatus(projectHash).then(statusCode => {
            const projectActive = [0, 1].includes(statusCode)
            inputs[index].invalid = !projectActive
            inputs[index].message = projectActive ? undefined : {
                content: 'Please select an active project',
                header: 'Inactive project selected!',
                showIcon: true,
                status: 'error',
            }
            if (!projectActive) {
                inputs[index].loading = false
                return this.setState({ inputs })
            }

            const { address: workerAddress } = secretStore()._keys[storage.walletIndex()]
            // check if user is active on the project
            timeKeeping.invitation.status(projectHash, workerAddress).then(workerActive => {
                inputs[index].loading = false
                inputs[index].invalid = !workerActive
                const project = (findInput(inputs, 'projectHash').options
                    .find(option => option.value === projectHash) || {}).project
                const isOwner = project.ownerAddress == workerAddress
                inputs[index].message = workerActive ? undefined : {
                    content: (
                        <div>
                            Please select a project you are invited to and accepted.
                            {isOwner && (
                                <p>
                                    You are the owner of the selected project. Would you like to
                                    <Button
                                        positive
                                        compact
                                        size="tiny"
                                        content="invite yourself"
                                        onClick={() => this.inviteSelf(projectHash, workerAddress, project.name)}
                                    />
                                    so that you can book time for your own project?
                                </p>
                            )}
                        </div>
                    ),
                    header: 'Uninvited project selected!',
                    showIcon: true,
                    status: 'error',
                }
                this.setState({ inputs })
            })
        })
    }

    inviteSelf(projectHash, address, projectName) {
        confirm({
            cancelButton: 'No',
            confirmButton: 'Yes',
            content: 'Are you sure you want to invite yourself?',
            header: 'Invite Self',
            size: 'mini',
            onConfirm: () => {
                addToQueue({
                    type: QUEUE_TYPES.BLOCKCHAIN,
                    func: 'timeKeeping_invitation_add',
                    args: [projectHash, address, address],
                    title: 'Time Keeping - inviting myself',
                    description: `Project: ${projectName}`,
                    next: {
                        type: QUEUE_TYPES.BLOCKCHAIN,
                        func: 'timeKeeping_invitation_accept',
                        args: [projectHash, address],
                        title: 'Time Keeping - accepting self invite'
                    }
                })
                this.setState({
                    message: {
                        content: `The invitation requires two blockchain transactions which has been queued. 
                            It may take a while to complete the process. You may close the modal for now.`,
                        header: 'Added to queue',
                        showIcon: true,
                        status: 'success'
                    }
                })
            }
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
            header: 'Reset Timer',
            content: 'You are about to reset your timer. Are you sure?',
            onConfirm: () => reset(),
            confirmButton: 'Yes',
            cancelButton: 'No',
            size: 'mini'
        })
    }

    handleStart() {
        const { blockNumber, inputs, values } = this.state
        inputs.find(x => x.name === 'manualEntry').disabled = true
        const duraIn = inputs.find(x => x.name === 'duration')
        duraIn.readOnly = true
        duraIn.message = null
        values.address = secretStore()._keys[storage.walletIndex()].address
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
        const { onSubmit } = this.props
        const { address, blockCount, blockEnd, blockStart, duration, projectHash } = values
        const projectOption = (inputs.find(x => x.name === 'projectHash').options || [])
            .find(option => option.value === projectHash) || {}
        const projectName = projectOption.text
        const queueProps = {
            type: QUEUE_TYPES.BLOCKCHAIN,
            func: 'timeKeeping_record_add',
            args: [address, projectHash, NEW_RECORD_HASH, blockCount, 0, blockStart, blockEnd],
            title: 'Time Keeping - New Record',
            description: 'Project: ' + projectName + ' | Duration: ' + values.duration,
            next: {
                type: QUEUE_TYPES.CHATCLIENT,
                func: 'timeKeepingEntry',
                args: [
                    NEW_RECORD_HASH,
                    objClean(values, validKeys),
                    (err, entry) => {
                        this.setState({
                            message: {
                                content: err || 'Time record added successfully',
                                status: err ? 'error' : 'success',
                                showIcon: true
                            },
                        })
                        !err & this.handleReset()
                        isFn(onSubmit) && onSubmit(!err, entry)
                    }
                ],
            }
        }
        const message = {
            content: 'Request has been added to queue. You will be notified of the progress shortly.',
            header: 'Action queued',
            status: 'success',
            showIcon: true
        }

        this.confirmId = showForm(FormBuilder, {
            header: 'Submit?',
            inputs: [
                ['Wallet', getAddressName(address)],
                ['Project', projectName],
                ['Duration', duration],
                ['Block Count', blockCount],
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
            subheader: 'Please vefiry the following information and click "Proceed" to submit',
            submitText: 'Proceed',
            closeText: 'Go Back'
        })
    }

    saveValues(currentBlockNumber, newDuration) {
        const { blockNumber, inputs, values } = this.state
        const { blockCount, blockEnd, blockStart, inprogress, manualEntry } = values

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
        const doneItems = ['address', 'reset']
        inputs.filter(x => doneItems.indexOf(x.name) >= 0).forEach(x => x.hidden = !done)
        inputs.find(x => x.name === 'projectHash').disabled = inprogress
        // Show resume item when timer is stopped
        duraIn.action = !stopped || manualEntry ? undefined : {
            icon: 'play',
            // prevents annoying HTML form validation warnings from showing up when clicked
            formNoValidate: true,
            onClick: () => confirm({
                header: 'Resume timer',
                content: 'Would you like to resume timer?',
                onConfirm: this.handleResume.bind(this),
                confirmButton: 'Yes',
                cancelButton: 'No',
                size: 'mini'
            }),
            title: 'Resume timer'
        }

        // set wallet options
        inputs.find(x => x.name === 'address')
            .options = (secretStore()._keys).map((wallet, key) => ({
                key,
                text: wallet.name,
                value: wallet.address
            }))

        return (
            <FormBuilder
                {...this.props}
                {...{
                    closeText: (
                        <Button
                            size="massive"
                            style={btnStyle}
                            onClick={(e, d) => {
                                const { values: { inprogress } } = this.state
                                const doCancel = () => this.handleReset(false) | isFn(onClose) && onClose(e, d)
                                !inprogress ? doCancel() : confirm({
                                    cancelButton: 'No, continue timer',
                                    confirmButton: 'Yes',
                                    content: 'You have a running timer. Would you like to stop and exit?',
                                    header: 'Are you sure?',
                                    onConfirm: doCancel,
                                    size: 'tiny'
                                })

                            }}
                        />
                    ),
                    inputs,
                    message: !inprogress ? message : {
                        content: 'You may now close the dialog and come back to it anytime by clicking on the clock icon in the header.',
                        header: 'Timer started',
                        showIcon: true,
                        status: 'info'
                    },
                    onChange: this.handleValuesChange,
                    submitText: (
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
                            {!inprogress ? (done ? 'Submit' : 'Start') : (
                                <React.Fragment>
                                    <Icon name="clock outline" loading={true} style={{ background: 'transparent' }} />
                                    Stop
                            </React.Fragment>
                            )}
                        </Button>
                    )
                }} />
        )
    }
}

TimeKeepingForm.defaultProps = {
    closeOnEscape: true,
    closeOnDimmerClick: true,
    header: 'Time Keeping',
    size: 'tiny'
}

TimeKeepingForm.propTypes = {
    projectHash: PropTypes.string,
}

export class TimeKeepingUpdateForm extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.state = {
            message: {},
            values: props.entry || {},
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

        fillValues(this.state.inputs, props.entry, true)
    }

    handleSubmit(e, values) {
        const { entry, hash, onSubmit } = this.props
        values = objCopy(values, entry, true)
        const queueProps = {
            type: QUEUE_TYPES.CHATCLIENT,
            args: [
                hash,
                objClean(values, validKeys),
                (err, entry) => {
                    this.setState({
                        message: {
                            content: err || 'Entry updated successfully',
                            status: err ? 'error' : 'success',
                            showIcon: true
                        },
                    })
                    isFn(onSubmit) && onSubmit(!err, entry)
                }
            ],
            func: 'timeKeepingEntry',
            title: 'Time Keeping - Update Entry',
            description: 'Hash: ' + hash + ' | Duration: ' + values.duration
        }
        const message = {
            content: 'Request has been added to queue. You will be notified of the progress shortly.',
            header: 'Action queued',
            status: 'success',
            showIcon: true
        }
        addToQueue(queueProps)
        this.setState({ message })
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
    hash: PropTypes.string,
    entry: PropTypes.shape({
        address: PropTypes.string.isRequired,
        blockEnd: PropTypes.number.isRequired,
        blockStart: PropTypes.number.isRequired,
        projectHash: PropTypes.string.isRequired,
    }).isRequired
}

TimeKeepingUpdateForm.defaultProps = {
    closeText: 'Close',
    closeOnEscape: false,
    closeOnDimmerClick: false,
    header: 'Time Keeping: Update Entry',
    size: 'tiny',
    submitText: 'Update',
}