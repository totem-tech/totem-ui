import React from 'react'
import { ReactiveComponent } from 'oo7-react'

class TimeKeepingView extends ReactiveComponent {
    constructor(props) {
        super(props)
    }

    render() {
        return (
            <div style={{maxWidth: 300}}>
                <TimeKeepingForm />
                <h3> List or table showing the total hours worked per project, total blocks, percentage of hours worked over all hours for all projects. </h3>
            </div>
        )
    }
}


export default TimeKeepingView

import FormBuilder from '../components/FormBuilder'
import client from '../services/ChatClient'
import { arrSort, textEllipsis, deferred } from '../utils/utils'
import { Button } from 'semantic-ui-react'
import {subscribeNSetState, unsubscribe} from '../services/data'
import { chain } from 'oo7-substrate'
class TimeKeepingForm extends ReactiveComponent {
    constructor(props) {
        super(props)

        const emptySearchMsg = 'Enter project name, hash or owner address'
        this.state = {
            inputs: [
                {
                    clearable: true, // set as default in FormInput ???
                    defaultSearchQuery: '',
                    label: 'Select project',
                    // minCharacters: 3,
                    name: 'projectHash',
                    noResultsMessage: emptySearchMsg,
                    onChange: (e, values, i) => {
                        const { inputs } = this.state
                        inputs[i].value = values.projectHash
                        this.setState({ inputs })
                    },
                    onSearchChange: deferred((e, { searchQuery }) => {
                        searchQuery = (searchQuery || '').trim()
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
                    }, 300, this),
                    options: [],
                    selection: true,
                    search: (options, searchQuery) => {
                        if (!options  || options.length === 0) return []
                        const projectHashes = {}
                        searchQuery = (searchQuery || '').toLowerCase()
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
                    value: ''
                },
                {
                    label: 'Starting Block',
                    name: 'blockStart',
                    readOnly: true,
                    type: 'hidden',
                    value: ''
                },
                {
                    label: 'Ending Block',
                    name: 'blockEnd',
                    readOnly: true,
                    type: 'hidden',
                    value: ''
                },
                // {
                //     label: 'Block count',
                //     name: 'blockCount',
                //     readOnly: true,
                //     type: 'hidden', //ToDo: add "number", etc type support to FormInput component
                // }, 
                {
                    label: 'Duration',
                    name: 'duration',
                    placeholder: 'hh:mm:ss',
                    readOnly: true,
                    style: {fontWeight: 'bold', color: 'red'},
                    type: 'text',
                    value: ''
                }
            ]
        }
    }

    handleStart() {
        const { blockNumber, inputs } = this.state
        inputs.find(x => x.name === 'blockStart').value =  blockNumber
        this.setState({inputs, inprogress: true})
    }

    handleFinish() {
        const { blockNumber, inputs } = this.state
        inputs.find(x => x.name === 'blockEnd').value =  blockNumber
        this.setState({inputs, inprogress: false})
    }

    componentWillMount() {
        // this.notifyId = subscribeNSetState(this, 'chain_height')
        this.tieId = chain.height.tie( blockNumber => this.setState({blockNumber}))

        //todo: upate time field
    }

    componentWillUnmount() {
        // unsubscribe(this.notifyId)
        chain.height.untie(this.tieId)
    }

    render() {
        const { blockNumber, inputs, inprogress } = this.state
        const blockStart = inputs.find(x => x.name === 'blockStart').value
        if (inprogress) {
            const O = (n) => n < 10 ? '0' + n : n
            const numBlocks = blockNumber - blockStart
            const seconds = (numBlocks * 5) % 60
            const totalMinutes = parseInt((numBlocks*5)/60)
            const hours = parseInt(totalMinutes/60)
            const duration = O(hours) + ':' + O(totalMinutes % 60) + ':' + O(seconds)
            const duraIn = inputs.find(x => x.name === 'duration')
            duraIn.value = duration
            duraIn.loading = true
        }
        return (
            <FormBuilder
                {...{
                    inputs,
                    submitText: (
                        <Button
                            size="massive"
                            fluid
                            disabled={!inputs[0].value}
                            onClick={() => inprogress ? this.handleFinish() : this.handleStart()}
                        >
                            {inprogress ? 'Finish' : 'Start'}
                        </Button>
                    )
                }} 
            />
        )
    }
}