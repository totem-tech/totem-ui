import React from 'react'
import PropTypes from 'prop-types'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import { ss58Decode } from '../utils/convert'
import { arrSort, deferred, isFn, isObj, textCapitalize } from '../utils/utils'
import FormBuilder, { fillValues, findInput } from '../components/FormBuilder'
import addressbook from '../services/partners'
import client from '../services/ChatClient'
import { showForm } from '../services/modal'
import identityService from '../services/identity'
import CompanyForm from './Company'
import { getAddressName } from '../components/ProjectDropdown'

const words = {
    business: 'business',
    close: 'close',
    personal: 'personal',
    tags: 'tags',
    private: 'private',
    public: 'public',
}
const wordsCap = textCapitalize(words)
const texts = {
    addressAdditionLabel: 'Use ',
    addressLabel: 'Search for Company or Identity',
    addressPlaceholder: 'Search by company details or identity',
    addressValidationMsg1: 'Partner already exists with the following name:',
    addressValidationMsg2: 'Please enter a valid Totem Identity',
    associatedIdentityLabel: 'Associated with your identity',
    associatedIdentityPlaceholder: 'Select one of your identities',
    companyFormOnOpenMsg: `You have chosen to make this partner public. Please ensure you fill in the correct details. Click cancel to abort making public.`,
    header1: 'Add partner',
    header2: 'Update partner',
    nameLabel: 'Enter Partner Name',
    namePlaceholder: 'Enter a name for this partner',
    nameValidationMsg: 'Please choose an unique partner name.',
    submitSuccessMsg1: 'Partner created successfully',
    submitSuccessMsg2: 'Partner updated successfully',
    tagsNoResultsMsg: 'Enter tag and press enter to add, to tags list.',
    tagsPlaceholder: 'Enter tags',
    typeLabel: 'Partner Usage Type',
    userIdInvalidMsg: 'Please enter a valid User ID',
    userIdLabel: 'User ID for this partner',
    userIdPlaceholder: 'Enter User ID for this partner',
    visibilityLabel: 'Decide Partner Visibility (on the network)',
}

class Partner extends ReactiveComponent {
    constructor(props) {
        super(props)

        const partner = props.values && addressbook.get(props.values.address)
        this.doUpdate = !!partner
        const values = { ...partner, ...props.values }
        const { address, name, visibility } = values

        // placeholder to store user added address to the dropdown list
        this.customAddresses = []
        this.state = {
            closeText: props.closeText,
            header: props.header || (this.doUpdate ? texts.header2 : texts.header1),
            message: {},
            onChange: (_, values) => this.setState({ values }),
            onSubmit: this.handleSubmit,
            submitText: props.submitText || (this.doUpdate ? texts.header2 : texts.header1),
            success: false,
            values,
            inputs: [
                {
                    inline: true,
                    label: texts.typeLabel,
                    name: 'type',
                    options: [
                        { label: wordsCap.personal, value: 'personal' },
                        { label: wordsCap.business, value: 'business' }
                    ],
                    radio: true,
                    required: true,
                    type: 'checkbox-group',
                    value: 'personal'
                },
                {
                    allowAdditions: false,
                    additionLabel: texts.addressAdditionLabel,
                    bond: new Bond(),
                    clearable: true,
                    hidden: this.doUpdate && visibility !== 'public',
                    label: texts.addressLabel,
                    name: 'address',
                    onAddItem: this.handleAddressAddItem,
                    onChange: this.handleAddressChange,
                    onSearchChange: this.handleAddressSearchChange,
                    options: !address ? [] : [{
                        key: address + name,
                        text: name || address,
                        value: address,
                    }],
                    placeholder: texts.addressPlaceholder,
                    required: true,
                    search: ['text', 'value'],
                    selection: true,
                    type: 'dropdown',
                    validate: this.doUpdate ? null : this.validateAddress,
                },
                {
                    bond: new Bond(),
                    label: texts.nameLabel,
                    name: 'name',
                    placeholder: texts.namePlaceholder,
                    required: true,
                    type: 'text',
                    validate: this.validateName,
                    value: '',
                },
                {
                    clearable: true,
                    label: texts.associatedIdentityLabel,
                    name: 'associatedIdentity',
                    options: [],
                    placeholder: texts.associatedIdentityPlaceholder,
                    selection: true,
                    search: true,
                    type: 'dropdown',
                },
                {
                    allowAdditions: true,
                    label: wordsCap.tags,
                    name: 'tags',
                    noResultsMessage: texts.tagsNoResultsMsg,
                    multiple: true,
                    onAddItem: this.handleAddTag,
                    options: (values.tags || []).map(tag => ({
                        key: tag,
                        text: tag,
                        value: tag
                    })),
                    placeholder: texts.tagsPlaceholder,
                    type: 'dropdown',
                    search: true,
                    selection: true,
                    value: values.tags || []
                },
                {
                    bond: new Bond(),
                    disabled: false, // only disable when company address selected
                    inline: true,
                    label: texts.visibilityLabel,
                    name: 'visibility',
                    options: [
                        { label: wordsCap.private, value: 'private' },
                        { label: wordsCap.public, value: 'public' }
                    ],
                    radio: true,
                    type: 'checkbox-group',
                    value: values.visibility || 'private'
                },
                {
                    bond: new Bond(),
                    label: texts.userIdLabel,
                    name: 'userId',
                    multiple: false,
                    placeholder: texts.userIdPlaceholder,
                    type: 'UserIdInput',
                },
            ]
        }
    }

    componentWillMount() {
        const { inputs, values } = this.state
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
        client.company(address, null, (_, company) => {
            addressIn.loading = false
            findInput(inputs, 'visibility').hidden = !!company
            findInput(inputs, 'name').hidden = !!company

            // make sure addressbook is also updated
            this.doUpdate && company && addressbook.setPublic(address)
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
            closeText: wordsCap.close,
            message: closeOnSubmit ? null : {
                content: this.doUpdate ? texts.submitSuccessMsg2 : texts.submitSuccessMsg1,
                showIcon: true,
                status: 'success'
            },
            success: true,
        })

        // Open add partner form
        isFn(onSubmit) && onSubmit(true, values)
        addCompany && showForm(CompanyForm, {
            message: {
                header: this.doUpdate ? texts.submitSuccessMsg2 : texts.submitSuccessMsg1,
                content: texts.companyFormOnOpenMsg,
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

    validateAddress(e, { value: address }) {
        if (!address) return
        const partner = addressbook.get(address)
        if (partner) return (
            <p>
                {texts.addressValidationMsg1} <br />
                {partner.name}
            </p>
        )
        if (!ss58Decode(address)) return texts.addressValidationMsg2
    }

    validateName = (e, { value: name }) => {
        const { values: oldValues } = this.props
        name = name.trim()
        if (this.doUpdate && isObj(oldValues) && oldValues.name === name) return
        if (addressbook.getByName(name)) return texts.nameValidationMsg
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