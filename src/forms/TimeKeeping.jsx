
import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import { chain } from 'oo7-substrate'
import { Button, Icon } from 'semantic-ui-react'
import FormBuilder, { fillValues } from '../components/FormBuilder'
import { confirm } from '../services/modal'
import client from '../services/ChatClient'
import storage from '../services/storage'
import { arrSort, deferred, textEllipsis } from '../utils/utils'

const timeRegex = /^(\d{2}):[0-5][0-9]:[0-5](0|5)$/
export default class TimeKeepingForm extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.handleValuesChange = this.handleValuesChange.bind(this)

        const emptySearchMsg = 'Enter project name, hash or owner address'
        this.blockCount = 0
        const savedValues = storage.timeKeeping() || {}
        this.state = {
            durationValid: true,
            finished: false,
            inprogress: false,
            manualEntry: !!savedValues.manualEntry,
            formValues: savedValues,
            inputs: [
                {
                    clearable: true, // set as default in FormInput ???
                    // defaultSearchQuery: savedValues.projectHash || '',
                    label: 'Select project',
                    // minCharacters: 3,
                    name: 'projectHash',
                    noResultsMessage: emptySearchMsg,
                    onChange: (e, values, i) => {
                        const { inputs } = this.state
                        inputs[i].value = values.projectHash
                        this.setState({ inputs })
                    },
                    onSearchChange: deferred(this.handleSearchChange, 300, this),
                    options: [],
                    placeholder: emptySearchMsg,
                    selection: true,
                    // Custom improved dropdown search
                    search: (options, searchQuery) => {
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
                    },
                    type: 'dropdown',
                },
                {
                    label: 'Starting Block',
                    name: 'blockStart',
                    readOnly: true,
                    type: 'hidden',
                },
                {
                    label: 'Ending Block',
                    name: 'blockEnd',
                    readOnly: true,
                    type: 'hidden',
                },
                {
                    label: 'Block count',
                    name: 'blockCount',
                    type: 'hidden',
                },
                {
                    // action: {
                    //     icon: 'pencil',
                    //     onClick: ()=> {
                    //         // const {inputs} = this.state
                    //         // const duraIn = inputs.find(x => x.name === 'duration')
                    //         // duraIn.readOnly = !duraIn.readOnly
                    //         // duraIn.value = duraIn.value || '00:00:00'
                    //         // this.setState({inputs, durationValid: true})
                    //     }
                    // },
                    autoComplete: 'off',
                    label: 'Duration',
                    name: 'duration',
                    onChange: (e, values, i) => {
                        const { inputs } = this.state
                        const durationValid = inputs[i].value === '00:00:00' ? false : timeRegex.test(values.duration)
                        inputs[i].message = durationValid ? null : {
                            content: <span>Please enter a valid duration in the following format:<br /><b>hh:mm:ss</b><br />Seconds must be in increments of 5</span>,
                            header: 'Invalid duration',
                            showIcon: true,
                            status: 'error',
                        }
                        this.setState({inputs, durationValid})
                    },
                    placeholder: 'hh:mm:ss',
                    readOnly: true,
                    // style: {fontWeight: 'bold', color: 'red'},
                    type: 'text',
                },
                {
                    label: 'Manually enter duration',
                    name: 'manualEntry',
                    type: 'checkbox',
                    onChange: (e, values) => {
                        const { manualEntry } = values
                        const { inputs } = this.state
                        const duraIn = inputs.find(x => x.name === 'duration')
                        duraIn.readOnly = !manualEntry
                        duraIn.value = duraIn.value || '00:00:00'
                        const durationValid = duraIn.value === '00:00:00' ? false : timeRegex.test(values.duration)
                        this.setState({inputs, manualEntry, durationValid})
                    }
                }
            ]
        }

        // restore saved values
        fillValues(this.state.inputs, savedValues, true)
        const {projectHash} = savedValues
        projectHash && setTimeout(()=> this.handleSearchChange({}, {searchQuery: projectHash}))
    }

    handleValuesChange(e, formValues) {
        console.log(formValues)
        storage.timeKeeping(formValues)
        this.setState({formValues})
    }

    handleSearchChange(_, data) {
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
                description: textEllipsis(n[1].ownerAddress, 15, 5), // ToDo: replace with wallet name if available in partner or wallet list
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
        inputs.find(x => x.name === 'duration').value = ''
        inputs.find(x => x.name === 'manualEntry').checked = false
        this.setState({
            durationValid: true,
            finished: false,
            inprogress: false,
            inputs,
            manualEntry: false,
        })
    }

    handleStart() {
        const { blockNumber, inputs } = this.state
        inputs.find(x => x.name === 'blockStart').value =  blockNumber
        inputs.find(x => x.name === 'manualEntry').disabled = true
        const duraIn = inputs.find(x => x.name === 'duration')
        duraIn.type = 'text'
        duraIn.readOnly = true
        duraIn.message = null
        this.setState({inputs, inprogress: true, finished: false, durationValid: true})
    }

    handleFinish() {
        const { blockNumber, inputs } = this.state
        inputs.find(x => x.name === 'blockEnd').value =  blockNumber
        inputs.find(x => x.name === 'manualEntry').disabled = false
        this.setState({inputs, inprogress: false, finished: true})
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

    componentWillMount() {
        this.tieId = chain.height.tie( blockNumber => {
            const { finished, inputs, inprogress } = this.state
            if (!inprogress && finished) {
                inputs.find(x => x.name === 'blockCount').value = blockNumber - inputs.find(x => x.name === 'blockStart').value
            }
            this.setState({blockNumber, inputs})
        })
    }

    componentWillUnmount() {
        chain.height.untie(this.tieId)
    }

    render() {
        const { blockNumber, durationValid, finished, inputs, inprogress, manualEntry } = this.state
        const blockStart = inputs.find(x => x.name === 'blockStart').value
        const duraIn = inputs.find(x => x.name === 'duration')
        if (inprogress) {
            const O = n => n < 10 ? `0${n}` : n
            const blockCount = blockNumber - blockStart
            const seconds = (blockCount * 5) % 60
            const totalMinutes = parseInt((blockCount*5)/60)
            const hours = parseInt(totalMinutes/60)
            const duration = O(hours) + ':' + O(totalMinutes % 60) + ':' + O(seconds)
            duraIn.value = duration
        }
        return (
            <FormBuilder
                {...{
                    inputs,
                    onChange: this.handleValuesChange,
                    submitText: (
                        <Button
                            icon
                            fluid
                            disabled={!inputs[0].value || (manualEntry && !durationValid)}
                            labelPosition="left"
                            onClick={() => inprogress ? this.handleFinish() : (finished || manualEntry ? this.handleSubmit() : this.handleStart())}
                            size="massive"
                        >
                            {!inprogress ? (finished || manualEntry ? 'Submit' : 'Start') : (
                                <React.Fragment>
                                    <Icon name="clock outline" loading={true} style={{background: 'transparent'}} />
                                    Finish
                                </React.Fragment>
                            )}
                        </Button>
                    )
                }} 
            />
        )
    }
}