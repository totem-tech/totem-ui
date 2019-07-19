import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import FormBuilder from './FormBuilder'
import faker from 'faker'
import { isDefined, isFn } from '../utils';
import client from '../../services/ChatClient'

class Company extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.handleSubmit = this.handleSubmit.bind(this)

        const countries = faker.definitions.address.country
        this.state = {
            message: props.message || {},
            open: props.open,
            success: false,
            inputs: [
                {
                    label: 'Company Wallet',
                    name: 'walletAddress',
                    readOnly: true,
                    type: 'text',
                    value: props.walletAddress
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
                    options: countries.map((country, key) => ({
                        key,
                        text: country,
                        value: country
                    })),
                    placeholder: 'Select a country',
                    required: true,
                    selection: true,
                    search: true,
                    type: 'dropdown'
                }
            ]
        }
    }

    handleSubmit(e, values) {
        const { onSubmit, walletAddress } = this.props
        client.company(walletAddress, values, err => {
            const success = !err
            const message = {
                header: success ? 'Company added successfully' : err,
                status: success ? 'success' : 'error'
            }
            this.setState({success, message})

            isFn(onSubmit) && onSubmit(e, values, success)
        })
    }

    render() {
        const { inputs, message, open, success } = this.state
        const { header, modal, open: propsOpen, size, subheader } = this.props

        return (
            <FormBuilder {...{
                header,
                inputs,
                message,
                modal,
                onSubmit: this.handleSubmit,
                open: modal && isDefined(propsOpen) ? propsOpen : open,
                success,
                size,
                subheader
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