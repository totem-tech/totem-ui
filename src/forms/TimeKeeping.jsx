
import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { chain, secretStore } from 'oo7-substrate'
import { Button, Divider, Icon } from 'semantic-ui-react'
import { arrSort, deferred, isDefined, objCopy, textEllipsis } from '../utils/utils'
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

const DURATION_ZERO = '00:00:00'
const blockCountToDuration = blockCount => secondsToDuration(blockCount * BLOCK_DURATION_SECONDS)
const durationToBlockCount = duration => BLOCK_DURATION_REGEX.test(duration) ? durationToSeconds(duration) / BLOCK_DURATION_SECONDS : 0
const toBeImplemented = () => alert('To be implemented')

export default class TimeKeepingForm extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.handleValuesChange = this.handleValuesChange.bind(this)
        this.handleManualEntryChange = this.handleManualEntryChange.bind(this)
        this.handleDurationChange = this.handleDurationChange.bind(this)

        const values = storage.timeKeeping() || {}
        values.durationValid = !isDefined(values.durationValid) ? true : values.durationValid
        values.duration = values.duration || DURATION_ZERO
        values.manualEntry = values.manualEntry
        values.projectHash = props.projectHash || values.projectHash || ''

        this.state = {
            values,
            inputs: [
                objCopy(projectDropdown, {
                    onChange: this.handleProjectChange.bind(this),
                    onSearchChange: deferred(handleSearch, 300, this),
                    required: true
                }, true),
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
                            type: 'number',
                        },
                        {
                            label: 'Rate Unit',
                            maxLength: 10,
                            name: 'rateUnit',
                            placeholder: 'BTC, US$, Euro...',
                            required: true,
                            type: 'text',
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
                    onChange: this.handleManualEntryChange
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

    handleDurationChange(e, formValues, i) {
        const { inputs, values } = this.state
        values.durationValid = inputs[i].value === DURATION_ZERO ? false : BLOCK_DURATION_REGEX.test(formValues.duration)
        inputs[i].message = values.durationValid ? null : {
            content: <span>Please enter a valid duration in the following format:<br /><b>hh:mm:ss</b><br />Seconds must be in increments of 5</span>,
            header: 'Invalid duration',
            showIcon: true,
            status: 'error',
        }
        this.setState({ inputs, values })
    }

    handleManualEntryChange(e, formValues) {
        const { manualEntry } = formValues
        const { inputs, values } = this.state
        const duraIn = inputs.find(x => x.name === 'duration')
        duraIn.readOnly = !manualEntry
        duraIn.value = duraIn.value || DURATION_ZERO
        values.durationValid = duraIn.value === DURATION_ZERO ? false : BLOCK_DURATION_REGEX.test(formValues.duration)
        values.manualEntry = manualEntry
        this.setState({ inputs, values })
    }

    handleValuesChange(e, formValues) {
        const values = objCopy(formValues, this.state.values)
        this.setState({ values })
        this.saveValues()
    }

    handleProjectChange(e, values, i) {
        const { inputs } = this.state
        inputs[i].value = values.projectHash
        this.setState({ inputs })
    }

    handleReset(userInitiated) {
        const { inputs, values } = this.state
        const doConfirm = userInitiated && values.duration && values.duration !== DURATION_ZERO
        const reset = () => {
            const values = { durationValid: true }
            inputs.find(x => x.name === 'duration').value = DURATION_ZERO
            inputs.find(x => x.name === 'manualEntry').defaultChecked = false
            inputs.find(x => x.name === 'projectHash').value = ''
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
        values.blockStart = blockNumber
        values.finished = false
        values.inprogress = true
        values.durationValid = true
        this.setState({ inputs, values })
        this.saveValues()
    }

    handleFinish() {
        const { blockNumber, inputs, values } = this.state
        inputs.find(x => x.name === 'manualEntry').disabled = false
        values.blockEnd = blockNumber
        values.inprogress = false
        values.finished = true
        this.setState({ inputs, values })
        this.saveValues()
    }

    handleResume() {
        const { blockNumber, inputs, values } = this.state
        values.blockCount = durationToBlockCount(values.duration)
        values.blockEnd = blockNumber
        values.blockStart = blockNumber - values.blockCount
        values.inprogress = true
        values.finished = false
        values.manualEntry = false
        const meIn = inputs.find(x => x.name === 'manualEntry')
        meIn.defaultChecked = false
        meIn.disabled = true
        this.setState({ inputs, values })
        setTimeout(this.saveValues.bind(this))
    }

    handleSubmit() {
        confirm({
            onConfirm: () => {
                // send task to queue service
                toBeImplemented()
                // Reset form
                this.handleReset()
            },
            size: 'mini'
        })
    }

    saveValues(currentBlockNumber, newDuration) {
        const { blockNumber, inputs, values } = this.state
        const duraIn = inputs.find(x => x.name === 'duration')
        currentBlockNumber = currentBlockNumber || blockNumber
        if (!!newDuration) {
            values.duration = newDuration
            values.blockCount = durationToBlockCount(newDuration)
            values.blockEnd = currentBlockNumber
            values.blockStart = currentBlockNumber - values.blockCount
        } else if (currentBlockNumber > 0 && values.inprogress && !values.finished) {
            values.duration = blockCountToDuration(currentBlockNumber - values.blockStart)
        }
        duraIn.value = values.duration
        values.durationValid = BLOCK_DURATION_REGEX.test(values.duration)
        this.setState({ blockNumber: currentBlockNumber, inputs, values })
        values.durationValid && storage.timeKeeping(values)
    }

    componentWillMount() {
        this.tieId = chain.height.tie(blockNumber => {
            const { values } = this.state
            const { inprogress, duration } = values
            const doSave = inprogress || (duration && duration !== DURATION_ZERO)
            blockNumber = parseInt(blockNumber)
            doSave ? this.saveValues(blockNumber) : this.setState({ blockNumber })
        })
    }

    componentWillUnmount() {
        chain.height.untie(this.tieId)
    }

    render() {
        const { modal } = this.props
        const { inputs, values } = this.state
        const { durationValid, finished, inprogress, manualEntry } = values
        const done = finished || manualEntry
        const duraIn = inputs.find(x => x.name === 'duration')
        const btnStyle = modal ? { marginLeft: 0, marginRight: 0 } : {}
        const doneItems = ['reset', 'rate-fields']
        inputs.filter(x => doneItems.indexOf(x.name) >= 0).forEach(x => x.hidden = !done)
        // Show resume item when timer is stopped
        duraIn.action = !finished || manualEntry ? undefined : {
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

        return (
            <FormBuilder {...objCopy(this.props, {
                closeText: null,
                inputs,
                message: !inprogress ? {} : {
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
                        onClick={() => inprogress ? this.handleFinish() : (done ? this.handleSubmit() : this.handleStart())}
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