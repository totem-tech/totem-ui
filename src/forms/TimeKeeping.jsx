
import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import { chain, secretStore } from 'oo7-substrate'
import { Button, Divider, Icon } from 'semantic-ui-react'
import { arrSort, deferred, isDefined, objCopy, textEllipsis } from '../utils/utils'
import FormBuilder, { fillValues } from '../components/FormBuilder'
import { confirm } from '../services/modal'
import client from '../services/ChatClient'
import storage from '../services/storage'
import addressbook from '../services/addressbook'

const BLOCK_DURATION_SECONDS = 5
const DURATION_REGEX = /^(\d{2}):[0-5][0-9]:[0-5](0|5)$/
const prependO = n => n < 10 ? `0${n}` : n

export default class TimeKeepingForm extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.handleValuesChange = this.handleValuesChange.bind(this)
        this.handleManualEntryChange = this.handleManualEntryChange.bind(this)
        this.handleDurationChange = this.handleDurationChange.bind(this)

        const emptySearchMsg = 'Enter project name, hash or owner address'
        this.blockCount = 0
        const values = storage.timeKeeping() || {}
        if (!isDefined(values.durationValid)) {
            values.durationValid = true
        }

        this.state = {
            values: {
                blockCount: values.blockCount,
                blockEnd: values.blockEnd,
                blockStart: values.blockStart,
                duration: values.duration || '',
                durationValid: values.durationValid,
                finished: values.finished,
                inprogress: values.inprogress,
                manualEntry: !!values.manualEntry,
                projectHash: values.projectHash || ''
            },
            inputs: [
                {
                    clearable: true, // set as default in FormInput ???
                    // defaultSearchQuery: savedValues.projectHash || '',
                    label: 'Select project',
                    // minCharacters: 3,
                    name: 'projectHash',
                    noResultsMessage: emptySearchMsg,
                    onChange: this.handleProjectChange.bind(this),
                    onSearchChange: deferred(this.handleSearch, 300, this),
                    options: [],
                    placeholder: emptySearchMsg,
                    selection: true,
                    // Custom improved dropdown search
                    search: this.projectsCustomSearch.bind(this),
                    type: 'dropdown',
                },
                {
                    autoComplete: 'off',
                    label: 'Duration',
                    name: 'duration',
                    onChange: this.handleDurationChange,
                    placeholder: 'hh:mm:ss',
                    readOnly: values.manualEntry !== true,
                    type: 'text',
                    value: ''
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
        setTimeout(()=> this.handleSearch({}, {searchQuery: values.projectHash}))
    }

    handleDurationChange (e, formValues, i) {
        const { inputs, values } = this.state
        values.durationValid = inputs[i].value === '00:00:00' ? false : DURATION_REGEX.test(formValues.duration)
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
        values.durationValid = duraIn.value === '00:00:00' ? false : DURATION_REGEX.test(formValues.duration)
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

    // Customise projects DropDown search/filtering to include project hash, owner address etc matches
    projectsCustomSearch(options, searchQuery) {
        if (!options  || options.length === 0) return []
        const projectHashes = {}
        searchQuery = (searchQuery || '').toLowerCase().trim()
        const search = key => {
            const matches = options.map((option, i) => {
                let x = option[key].toLowerCase().match(searchQuery)
                if (!x || projectHashes[options[i].value]) return
                projectHashes[options[i].value] = 1
                return { index: i, matchIndex: x.index }
            }).filter(x => !!x)
            return arrSort(matches, 'matchIndex').map(x => options[x.index])
        }

        // First include results that matches project title
        const result = search('text')
        // Now include options matching project hash, name and owner address that is placed in the option.key
        return result.concat(search('key'))
    }

    handleSearch(_, data) {
        const searchQuery = (data.searchQuery || '').trim()
        const { inputs } = this.state
        const i = 0
        inputs[i].loading = !!searchQuery
        inputs[i].options = []
        // inputs[i].noResultsMessage = !searchQuery ? emptySearchMsg : 'Searching projects...'
        inputs[i].value = !searchQuery ? '' : inputs[i].value
        this.setState({inputs})
        if (!searchQuery) return

        client.projectsSearch(searchQuery, (err, projects) => {
            inputs[i].loading = false
            inputs[i].message = !err ? {} : {status: 'error', content: err }
            // inputs[i].noResultsMessage = projects.size === 0 ? 'Your search yielded no result' : 'Select a project'
            inputs[i].options = Array.from(projects).map(n => ({
                key: n[0] + n[1].ownerAddress + n[1].description, // also used for searching
                description: (
                    (secretStore().find(n[1].ownerAddress) || {}).name
                    || (addressbook.getByAddress(n[1].ownerAddress) || {}).name
                    || textEllipsis(n[1].ownerAddress, 15, 5)
                ),
                text: n[1].name,
                value: n[0] // project hash
            }))
            if (!inputs[i].options.find(x => x.value === inputs[i].value)) {
                // Remove value if no longer in the options list
                inputs[i].value = undefined
            }
            this.setState({inputs})
        })
    }

    handleReset() {
        const { inputs } = this.state
        const values = {durationValid: true }
        inputs.find(x => x.name === 'duration').value = ''
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
        values.blockCount = this.durationToBlockCount(values.duration) - 1
        values.blockEnd = blockNumber
        values.blockStart = blockNumber - values.blockCount
        values.inprogress = true
        values.finished = false
        values.manualEntry = false
        const meIn = inputs.find(x => x.name === 'manualEntry')
        meIn.defaultChecked = false
        meIn.disabled = true
        this.setState({inputs, values})
    }

    handleSubmit() {
        confirm({
            onConfirm: ()=> {
                // send task to queue service
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
            values.duration = this.blockCountToDuration( currentBlockNumber - values.blockStart )
        }
        duraIn.value = values.duration
        values.durationValid = DURATION_REGEX.test(values.duration)
        this.setState({blockNumber: currentBlockNumber, inputs, values})
        values.durationValid && storage.timeKeeping(values)
    }

    componentWillMount() {
        this.tieId = chain.height.tie( blockNumber => {
            blockNumber = parseInt(blockNumber)
            this.setState({blockNumber})
            this.state.values.inprogress && this.saveValues(blockNumber)
        })
    }

    componentWillUnmount() {
        chain.height.untie(this.tieId)
    }

    blockCountToDuration(blockCount) {
        const seconds = (blockCount * 5) % 60
        const totalMinutes = parseInt((blockCount*5)/60)
        const hours = parseInt(totalMinutes/60)
        return prependO(hours) + ':' + prependO(totalMinutes % 60) + ':' + prependO(seconds)
    }

    durationToBlockCount(duration) {
        if (!DURATION_REGEX.test(duration)) return 0
        const [hours, minutes, seconds] = duration.split(':')
        const totalSeconds = parseInt(seconds) + parseInt(minutes) * 60 + parseInt(hours) * 60 * 60
        return totalSeconds/BLOCK_DURATION_SECONDS
    }

    render() {
        const { inputs, values } = this.state
        const { durationValid, finished, inprogress, manualEntry } = values
        const done = finished || manualEntry
        const duraIn = inputs.find(x => x.name === 'duration')
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
                style={{marginTop: 5}}
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
            <FormBuilder {...{
                    inputs,
                    onChange: this.handleValuesChange,
                    submitText
            }} />
        )
    }
}