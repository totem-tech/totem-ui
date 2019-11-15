import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { ss58Decode } from 'oo7-substrate'
import FormBuilder, { findInput } from '../components/FormBuilder'
import { deferred, isFn, isObj } from '../utils/utils'
import client from '../services/ChatClient'
import storage from '../services/storage'

class Company extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.handleSubmit = this.handleSubmit.bind(this)

        const { walletAddress } = props
        this.state = {
            message: props.message || {},
            success: false,
            inputs: [
                {
                    label: 'Identity',
                    name: 'walletAddress',
                    onChange: deferred((_, { walletAddress }) => this.checkCompany(walletAddress), 300),
                    readOnly: true,
                    type: 'text',
                    validate: (e, { value }) => !ss58Decode(value) ? 'Please enter a valid address' : null,
                    value: walletAddress || ''
                },
                {
                    label: 'Company Name',
                    name: 'name',
                    placeholder: 'Enter company name',
                    required: true,
                    type: 'text',
                    value: ''
                },
                {
                    label: 'Registration Number',
                    name: 'registrationNumber',
                    placeholder: 'Enter registration number',
                    required: true,
                    type: 'text',
                    value: ''
                },
                {
                    label: 'Country',
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
                content: `A company called "${company.name}" already exists using this identity`,
                showIcon: true,
                status: 'error',
            }
            this.setState({ inputs })
        })

    }

    handleSubmit(e, values) {
        const { onSubmit, walletAddress } = this.props
        client.company(walletAddress, values, err => {
            const success = !err
            const message = {
                header: success ? 'Company added successfully' : err,
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
    walletAddress: PropTypes.string.isRequired
}
Company.defaultProps = {
    header: 'Add company',
    size: 'tiny',
    subheader: 'Add your or a third-party company that is publicly visible'
}
export default Company