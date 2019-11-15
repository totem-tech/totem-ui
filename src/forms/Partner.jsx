import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { secretStore, ss58Decode } from 'oo7-substrate'
import { deferred, isFn, isObj } from '../utils/utils'
import FormBuilder, { fillValues, findInput } from '../components/FormBuilder'
import addressbook from '../services/partners'
import client from '../services/ChatClient'
import { showForm } from '../services/modal'
import CompanyForm from './Company'
import { getAddressName } from '../components/ProjectDropdown'

class Partner extends ReactiveComponent {
    constructor(props) {
        super(props)

        const partner = addressbook.get(props.values && props.values.address)
        this.doUpdate = !!partner
        const values = { ...partner, ...props.values }

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
                    label: 'Name',
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
                    label: 'Identity',
                    minLength: 48,
                    maxLength: 48,
                    name: 'address',
                    onChange: deferred((e, { address }) => this.checkVisibility(address), 300, this),
                    placeholder: 'Enter an address',
                    readOnly: this.doUpdate,
                    required: true,
                    type: 'text',
                    validate: this.validateAddress,
                    value: '',
                },
                {
                    clearable: true,
                    label: 'Or Select A Public Company',
                    name: 'companyAddress',
                    options: [],
                    onChange: (e, { companyAddress: cAddr }, i) => {
                        const { inputs } = this.state
                        const addressIn = findInput(inputs, 'address')
                        const nameIn = findInput(inputs, 'name')
                        findInput(inputs, 'visibility').hidden = !!cAddr
                        addressIn.disabled = !!cAddr
                        addressIn.required = !cAddr
                        addressIn.value = cAddr
                        nameIn.required = !cAddr
                        nameIn.label = cAddr ? 'Custom Name' : 'Name'
                        this.setState({ inputs })
                    },
                    onSearchChange: deferred((_, { searchQuery }) => {
                        client.companySearch({ name: searchQuery }, false, false, true, (err, companies) => {
                            const { inputs } = this.state
                            const companyIn = findInput(inputs, 'companyAddress')
                            companyIn.options = err ? [] : Array.from(companies).map(([address, company]) => ({
                                company,
                                key: address, // also used for searching
                                description: `${company.country} | ${getAddressName(address)}`,
                                text: company.name,
                                value: address,
                            }))
                            companyIn.message = !err ? null : { content: err, status: 'error' }
                            return this.setState({ inputs })
                        })
                    }, 300, this),
                    placeholder: 'Enter company name',
                    search: true,
                    selection: true,
                    type: 'dropdown',
                    validate: this.validateAddress,
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
                    inline: true,
                    label: 'Type Of Partner',
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
                    inline: true,
                    label: 'Partner Visibility',
                    name: 'visibility',
                    options: [
                        { label: 'Private', value: 'private' },
                        { label: 'Public', value: 'public' }
                    ],
                    radio: true,
                    required: true,
                    type: 'checkbox-group',
                    value: values.visibility || 'private'
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
                {
                    clearable: true,
                    label: 'Associated Identity',
                    name: 'associatedIdentity',
                    options: [],
                    placeholder: 'Select your identity',
                    selection: true,
                    search: true,
                    type: 'dropdown',
                }
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
        const { inputs, values } = this.state
        const addressIn = findInput(inputs, 'address')
        const visibility = inputs.find(x => x.name === 'visibility')
        addressIn.loading = true
        this.setState({ inputs })

        // check if address is aleady public
        client.company(address, null, (_, company) => {
            addressIn.loading = false
            const isPublic = isObj(company)
            if (isPublic) {
                visibility.disabled = true
                // visibility.value = 'public'
                // values.visibility = 'public'
                visibility.message = {
                    content: 'Address is already publicly shared as company named: ' + company.name,
                    status: 'warning'
                }
            }
            // make sure addressbook is also updated
            this.doUpdate && isPublic && addressbook.setPublic(address)
            this.setState({ inputs, values })
        })
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
        const { companyAddress: cAddr } = values
        const companyExists = inputs.find(x => x.name === 'visibility').disabled
        if (!!cAddr || companyExists) {
            values.address = cAddr || values.address
            values.visibility = 'public'
            values.name = values.name || (
                findInput(inputs, 'companyAddress').options.find(x => x.value === cAddr).company.name
            )
        }
        const { associatedIdentity, name, address, tags, type, userId, visibility } = values

        addressbook.set(address, name, tags, type, userId, visibility, associatedIdentity)
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
        const addCompany = visibility === 'public' && !companyExists
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
            walletAddress: address,
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