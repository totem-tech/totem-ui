
import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import { chain, secretStore } from 'oo7-substrate'
import { Button, Divider, Icon } from 'semantic-ui-react'
import { arrSort, deferred, durationToSeconds, isDefined, objCopy, secondsToDuration, textEllipsis } from '../utils/utils'
import FormBuilder, { fillValues } from '../components/FormBuilder'
import { confirm } from '../services/modal'
import client from '../services/ChatClient'
import storage from '../services/storage'
import addressbook from '../services/addressbook'

const BLOCK_DURATION_SECONDS = 5
const BLOCK_DURATION_REGEX = /^(\d{2}):[0-5][0-9]:[0-5](0|5)$/ // valid duration up to 99:59:55
const blockCountToDuration = blockCount => secondsToDuration(blockCount * BLOCK_DURATION_SECONDS)
const durationToBlockCount = duration => BLOCK_DURATION_REGEX.test(duration) ? durationToSeconds(duration)/BLOCK_DURATION_SECONDS : 0
const toBeImplemented = ()=> alert('To be implemented')

const emptySearchMsg = 'Enter project name, hash or owner address'
export const projectDropdown = {
    clearable: true,
    label: 'Select project',
    name: 'projectHash',
    noResultsMessage: emptySearchMsg,
    options: [],
    placeholder: emptySearchMsg,
    selection: true,
    // Customise projects DropDown search/filtering to include project hash, owner address etc matches
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
}

const getName = addr => (secretStore().find(addr) || {}).name
    || (addressbook.getByAddress(addr) || {}).name
    || textEllipsis(n[1].ownerAddress, 15, 5)
    
export function handleSearch(_, data) {
    if (!this) return
    const formInstance = this
    const searchQuery = (data.searchQuery || '').trim()
    const { inputs } = formInstance.state
    const i = inputs.findIndex(x => x.name === 'projectHash')
    if (i === -1) return
    inputs[i].loading = !!searchQuery
    inputs[i].options = []
    inputs[i].value = !searchQuery ? '' : inputs[i].value
    formInstance.setState({inputs})
    if (!searchQuery) return

    client.projectsSearch(searchQuery, (err, projects) => {
        inputs[i].loading = false
        inputs[i].message = !err ? {} : {status: 'error', content: err }
        // inputs[i].noResultsMessage = projects.size === 0 ? 'Your search yielded no result' : 'Select a project'
        inputs[i].options = Array.from(projects).map(n => ({
            key: n[0] + n[1].ownerAddress + n[1].description, // also used for searching
            description: getName(n[1].ownerAddress),
            text: n[1].name,
            value: n[0] // project hash
        }))
        if (!inputs[i].options.find(x => x.value === inputs[i].value)) {
            // Remove value if no longer in the options list
            inputs[i].value = undefined
        }
        formInstance.setState({inputs})
    })
}
import { FormInput} from '../components/FormBuilder'
export default class ProjectDropdown extends ReactiveComponent {
    constructor(props) {
        super(props)

        const dd = objCopy(props, objCopy(projectDropdown, { onSearchChange: deferred(handleSearch, 300, this) }, true))
        this.state = { inputs: [dd]}
    }

    render() {
        return <FormInput {...this.state.inputs[0]} />
    }
}