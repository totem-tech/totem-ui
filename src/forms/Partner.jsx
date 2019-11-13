import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { ss58Decode } from 'oo7-substrate'
import { deferred, isFn, isObj } from '../utils/utils'
import addressbook from '../services/addressbook'
import FormBuilder, { fillValues, findInput } from '../components/FormBuilder'
import client from '../services/ChatClient'
import { showForm } from '../services/modal'
import CompanyForm from './Company'

class Partner extends ReactiveComponent {
    constructor(props) {
        super(props)

        const values = this.doUpdate && isObj(props.values) ? props.values : {}
        this.doUpdate = !!addressbook.get(values.address)

        this.state = {
            header: props.header || `${this.doUpdate ? 'Update' : 'Add'} partner`,
            message: {},
            onChange: (_, values) => this.setState({ values }),
            onSubmit: this.handleSubmit.bind(this),
            submitText: props.submitText || `${this.doUpdate ? 'Update' : 'Add'} partner`,
            success: false,
            values,
            inputs: [
                {
                    // label: 'Search Public Compnay',
                    // name: 'company',
                    // type: 'dropdown',
                    //ToDo: custom search similar to project dropdown
                },
                {
                    label: 'Identity',
                    minLength: 48,
                    maxLength: 48,
                    name: 'address',
                    onChange: deferred(
                        (e, { address }) => this.checkVisibility(address),
                        300,
                        this
                    ),
                    placeholder: 'Enter an address',
                    readOnly: this.doUpdate,
                    required: true,
                    type: 'text',
                    validate: (e, { value: address }) => {
                        const partner = addressbook.get(address)
                        if (partner) return `Partner already exists with name "${partner.name}"`
                        if (!ss58Decode(address)) return 'Please enter a valid address'
                    },
                    value: '',
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
                }
            ]
        }

        isObj(props.values) && fillValues(this.state.inputs, props.values, true)
        setTimeout(() => this.doUpdate && values.address && this.checkVisibility(values.address))
    }

    checkVisibility(address) {
        const { inputs } = this.state
        findInput(inputs, 'address').loading = true
        this.setState({ inputs })
        // check if address is aleady public
        client.company(address, null, (_, company) => {
            findInput(inputs, 'address').loading = false
            const isPublic = isObj(company)
            if (isPublic) {
                const visibility = inputs.find(x => x.name === 'visibility')
                visibility.disabled = true
                visibility.value = 'public'
                visibility.message = {
                    content: 'Address is already publicly shared as company named: ' + company.name,
                    status: 'warning'
                }
            }
            // make sure addressbook is also updated
            this.doUpdate && isPublic && addressbook.setPublic(address)
            this.setState({ inputs })
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
        const { name, address, tags, type, visibility } = values

        addressbook.set(address, name, tags, type, visibility)
        this.setState({
            message: closeOnSubmit ? {} : {
                content: `Partner ${this.doUpdate ? 'updated' : 'created'} successfully`
            },
            success: true,
        })
        // Open add partner form
        isFn(onSubmit) && onSubmit(true, values)
        const addCompany = visibility === 'public' && !inputs.find(x => x.name === 'visibility').disabled
        addCompany && showForm(CompanyForm, {
            message: {
                header: `Partner ${this.doUpdate ? 'updated' : 'added'} successfully`,
                content: 'You have chosen to make your partner public. Please fill up the form to proceed or click cancel to return.',
                status: 'success'
            },
            onSubmit: (e, v, success) => success && addressbook.setPublic(address),
            size: 'tiny',
            walletAddress: address,
        })
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