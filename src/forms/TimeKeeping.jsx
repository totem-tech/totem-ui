
import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { chain, secretStore } from 'oo7-substrate'
import { Button, Divider, Icon } from 'semantic-ui-react'
import { arrSort, deferred, durationToSeconds, isDefined, objCopy, secondsToDuration, textEllipsis } from '../utils/utils'
import FormBuilder, { fillValues } from '../components/FormBuilder'
import { confirm } from '../services/modal'
import storage from '../services/storage'
import { projectDropdown, handleSearch } from '../components/ProjectDropdown'

const BLOCK_DURATION_SECONDS = 5
const BLOCK_DURATION_REGEX = /^(\d{2}):[0-5][0-9]:[0-5](0|5)$/ // valid duration up to 99:59:55
const blockCountToDuration = blockCount => secondsToDuration(blockCount * BLOCK_DURATION_SECONDS)
const durationToBlockCount = duration => BLOCK_DURATION_REGEX.test(duration) ? durationToSeconds(duration)/BLOCK_DURATION_SECONDS : 0
const toBeImplemented = ()=> alert('To be implemented')

export default class TimeKeepingForm extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.handleValuesChange = this.handleValuesChange.bind(this)
        this.handleManualEntryChange = this.handleManualEntryChange.bind(this)
        this.handleDurationChange = this.handleDurationChange.bind(this)

        const values = storage.timeKeeping() || {}
        values.durationValid = !isDefined(values.durationValid) ? true : values.durationValid
        values.duration = values.duration || '00:00:00'
        values.manualEntry = values.manualEntry
        values.projectHash = props.projectHash || values.projectHash || ''

        this.state = {
            values,
            inputs: [
                objCopy(projectDropdown, {
                    onChange: this.handleProjectChange.bind(this),
                    onSearchChange: deferred(handleSearch, 300, this),
                }, true),
                {
                    autoComplete: 'off',
                    label: 'Duration',
                    name: 'duration',
                    onChange: this.handleDurationChange,
                    placeholder: 'hh:mm:ss',
                    readOnly: values.manualEntry !== true,
                    type: 'text',
                    value: '00:00:00'
                },
                {
                    disabled: !!values.inprogress,
                    label: 'Manually enter duration',
                    name: 'manualEntry',
                    type: 'checkbox',
                    onChange: this.handleManualEntryChange
                },
            ]
        }

        // restore saved values
        fillValues(this.state.inputs, values, true)
        setTimeout(()=> handleSearch.call(this, {}, {searchQuery: values.projectHash}))
    }

    handleDurationChange (e, formValues, i) {
        const { inputs, values } = this.state
        values.durationValid = inputs[i].value === '00:00:00' ? false : BLOCK_DURATION_REGEX.test(formValues.duration)
        inputs[i].message = values.durationValid ? null : {
            content: <span>Please enter a valid duration in the following format:<br /><b>hh:mm:ss</b><br />Seconds must be in increments of 5</span>,
            header: 'Invalid duration',
            showIcon: true,
            status: 'error',
        }
        this.setState({inputs, values})
    }

    handleManualEntryChange(e, formValues) {
        const { manualEntry } = formValues
        const { inputs, values } = this.state
        const duraIn = inputs.find(x => x.name === 'duration')
        duraIn.readOnly = !manualEntry
        duraIn.value = duraIn.value || '00:00:00'
        values.durationValid = duraIn.value === '00:00:00' ? false : BLOCK_DURATION_REGEX.test(formValues.duration)
        values.manualEntry = manualEntry
        this.setState({inputs, values})
    }

    handleValuesChange(e, formValues) {
        const values = objCopy(formValues, this.state.values)
        this.setState({values})
        this.saveValues()
    }

    handleProjectChange(e, values, i) {
        const { inputs } = this.state
        inputs[i].value = values.projectHash
        this.setState({ inputs })
    }

    handleReset() {
        const { inputs } = this.state
        const values = {durationValid: true }
        inputs.find(x => x.name === 'duration').value = '00:00:00'
        inputs.find(x => x.name === 'manualEntry').defaultChecked = false
        inputs.find(x => x.name === 'projectHash').value = ''
        this.setState({values, inputs})
        storage.timeKeeping(values)
    }

    handleStart() {
        const { blockNumber, inputs, values } = this.state
        inputs.find(x => x.name === 'manualEntry').disabled = true
        const duraIn = inputs.find(x => x.name === 'duration')
        duraIn.readOnly = true
        duraIn.message = null
        values.blockStart =  blockNumber
        values.finished = false
        values.inprogress = true
        values.durationValid = true
        this.setState({inputs, values})
        this.saveValues()
    }

    handleFinish() {
        const { blockNumber, inputs, values } = this.state
        inputs.find(x => x.name === 'manualEntry').disabled = false
        values.blockEnd =  blockNumber
        values.inprogress = false
        values.finished = true
        this.setState({inputs, values})
        this.saveValues()
    }

    handleResume() {
        const { blockNumber, inputs, values } = this.state
        values.blockCount = durationToBlockCount(values.duration) - 1
        values.blockEnd = blockNumber
        values.blockStart = blockNumber - values.blockCount
        values.inprogress = true
        values.finished = false
        values.manualEntry = false
        const meIn = inputs.find(x => x.name === 'manualEntry')
        meIn.defaultChecked = false
        meIn.disabled = true
        this.setState({inputs, values})
        this.saveValues()
    }

    handleSubmit() {
        confirm({
            onConfirm: ()=> {
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
            values.duration = blockCountToDuration( currentBlockNumber - values.blockStart )
        }
        duraIn.value = values.duration
        values.durationValid = BLOCK_DURATION_REGEX.test(values.duration)
        this.setState({blockNumber: currentBlockNumber, inputs, values})
        values.durationValid && storage.timeKeeping(values)
    }

    componentWillMount() {
        this.tieId = chain.height.tie( blockNumber => {
            const { values } = this.state
            const {inprogress, duration} = values
            const doSave = inprogress || (duration && duration !== '00:00:00')
            blockNumber = parseInt(blockNumber)
            this.setState({blockNumber})
            doSave && this.saveValues(blockNumber)
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
        if (finished && !manualEntry) {
            duraIn.action = {
                icon: 'play',
                onClick: ()=> confirm({
                    header: 'Resume timer',
                    content: 'Would you like to resume timer?',
                    onConfirm: ()=> this.handleResume(),
                    confirmButton: 'Yes',
                    cancelButton: 'No',
                    size: 'mini'
                }),
                title: 'Resume timer'
            }
        } else {
            duraIn.icon = undefined
            duraIn.action = undefined
        }

        const resetBtn = done && (
            <Button 
                content="Reset"
                fluid
                negative
                onClick= {()=> confirm({
                    header: 'Reset Timer',
                    content: 'You are about to reset your timer. Are you sure?',
                    onConfirm: ()=> this.handleReset(),
                    confirmButton: 'Yes',
                    cancelButton: 'No',
                    size: 'mini'
                })}
                style={objCopy(btnStyle, {marginTop: 5})}
                title='Reset'
            />
        )

        const submitText = (
            <React.Fragment>
                <Button
                    icon
                    fluid
                    disabled={!inputs[0].value || (manualEntry && !durationValid)}
                    labelPosition="right"
                    onClick={() => inprogress ? this.handleFinish() : (done ? this.handleSubmit() : this.handleStart())}
                    size="massive"
                    style={btnStyle}
                >
                    {!inprogress ? (done ? 'Submit' : 'Start') : (
                        <React.Fragment>
                            <Icon name="clock outline" loading={true} style={{background: 'transparent'}} />
                            Stop
                        </React.Fragment>
                    )}
                </Button>
                {resetBtn}
            </React.Fragment>
        )
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
                submitText
            })} />
        )
    }
}

TimeKeepingForm.defaultProps = {
    closeOnEscape: true,
    closeOnDimmerClick: true,
    header: 'Time Keeper',
    size: 'mini'
}

TimeKeepingForm.propTypes = {
    projectHash: PropTypes.string
}