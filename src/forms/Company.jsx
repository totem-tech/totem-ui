import React from 'react'
import PropTypes from 'prop-types'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import { ss58Decode } from 'oo7-substrate'
import FormBuilder, { findInput, fillValues } from '../components/FormBuilder'
import { deferred, isFn, isObj } from '../utils/utils'
import client from '../services/chatClient'
import { translated } from '../services/language'
import { setPublic } from '../services/partner'
import storage from '../services/storage'

const [words, wordsCap] = translated({
    identity: 'identity',
    success: 'success',
}, true)
const [texts] = translated({
    companyExistsMsg: 'An entity already exists with the following name. You cannot resubmit.',
    countryLabel: 'Country of Registration',
    countryPlaceholder: 'Select a Country',
    header: 'Make Partner Public',
    identityValidationMsg: 'Please enter a valid Totem Identity',
    nameLabel: 'Company or Entity Name',
    namePlaceholder: 'Enter the trading name',
    regNumLabel: 'Registered Number',
    regNumPlaceholder: 'Enter national registered number of entity',
    submitSuccessMsg: 'Company added successfully',
    submitErrorHeader: 'Submission failed',
    subheader: 'Warning: doing this makes this partner visible to all Totem users',
})

export default class Company extends ReactiveComponent {
    constructor(props) {
        super(props)

        const { identity } = props.values || {}
        this.state = {
            message: props.message || {},
            success: false,
            onSubmit: this.handleSubmit,
            inputs: [
                {
                    bond: new Bond(),
                    label: wordsCap.identity,
                    name: 'identity',
                    onChange: deferred(this.handleIdentityChange, 300),
                    readOnly: !!identity,
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
                    options: Array.from(storage.countries.getAll())
                        .map(([_, { code, name }]) => ({
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
        fillValues(this.state.inputs, props.values)
    }

    handleIdentityChange = (_, { identity }) => {
        // check if a company already exists with address
        const { inputs } = this.state
        const input = findInput(inputs, 'identity')
        input.loading = true
        input.message = null
        this.setState({ inputs, submitDisabled: true })

        client.company(identity, null, (_, company) => {
            const exists = isObj(company)
            input.loading = false
            input.invalid = exists
            input.message = !exists ? null : {
                content: (
                    <div>
                        {texts.companyExistsMsg}
                        <div><b>{company.name}</b></div>
                    </div>
                ),
                showIcon: true,
                status: 'error',
            }
            this.setState({ inputs, submitDisabled: false })
            // if a company already exists associated with this address
            // update partner accordingly
            exists && setPublic(identity)
        })

    }

    handleSubmit = (e, values) => client.company(values.identity, values, err => {
        const { onSubmit } = this.props
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

    render = () => <FormBuilder {...{ ...this.props, ...this.state }} />
}
Company.propTypes = {
    values: PropTypes.shape({
        country: PropTypes.string,
        name: PropTypes.string,
        registrationNumber: PropTypes.string,
        identity: PropTypes.string.isRequired
    })
}
Company.defaultProps = {
    header: texts.header,
    size: 'tiny',
    subheader: texts.subheader,
}