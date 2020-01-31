import React from 'react'
import PropTypes from 'prop-types'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import { ss58Decode } from 'oo7-substrate'
import FormBuilder, { findInput, fillValues } from '../components/FormBuilder'
import { deferred, isFn, isObj, textCapitalize } from '../utils/utils'
import client from '../services/chatClient'
import storage from '../services/storage'
import { setPublic } from '../services/partner'

const words = {
    identity: 'identity',
    success: 'success',
}
const wordsCap = textCapitalize(words)
const texts = {
    companyExistsMsg: 'An entity already exists with the following name. You cannot resubmit.',
    countryLabel: 'Country of Registration',
    countryPlaceholder: 'Select a country',
    header: 'Make Partner Public',
    identityValidationMsg: 'Please enter a valid Totem Identity',
    nameLabel: 'Company or Entity Name',
    namePlaceholder: 'Enter the trade name',
    regNumLabel: 'Registered Number',
    regNumPlaceholder: 'Enter national registered number of entity',
    submitSuccessMsg: 'Company added successfully',
    submitErrorHeader: 'Submission failed',
    subheader: 'Warning: doing this makes this partner visible to all Totem users',
}

export default class Company extends ReactiveComponent {
    constructor(props) {
        super(props)

        const { walletAddress } = props.values || {}
        this.state = {
            message: props.message || {},
            success: false,
            onSubmit: this.handleSubmit.bind(this),
            inputs: [
                {
                    bond: new Bond(),
                    label: wordsCap.identity,
                    name: 'walletAddress',
                    onChange: deferred((_, { walletAddress }) => this.checkCompany(walletAddress), 300),
                    readOnly: !!walletAddress,
                    type: 'text',
                    validate: (e, { value }) => !ss58Decode(value) ? texts.identityValidationMsg : null,
                    value: ''
                },
                {
                    label: texts.nameLabel,
                    name: 'name',
                    placeholder: texts.namePlaceholder,
                    required: true,
                    type: 'text',
                    value: ''
                },
                {
                    label: texts.regNumLabel,
                    name: 'registrationNumber',
                    placeholder: texts.regNumPlaceholder,
                    required: true,
                    type: 'text',
                    value: ''
                },
                {
                    label: texts.countryLabel,
                    name: 'country',
                    options: Array.from(storage.countries.getAll()).map(([_, { code, name }]) => ({
                        key: code,
                        text: name,
                        value: code
                    })),
                    placeholder: texts.countryPlaceholder,
                    required: true,
                    selection: true,
                    search: true,
                    type: 'dropdown'
                }
            ]
        }
    }

    componentWillMount() {
        const { inputs } = this.state
        fillValues(inputs, this.props.values)
        this.setState({ inputs })
    }

    checkCompany(walletAddress) {
        // check if a company already exists with address
        const { inputs } = this.state
        const wAddrIn = findInput(inputs, 'walletAddress')
        wAddrIn.loading = true
        this.setState({ inputs })

        client.company(walletAddress, null, (_, company) => {
            const exists = isObj(company)
            wAddrIn.loading = false
            wAddrIn.invalid = exists
            wAddrIn.message = !exists ? null : {
                content: (
                    <div>
                        {texts.companyExistsMsg}
                        <div><b>{company.name}</b></div>
                    </div>
                ),
                showIcon: true,
                status: 'error',
            }
            this.setState({ inputs })
            exists && setPublic(walletAddress)
        })

    }

    handleSubmit(e, values) {
        const { onSubmit } = this.props
        client.company(values.walletAddress, values, err => {
            const success = !err
            const message = {
                content: success ? texts.submitSuccessMsg : err,
                header: success ? wordsCap.success : texts.submitErrorHeader,
                showIcon: true,
                status: success ? 'success' : 'error'
            }
            this.setState({ success, message })

            isFn(onSubmit) && onSubmit(e, values, success)
        })
    }

    render() {
        return <FormBuilder {...{ ...this.props, ...this.state }} />
    }
}
Company.propTypes = {
    values: PropTypes.shape({
        country: PropTypes.string,
        name: PropTypes.string,
        registrationNumber: PropTypes.string,
        walletAddress: PropTypes.string.isRequired
    })
}
Company.defaultProps = {
    header: texts.header,
    size: 'tiny',
    subheader: texts.subheader,
}