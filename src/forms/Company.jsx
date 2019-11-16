import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { ss58Decode } from 'oo7-substrate'
import FormBuilder, { findInput, fillValues } from '../components/FormBuilder'
import { deferred, isFn, isObj } from '../utils/utils'
import client from '../services/ChatClient'
import storage from '../services/storage'

class Company extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.handleSubmit = this.handleSubmit.bind(this)

        const { name, walletAddress } = props.values || {}
        this.state = {
            message: props.message || {},
            success: false,
            inputs: [
                {
                    label: 'Identity',
                    name: 'walletAddress',
                    onChange: deferred((_, { walletAddress }) => this.checkCompany(walletAddress), 300),
                    readOnly: !!walletAddress,
                    type: 'text',
                    validate: (e, { value }) => !ss58Decode(value) ? 'Please enter a valid Totem Identity' : null,
                    value: walletAddress || ''
                },
                {
                    label: 'Company or Entity Name',
                    name: 'name',
                    placeholder: 'Enter the trade name',
                    required: true,
                    type: 'text',
                    value: name || ''
                },
                {
                    label: 'Registered Number',
                    name: 'registrationNumber',
                    placeholder: 'Enter national registered number of entity',
                    required: true,
                    type: 'text',
                    value: ''
                },
                {
                    label: 'Country of Registration',
                    name: 'country',
                    options: Array.from(storage.countries.getAll()).map(([_, { code, name }]) => ({
                        key: code,
                        text: name,
                        value: code
                    })),
                    placeholder: 'Select a country',
                    required: true,
                    selection: true,
                    search: true,
                    type: 'dropdown'
                }
            ]
        }

        if (!!walletAddress) setTimeout(() => this.checkCompany(walletAddress))
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
                content: `An entity called "${company.name}" already exists. You cannot resubmit.`,
                showIcon: true,
                status: 'error',
            }
            this.setState({ inputs })
        })

    }

    handleSubmit(e, values) {
        const { onSubmit } = this.props
        client.company(values.walletAddress, values, err => {
            const success = !err
            const message = {
                content: success ? 'Company added successfully' : err,
                header: success ? 'Success' : 'Submission failed',
                showIcon: true,
                status: success ? 'success' : 'error'
            }
            this.setState({ success, message })

            isFn(onSubmit) && onSubmit(e, values, success)
        })
    }

    render() {
        return (
            <FormBuilder {...{
                ...this.props,
                ...this.state,
                onSubmit: this.handleSubmit,
            }} />
        )
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
    header: 'Add company',
    size: 'tiny',
    subheader: 'Add your or a third-party company that is publicly visible'
}
export default Company