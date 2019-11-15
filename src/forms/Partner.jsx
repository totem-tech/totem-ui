import React from 'react'
import PropTypes from 'prop-types'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import { secretStore, ss58Decode } from 'oo7-substrate'
import { arrSort, deferred, isFn, isObj } from '../utils/utils'
import FormBuilder, { fillValues, findInput } from '../components/FormBuilder'
import addressbook from '../services/partners'
import client from '../services/ChatClient'
import { showForm } from '../services/modal'
import CompanyForm from './Company'
import { getAddressName } from '../components/ProjectDropdown'

const dropDownCustomSearch = (optionKeys = ['text']) => (options, searchQuery) => {
    if (!options || options.length === 0) return []
    const uniqueValues = {}
    searchQuery = (searchQuery || '')
        .toLowerCase().trim()
    if (!searchQuery) return options
    const search = key => {
        const matches = options.map((option, i) => {
            try {
                // catches errors caused by the use of some special characters with .match() below
                let x = (option[key] || '').toLowerCase().match(searchQuery)
                if (!x || uniqueValues[options[i].value]) return
                const matchIndex = x.index
                uniqueValues[options[i].value] = 1
                return { index: i, matchIndex }
            } catch (e) {
                return
            }
        }).filter(r => !!r)
        return arrSort(matches, 'matchIndex').map(x => options[x.index])
    }
    return optionKeys.reduce((result, key) => result.concat(search(key)), [])
}

class Partner extends ReactiveComponent {
    constructor(props) {
        super(props)

        const partner = addressbook.get(props.values && props.values.address)
        this.doUpdate = !!partner
        const values = { ...partner, ...props.values }
        const { address, name, visibility } = values

        // placeholder to store user added address to the dropdown list
        this.customAddresses = []
        this.state = {
            closeText: props.closeText,
            header: props.header || `${this.doUpdate ? 'Update' : 'Add'} partner`,
            message: {},
            onChange: (_, values) => this.setState({ values }),
            onSubmit: this.handleSubmit.bind(this),
            submitText: props.submitText || `${this.doUpdate ? 'Update' : 'Add'} partner`,
            success: false,
            values,
            inputs: [
                {
                    inline: true,
                    label: 'Partner Type',
                    name: 'type',
                    options: [
                        { label: 'Personal', value: 'personal' },
                        { label: 'Business', value: 'business' }
                    ],
                    radio: true,
                    required: true,
                    type: 'checkbox-group',
                    value: 'personal'
                },
                {
                    clearable: true,
                    label: 'Associated Identity',
                    name: 'associatedIdentity',
                    options: [],
                    placeholder: 'Select your identity',
                    selection: true,
                    search: true,
                    type: 'dropdown',
                },
                {
                    allowAdditions: false,
                    additionLabel: 'Use ',
                    clearable: true,
                    hidden: this.doUpdate && visibility !== 'public',
                    label: 'Company/Identity',
                    name: 'address',
                    options: !address ? [] : [{
                        key: address + ' ' + name,
                        text: name || address,
                        value: address,
                    }],
                    placeholder: 'Enter company name or partner identity',
                    required: true,
                    search: dropDownCustomSearch(['key']),
                    selection: true,
                    type: 'dropdown',
                    validate: this.validateAddress,
                    onAddItem: (_, { value }) => {
                        if (this.customAddresses.includes(value)) return
                        const { inputs } = this.state
                        findInput(inputs, 'address').options.push({
                            key: value,
                            text: value,
                            value,
                        })
                        this.setState({ inputs })
                    },
                    onChange: this.handleAddressChange.bind(this),
                    onSearchChange: deferred((_, { searchQuery }) => {
                        if (!searchQuery) return
                        const isValidAddress = !!ss58Decode(searchQuery)
                        const { inputs } = this.state
                        const companyIn = findInput(inputs, 'address')
                        companyIn.allowAdditions = false
                        const handleResult = (err, companies) => {
                            companyIn.options = err ? [] : Array.from(companies).map(([address, company]) => {
                                return {
                                    company, // keep
                                    key: [...Object.keys(company).map(k => company[k]), address].join(' '), // also used for searching
                                    description: `${company.country} | ${getAddressName(address)}`,
                                    text: company.name,
                                    // searchableStr: ,
                                    value: address,
                                }
                            })
                            companyIn.message = !err ? null : { content: err, status: 'error' }
                            this.setState({ inputs })
                        }
                        const searchCompany = () => {
                            const query = {
                                country: searchQuery,
                                name: searchQuery,
                                registrationNumber: searchQuery,
                            }
                            client.companySearch(query, false, false, true, handleResult)
                        }
                        !isValidAddress ? searchCompany() : client.company(searchQuery, null, (err, company) => {
                            if (!err && isObj(company)) {
                                // searchQuery is exact match for a company wallet address
                                return handleResult(null, new Map([[searchQuery, company]]))
                            }
                            // valid address but not a company >> allow user to add as option
                            companyIn.allowAdditions = true
                            companyIn.options = []
                            this.setState({ inputs })
                        })
                    }, 300, this),
                },
                {
                    label: 'Partner Name',
                    name: 'name',
                    placeholder: 'A name for this address',
                    required: true,
                    type: 'text',
                    validate: (e, { value: name }) => {
                        const { values: oldValues } = this.props
                        name = name.trim()
                        if (this.doUpdate && isObj(oldValues) && oldValues.name === name) return
                        if (addressbook.getByName(name)) return 'Please choose an unique partner name'
                    },
                    value: '',
                },
                {
                    bond: new Bond(),
                    disabled: false, // only disable when company address selected
                    inline: true,
                    label: 'Partner Visibility',
                    name: 'visibility',
                    options: [
                        { label: 'Private', value: 'private' },
                        { label: 'Public', value: 'public' }
                    ],
                    radio: true,
                    type: 'checkbox-group',
                    value: values.visibility || 'private'
                },
                {
                    allowAdditions: true,
                    label: 'Tags',
                    name: 'tags',
                    noResultsMessage: 'Type tag and press enter to add',
                    multiple: true,
                    onAddItem: this.handleAddTag.bind(this),
                    options: (values.tags || []).map(tag => ({
                        key: tag,
                        text: tag,
                        value: tag
                    })),
                    placeholder: 'Enter tags',
                    type: 'dropdown',
                    search: true,
                    selection: true,
                    value: values.tags || []
                },
                {
                    icon: 'at',
                    iconPosition: 'left',
                    label: 'User ID',
                    maxLength: 16,
                    minLength: 3,
                    name: 'userId',
                    onChange: deferred(this.handleUserIDChange, 300, this),
                    placeholder: 'Enter partner User ID',
                    type: 'text',
                    value: '',
                },
            ]
        }

        isObj(props.values) && fillValues(this.state.inputs, props.values, true)
        !!values.address && setTimeout(() => this.checkVisibility(values.address))
    }

    componentWillMount() {
        const { inputs } = this.state
        const assocIn = findInput(inputs, 'associatedIdentity')
        assocIn.options = secretStore()._keys.map(({ name, address }) => ({
            key: address,
            text: name,
            value: address,
        }))
        this.setState({ inputs })
    }

    checkVisibility(address) {
        if (!address) return
        const { inputs, values } = this.state
        const addressIn = findInput(inputs, 'address')
        addressIn.loading = !!address
        this.setState({ inputs })

        // check if address is aleady public
        client.company(address, null, (_, company) => {
            addressIn.loading = false
            findInput(inputs, 'visibility').hidden = !!company
            findInput(inputs, 'name').hidden = !!company

            // make sure addressbook is also updated
            this.doUpdate && company && addressbook.setPublic(address)
            this.setState({ inputs, values })
        })
    }

    handleAddressChange(e, { address }, i) {
        const { inputs } = this.state
        const nameIn = findInput(inputs, 'name')
        const { company } = inputs[i].options.find(x => x.value === address) || {}
        findInput(inputs, 'visibility').hidden = !!company
        nameIn.hidden = !!company
        this.setState({ inputs })
    }

    handleAddTag(_, data) {
        const { inputs } = this.state
        inputs.find(x => x.name === 'tags').options.push({
            key: data.value,
            text: data.value,
            value: data.value
        })
        this.setState({ inputs })
    }

    handleSubmit() {
        const { closeOnSubmit, onSubmit } = this.props
        const { inputs, values } = this.state
        const { company } = findInput(inputs, 'address').options.find(x => x.value === values.address) || {}
        const visibilityIn = findInput(inputs, 'visibility')
        const visibilityDisabled = visibilityIn.disabled || visibilityIn.hidden
        const companyExists = !!company || visibilityDisabled
        let { associatedIdentity, name, address, tags, type, userId, visibility } = values
        if (!!companyExists) {
            name = company && company.name || name
            visibility = 'public'
        }
        const addCompany = !visibilityDisabled && visibility === 'public' && !company

        addressbook.set(address, name, tags, type, userId, addCompany ? 'private' : visibility, associatedIdentity)
        this.setState({
            closeText: 'Close',
            message: closeOnSubmit ? null : {
                content: `Partner ${this.doUpdate ? 'updated' : 'created'} successfully`,
                showIcon: true,
                status: 'success'
            },
            success: true,
        })

        // Open add partner form
        isFn(onSubmit) && onSubmit(true, values)
        addCompany && showForm(CompanyForm, {
            message: {
                header: `Partner ${this.doUpdate ? 'updated' : 'added'} successfully`,
                content: `You have chosen to make your partner public. 
                    Please fill up the form to proceed or click cancel to return.`,
                showIcon: true,
                status: 'success'
            },
            onSubmit: (e, v, success) => success && addressbook.setPublic(address),
            size: 'tiny',
            values: {
                name,
                walletAddress: address,
            }
        })
    }

    handleUserIDChange(e, { userId }, i) {
        const { inputs } = this.state
        inputs[i].loading = !!userId
        const validateId = exists => {
            inputs[i].invalid = !exists
            inputs[i].loading = false
            inputs[i].message = exists ? null : {
                content: 'Please enter a valid User ID',
                status: 'error'
            }
            this.setState({ inputs })
        }

        if (!userId) return validateId(true)

        this.setState({ inputs })
        client.idExists(userId, validateId)
    }

    validateAddress(e, { value: address }) {
        if (!address) return
        const partner = addressbook.get(address)
        if (partner) return `Partner already exists with name "${partner.name}"`
        if (!ss58Decode(address)) return 'Please enter a valid address'
    }

    render() {
        return <FormBuilder {...{ ...this.props, ...this.state }} />
    }
}
Partner.propTypes = {
    closeOnSubmit: PropTypes.bool,
    header: PropTypes.string,
    modal: PropTypes.bool,
    onSubmit: PropTypes.func,
    open: PropTypes.bool,
    size: PropTypes.string,
    subheader: PropTypes.string,
    // values to be prefilled into inputs
    values: PropTypes.object,
}
Partner.defaultProps = {
    closeOnSubmit: true,
    size: 'tiny'
}
export default Partner