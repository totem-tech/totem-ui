
import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { chain, secretStore } from 'oo7-substrate'
import { Button, Divider, Icon } from 'semantic-ui-react'
import uuid from 'uuid'
import { arrSort, deferred, generateHash, isDefined, objCopy, objClean, objReadOnly, textEllipsis } from '../utils/utils'
import {
    BLOCK_DURATION_SECONDS,
    BLOCK_DURATION_REGEX,
    durationToSeconds,
    RATE_PERIODS,
    secondsToDuration,
} from '../utils/time'
import FormBuilder, { fillValues } from '../components/FormBuilder'
import { confirm } from '../services/modal'
import storage from '../services/storage'
import { projectDropdown, handleSearch } from '../components/ProjectDropdown'
import { addToQueue, QUEUE_TYPES } from '../services/queue'

const DURATION_ZERO = '00:00:00'
const blockCountToDuration = blockCount => secondsToDuration(blockCount * BLOCK_DURATION_SECONDS)
const durationToBlockCount = duration => BLOCK_DURATION_REGEX.test(duration) ? durationToSeconds(duration) / BLOCK_DURATION_SECONDS : 0
const validKeys = [
    'hash',
    'address',
    'approved',
    'blockStart',
    'blockEnd',
    'blockCount',
    'duration',
    'projectHash',
    'rateAmount',
    'rateUnit',
    'ratePeriod',
    'totalAmount',
    'tsCreated',
    'tsUpdated',
]
export default class TimeKeepingForm extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.handleValuesChange = this.handleValuesChange.bind(this)
        this.handleDurationChange = this.handleDurationChange.bind(this)
        this.saveValues = this.saveValues.bind(this)

        const values = storage.timeKeeping() || {}
        const { address, duration, durationValid, manualEntry, projectHash, ratePeriod } = values

        values.durationValid = !isDefined(durationValid) ? true : durationValid
        values.duration = duration || DURATION_ZERO
        values.manualEntry = !!manualEntry
        values.projectHash = props.projectHash || projectHash || ''
        values.ratePeriod = RATE_PERIODS.indexOf(ratePeriod) >= 0 ? ratePeriod : RATE_PERIODS[0]


        this.state = {
            message: {},
            values,
            inputs: [
                objCopy(projectDropdown, {
                    onSearchChange: deferred(handleSearch, 300, this),
                    required: true
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
                    name: 'rate-fields',
                    type: 'group',
                    widths: 'equal',
                    inputs: [
                        {
                            label: 'Rate Amount',
                            name: 'rateAmount',
                            placeholder: '123.45',
                            required: true,
                            style: { minWidth: 100 },
                            type: 'number',
                            value: 0.00
                        },
                        {
                            label: 'Rate Unit',
                            maxLength: 10,
                            name: 'rateUnit',
                            placeholder: 'BTC, US$, Euro...',
                            required: true,
                            type: 'text',
                            value: ''
                        },
                        {
                            label: 'Rate Period',
                            name: 'ratePeriod',
                            options: RATE_PERIODS.map(p => ({
                                key: p,
                                text: p + (p === 'block' ? ' - ' + BLOCK_DURATION_SECONDS + ' seconds' : ''),
                                value: p
                            })),
                            placeholder: 'Select a rate period',
                            required: true,
                            selection: true,
                            type: 'dropdown',
                        },
                    ],
                },
                {
                    autoComplete: 'off',
                    label: 'Duration',
                    name: 'duration',
                    onChange: this.handleDurationChange,
                    placeholder: 'hh:mm:ss',
                    readOnly: values.manualEntry !== true,
                    type: 'text',
                    value: DURATION_ZERO
                },
                {
                    disabled: !!values.inprogress,
                    label: 'Manually enter duration',
                    name: 'manualEntry',
                    type: 'checkbox',
                },
                {
                    content: "Reset",
                    fluid: true,
                    name: 'reset',
                    negative: true,
                    onClick: () => this.handleReset(true),
                    type: 'button'
                }
            ]
        }

        // restore saved values
        fillValues(this.state.inputs, values, true)
        setTimeout(() => handleSearch.call(this, {}, { searchQuery: values.projectHash }))
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

    handleDurationChange(e, formValues, i) {
        const { inputs, values } = this.state
        const valid = BLOCK_DURATION_REGEX.test(formValues.duration)
        const durationValid = inputs[i].value === DURATION_ZERO && values.manualEntry ? false : valid
        inputs[i].message = durationValid ? null : {
            content: <span>Please enter a valid duration in the following format:<br /><b>hh:mm:ss</b><br />Seconds must be in increments of 5</span>,
            header: 'Invalid duration',
            showIcon: true,
            status: 'error',
        }
        this.setState({ inputs: inputs })
    }

    handleValuesChange(e, formValues) {
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
        this.saveValues(null, duration)
    }

    handleReset(userInitiated) {
        const { inputs, values } = this.state
        const doConfirm = userInitiated && values.duration && values.duration !== DURATION_ZERO
        const reset = () => {
            values.duration = DURATION_ZERO
            values.inprogress = false
            values.stopped = false
            values.blockStart = 0
            values.blockEnd = 0
            values.blockCount = 0
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
        values.manualEntry = false
        const meIn = inputs.find(x => x.name === 'manualEntry')
        meIn.defaultChecked = false
        meIn.disabled = true
        this.setState({ inputs, values })
        setTimeout(this.saveValues)
    }

    handleSubmit() {
        const { inputs, values } = this.state
        const { projectHash } = values
        const projectOption = (inputs.find(x => x.name === 'projectHash').options || [])
            .find(option => option.value === projectHash) || {}
        const queueProps = {
            type: QUEUE_TYPES.CHATCLIENT,
            args: [
                generateHash(JSON.stringify(values) + uuid.v1()),
                objClean(values, validKeys),
                (err, entry) => console.log('submitted', err, entry)
            ],
            func: 'timeKeepingEntry',
            title: 'Time Keeping',
            description: 'Project: ' + projectOption.text + ' | Duration: ' + values.duration
        }
        const message = {
            content: 'Request has been added to queue. You will be notified of the progress shortly.',
            header: 'Action queued',
            status: 'success',
            showIcon: true
        }
        confirm({
            onConfirm: () => {
                // send task to queue service
                addToQueue(queueProps)
                this.setState({ message })
                // Reset form
                this.handleReset()
            },
            size: 'mini'
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
            values.blockStart = currentBlockNumber - blockCount
        } else {
            values.blockEnd = inprogress ? currentBlockNumber : blockEnd
            values.blockCount = values.blockEnd - blockStart
            values.blockStart = values.blockEnd - values.blockCount
            values.duration = blockCountToDuration(values.blockEnd - blockStart)
        }
        duraIn.value = values.duration
        values.durationValid = BLOCK_DURATION_REGEX.test(values.duration)
        this.setState({ blockNumber: currentBlockNumber, inputs, values })
        storage.timeKeeping(values)
    }

    render() {
        const { modal } = this.props
        const { inputs, message, values } = this.state
        const { durationValid, stopped, inprogress, manualEntry } = values
        const done = stopped || manualEntry
        const duraIn = inputs.find(x => x.name === 'duration')
        const btnStyle = modal ? { marginLeft: 0, marginRight: 0 } : {}
        const doneItems = ['address', 'reset', 'rate-fields']
        inputs.filter(x => doneItems.indexOf(x.name) >= 0).forEach(x => x.hidden = !done)
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
            <FormBuilder {...objCopy(this.props, {
                closeText: null,
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
                        fluid
                        disabled={manualEntry && !durationValid ? false : undefined}
                        labelPosition="right"
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
            })} />
        )
    }
}

TimeKeepingForm.defaultProps = {
    closeOnEscape: true,
    closeOnDimmerClick: true,
    header: 'Time Keeper',
    size: 'tiny'
}

TimeKeepingForm.propTypes = {
    projectHash: PropTypes.string
}