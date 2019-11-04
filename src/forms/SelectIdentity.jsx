import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import { secretStore } from 'oo7-substrate'
import FormBuilder, { fillValues } from '../components/FormBuilder'
import { isFn, isObj } from '../utils/utils'

// 
export default class SelectIdentityForm extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.state = {
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

        isObj(props.values) && fillValues(this.state.inputs, props.values)
    }

    handleSubmit(e, values) {
        const { onSubmit } = this.props
        this.setState({ success: true })
        isFn(onSubmit) && onSubmit(true, values)
    }

    render() {
        const { inputs, success } = this.state
        return (
            <FormBuilder
                {...this.props}
                {...{
                    inputs,
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