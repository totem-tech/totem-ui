import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { ss58Decode, addressToStr } from '../../utils/convert'
import { arrSort, deferred, isFn, isObj, arrUnique } from '../../utils/utils'
import FormBuilder, { fillValues, findInput } from '../../components/FormBuilder'
import { showForm } from '../../services/modal'
import { translated } from '../../services/language'
import client from '../chat/ChatClient'
import identityService from '../identity/identity'
import addressbook, { getAddressName, getAllTags } from './partner'
import CompanyForm from './CompanyForm'

const textsCap = translated({
    business: 'business',
    close: 'close',
    personal: 'personal',
    tags: 'tags',
    private: 'private',
    public: 'public',

    addressAdditionLabel: 'use',
    addressLabel: 'search for Company or Identity',
    addressPlaceholder: 'search by company details or identity',
    addressValidationMsg1: 'partner already exists with the following name:',
    addressValidationMsg2: 'please enter a valid Totem Identity',
    associatedIdentityLabel: 'associated with your identity',
    associatedIdentityPlaceholder: 'select one of your identities',
    companyFormOnOpenMsg: `
        You have chosen to make this partner public.
        Please ensure you fill in the correct details.
        Click cancel to abort making public.
    `,
    header1: 'add partner',
    header2: 'update partner',
    nameLabel: 'enter partner name',
    namePlaceholder: 'enter a name for this partner',
    nameValidationMsg: 'please choose an unique partner name.',
    submitSuccessMsg1: 'partner created successfully',
    submitSuccessMsg2: 'partner updated successfully',
    tagsNoResultsMsg: 'enter tag and press enter to add, to tags list.',
    tagsPlaceholder: 'enter tags',
    typeLabel: 'partner usage type',
    userIdInvalidMsg: 'please enter a valid user ID',
    userIdLabel: 'user ID for this partner',
    userIdPlaceholder: 'enter user ID for this partner',
    visibilityLabel: 'decide partner visibility (on the network)',
}, true)[1]

class PartnerForm extends Component {
    constructor(props) {
        super(props)

        this.partner = props.values && addressbook.get(props.values.address)
        this.doUpdate = !!this.partner
        const values = { ...this.partner, ...props.values }
        const { address, name, tags = [], visibility } = values

        // placeholder to store user added address to the dropdown list
        this.customAddresses = []
        this.state = {
            closeText: props.closeText || (this.doUpdate ? textsCap.close : undefined),
            header: props.header || (this.doUpdate ? textsCap.header2 : textsCap.header1),
            message: {},
            onChange: this.handleChange,
            onSubmit: this.handleSubmit,
            submitText: props.submitText || (this.doUpdate ? null : textsCap.header1),
            success: false,
            values,
            inputs: [
                {
                    inline: true,
                    label: textsCap.typeLabel,
                    name: 'type',
                    options: [
                        { label: textsCap.personal, value: 'personal' },
                        { label: textsCap.business, value: 'business' }
                    ],
                    radio: true,
                    required: true,
                    type: 'checkbox-group',
                    value: 'personal'
                },
                {
                    allowAdditions: false,
                    additionLabel: textsCap.addressAdditionLabel + ' ',
                    clearable: true,
                    // disable when adding new and address is prefilled (possibly from notification)
                    disabled: !this.doUpdate && !!ss58Decode(address),
                    hidden: this.doUpdate && visibility !== 'public',
                    label: textsCap.addressLabel,
                    name: 'address',
                    onAddItem: this.handleAddressAddItem,
                    onChange: this.handleAddressChange,
                    onSearchChange: this.handleAddressSearchChange,
                    options: !address ? [] : [{
                        key: address + name,
                        text: name || address,
                        value: address,
                    }],
                    placeholder: textsCap.addressPlaceholder,
                    required: true,
                    search: ['text', 'value', 'key'],
                    selection: true,
                    type: 'dropdown',
                    validate: this.doUpdate ? null : this.validateAddress,
                },
                {
                    label: textsCap.nameLabel,
                    name: 'name',
                    placeholder: textsCap.namePlaceholder,
                    required: true,
                    type: 'text',
                    validate: this.validateName,
                    value: '',
                },
                {
                    clearable: true,
                    label: textsCap.associatedIdentityLabel,
                    name: 'associatedIdentity',
                    options: [],
                    placeholder: textsCap.associatedIdentityPlaceholder,
                    selection: true,
                    search: true,
                    type: 'dropdown',
                },
                {
                    allowAdditions: true,
                    label: textsCap.tags,
                    name: 'tags',
                    noResultsMessage: textsCap.tagsNoResultsMsg,
                    multiple: true,
                    onAddItem: this.handleAddTag,
                    options: arrUnique([...getAllTags(), ...tags]).map(tag => ({
                        key: tag,
                        text: tag,
                        value: tag,
                    })),
                    placeholder: textsCap.tagsPlaceholder,
                    type: 'dropdown',
                    search: true,
                    selection: true,
                    value: tags || []
                },
                {
                    disabled: false, // only disable when company address selected
                    inline: true,
                    label: textsCap.visibilityLabel,
                    name: 'visibility',
                    options: [
                        { label: textsCap.private, value: 'private' },
                        { label: textsCap.public, value: 'public' }
                    ],
                    radio: true,
                    type: 'checkbox-group',
                    value: values.visibility || 'private'
                },
                {
                    label: textsCap.userIdLabel,
                    name: 'userId',
                    multiple: false,
                    placeholder: textsCap.userIdPlaceholder,
                    type: 'UserIdInput',
                },
            ]
        }
    }

    componentWillMount() {
        const { inputs, values } = this.state
        // const addressIn = findInput(inputs, 'address')
        const assocIn = findInput(inputs, 'associatedIdentity')
        assocIn.options = arrSort(
            identityService.getAll().map(({ name, address }) => ({
                key: address,
                text: name,
                value: address,
            })),
            'text'
        )

        fillValues(inputs, values, true)
        this.setState({ inputs })
        if (!values.address) return
        // const optionExists = addressIn.options.find()
        setTimeout(() => {
            this.checkVisibility(values.address)
            this.handleAddressSearchChange({}, { searchQuery: values.address })
        })
    }

    checkVisibility(address) {
        if (!address) return
        const { inputs, values } = this.state
        const addressIn = findInput(inputs, 'address')
        addressIn.loading = !!address
        this.setState({ inputs })

        // check if address is aleady public
        client.companySearch(address, true, (_, result) => {
            const exists = result.size > 0
            addressIn.loading = false
            findInput(inputs, 'visibility').hidden = exists
            findInput(inputs, 'name').hidden = exists

            // make sure addressbook is also updated
            this.doUpdate && exists && addressbook.setPublic(address)
            this.setState({ inputs, values })
        })
    }

    handleAddressAddItem = (_, { value }) => {
        if (this.customAddresses.includes(value)) return
        const { inputs } = this.state
        findInput(inputs, 'address').options.push({
            key: value,
            text: value,
            value,
        })
        this.setState({ inputs })
    }

    handleAddressChange = (e, { address }, i) => {
        const { inputs } = this.state
        const nameIn = findInput(inputs, 'name')
        const { company } = inputs[i].options.find(x => x.value === address) || {}
        findInput(inputs, 'visibility').hidden = !!company
        nameIn.hidden = !!company
        this.setState({ inputs })
    }

    handleAddressSearchChange = deferred((_, { searchQuery }) => {
        if (!searchQuery) return
        const { inputs } = this.state
        const addressIn = findInput(inputs, 'address')
        const isValidAddress = !!addressToStr(searchQuery)
        addressIn.allowAdditions = false
        addressIn.loading = true
        this.setState({ inputs })

        client.companySearch(searchQuery, false, (err, companies) => {
            addressIn.loading = false
            addressIn.allowAdditions = !err && companies.size === 0 && isValidAddress
            addressIn.options = err ? [] : Array.from(companies).map(([hash, company]) => {
                const identityName = getAddressName(company.address)
                return {
                    company, // keep
                    hash,
                    description: `${identityName}${identityName ? ' | ' : ''}${company.countryCode}`,
                    key: Object.values(company).join(' '), // also used for DropDown's search
                    text: company.name,
                    value: company.identity,
                }
            })
            addressIn.message = !err ? null : { content: err, status: 'error' }
            this.setState({ inputs })
        })
    }, 300)

    handleAddTag = (_, data) => {
        const { inputs } = this.state
        inputs.find(x => x.name === 'tags').options.push({
            key: data.value,
            text: data.value,
            value: data.value
        })
        this.setState({ inputs })
    }

    handleChange = (_, values) => {
        this.setState({ values })
        const { address, name, tags, type, userId, visibility, associatedIdentity } = values
        if (this.doUpdate) addressbook.set(
            address,
            name,
            tags,
            type,
            userId,
            visibility,
            associatedIdentity,
        )
    }

    handleSubmit = () => {
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
            closeText: textsCap.close,
            message: closeOnSubmit ? null : {
                content: this.doUpdate ? textsCap.submitSuccessMsg2 : textsCap.submitSuccessMsg1,
                icon: true,
                status: 'success'
            },
            success: true,
        })

        // Open add partner form
        isFn(onSubmit) && onSubmit(true, values)
        addCompany && showForm(CompanyForm, {
            message: {
                header: this.doUpdate ? textsCap.submitSuccessMsg2 : textsCap.submitSuccessMsg1,
                content: textsCap.companyFormOnOpenMsg,
                icon: true,
                status: 'success'
            },
            onSubmit: (e, v, success) => success && addressbook.setPublic(address),
            size: 'tiny',
            values: {
                name,
                identity: address,
            }
        })
    }

    validateAddress(e, { value: address }) {
        if (!address) return
        const partner = addressbook.get(address)
        if (partner) return (
            <p>
                {textsCap.addressValidationMsg1} <br />
                {partner.name}
            </p>
        )
        if (!ss58Decode(address)) return textsCap.addressValidationMsg2
    }

    validateName = (e, { value: name }) => {
        const { values: oldValues } = this.props
        name = name.trim()
        if (this.doUpdate && isObj(oldValues) && oldValues.name === name) return
        if (addressbook.getByName(name)) return textsCap.nameValidationMsg
    }

    render = () => <FormBuilder {...{ ...this.props, ...this.state }} />
}
PartnerForm.propTypes = {
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
PartnerForm.defaultProps = {
    closeOnSubmit: true,
    size: 'tiny'
}
export default PartnerForm