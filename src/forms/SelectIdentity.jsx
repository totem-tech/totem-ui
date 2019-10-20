import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import { secretStore } from 'oo7-substrate'
import FormBuilder from '../components/FormBuilder'
import { isFn } from '../utils/utils'

// 
export default class SelectIdentityForm extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.state = {
            message: {},
            success: false,
            inputs: [
                {
                    label: 'Identity',
                    name: 'address',
                    options: secretStore()._keys.map((wallet, i) => ({
                        key: i,
                        text: wallet.name,
                        value: wallet.address
                    })),
                    placeholder: 'Select identity/wallet',
                    required: true,
                    search: true,
                    selection: true,
                    type: 'dropdown',
                }
            ]
        }
    }

    handleSubmit(e, values) {
        const { onSubmit } = this.props
        this.setState({ success: true })
        isFn(onSubmit) && onSubmit(true, values)
    }

    render() {
        const { inputs, message, success } = this.state
        return (
            <FormBuilder
                {...this.props}
                {...{
                    inputs,
                    message,
                    onSubmit: this.handleSubmit.bind(this),
                    success,
                }}
            />
        )
    }
}
SelectIdentityForm.defaultProps = {
    closeOnSubmit: true,
    header: 'Select An Identity',
    size: 'tiny'
}