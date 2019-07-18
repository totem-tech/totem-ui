import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import { secretStore } from 'oo7-substrate'
import FormBuilder from './FormBuilder'
import faker from 'faker'
import { isDefined } from '../utils';

class Company extends ReactiveComponent {
    constructor(props) {
        super(props, {secretStore: secretStore()})

        this.handleSubmit = this.handleSubmit.bind(this)

        const countries = faker.definitions.address.country
        this.state = {
            message: {},
            open: props.open,
            success: false,
            inputs: [
                {
                    label: 'Company Name',
                    name: 'name',
                    required: true,
                    type: 'text'
                },
                {
                    label: 'Company Wallet',
                    name: 'walletAddress',
                    required: true,
                    selection: true,
                    search: true,
                    type: 'dropdown'
                },
                {
                    label: 'Registration Number',
                    name: 'regNumber',
                    required: true,
                    type: 'text'
                },
                {
                    label: 'Country',
                    name: 'country',
                    options: countries.map((country, key) => ({
                        key,
                        text: country,
                        value: country
                    })),
                    required: true,
                    selection: true,
                    search: true,
                    type: 'dropdown'
                }
            ]
        }
    }

    handleSubmit(e, values) {
        const { onSubmit } = this.props
        console.log(values)
    }

    render() {
        const { inputs, message, open, secretStore, success } = this.state
        const { modal, open: propsOpen, size } = this.props
        const isOpenControlled = modal && isDefined(propsOpen)

        // add wallet address options
        inputs.find(x => x.name === 'walletAddress')
            .options = secretStore && secretStore.keys.map((wallet, key) => ({
                key,
                text: wallet.name,
                value: wallet.address
            }))

        return (
            <FormBuilder {...{
                inputs,
                message,
                modal,
                open: isOpenControlled ? propsOpen : open,
                success,
                size,
            }} />
        )
    }
}
Company.propTypes = {
    
}
Company.defaultProps = {
    header: 'Publish company',
    size: 'tiny'
}
export default Company