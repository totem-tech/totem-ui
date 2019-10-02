
import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import { secretStore } from 'oo7-substrate'
import { arrSort, deferred, objCopy, textEllipsis } from '../utils/utils'
import client from '../services/ChatClient'
import addressbook from '../services/addressbook'
import { FormInput, findInput } from '../components/FormBuilder'

const emptySearchMsg = 'Enter project name, hash or owner address'

// for use with form builder
export const projectDropdown = {
    clearable: true,
    label: 'Project',
    name: 'projectHash',
    noResultsMessage: emptySearchMsg,
    options: [],
    placeholder: 'Select a project',
    selection: true,
    // Customise projects DropDown search/filtering to include project hash, owner address etc matches
    search: (options, searchQuery) => {
        if (!options || options.length === 0) return []
        const projectHashes = {}
        searchQuery = (searchQuery || '')
            // prevents error when using with .match() below
            .split('/').join('')
            .toLowerCase().trim()
        if (!searchQuery) return options
        const search = key => {
            const matches = options.map((option, i) => {
                let x = (option[key] || '').toLowerCase().match(searchQuery)
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

export const getAddressName = address => (secretStore().find(address) || {}).name
    // not found in wallet list
    // search in addressbook
    || (addressbook.getByAddress(address) || {}).name
    // not available in addressbok or wallet list
    // display the address itself with ellipsis
    || textEllipsis(address, 15, 5)

// for use with form builder
export function handleSearch(_, data) {
    if (!this) return
    const formInstance = this
    const searchQuery = (data.searchQuery || '').trim()
    const { inputs } = formInstance.state
    const input = findInput(inputs, 'projectHash')
    if (!input) return
    input.loading = !!searchQuery
    input.options = []
    input.value = !searchQuery ? '' : input.value
    formInstance.setState({ inputs })
    if (!searchQuery) return

    client.projectsSearch(searchQuery, (err, projects) => {
        const { inputs } = formInstance.state
        const input = findInput(inputs, 'projectHash')
        input.loading = false
        input.message = !err ? {} : { status: 'error', content: err }
        input.options = Array.from(projects).map(n => ({
            key: n[0] + n[1].ownerAddress + n[1].description, // also used for searching
            description: getAddressName(n[1].ownerAddress),
            text: n[1].name,
            value: n[0], // project hash,
            project: n[1]
        }))
        if (!input.options.find(x => x.value === input.value)) {
            // Remove value if no longer in the options list
            input.value = undefined
        }
        formInstance.setState({ inputs })
    })
}

export default class ProjectDropdown extends ReactiveComponent {
    constructor(props) {
        super(props)

        const dd = objCopy(
            props,
            objCopy(projectDropdown, { onSearchChange: deferred(handleSearch, 300, this) }, true)
        )
        this.state = { inputs: [dd] }
    }

    render() {
        return <FormInput {...this.state.inputs[0]} />
    }
}