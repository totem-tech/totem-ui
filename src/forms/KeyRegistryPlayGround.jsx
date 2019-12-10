import React, { Component } from 'react'
import FormBuilder, { findInput } from '../components/FormBuilder'
import identities from '../services/identity'
import { newSignature, signingKeyPair, verifySignature } from '../utils/naclHelper'
import { decodeUTF8, bytesToHex } from '../utils/convert'


export default class KeyRegistryPlayground extends Component {
    constructor() {
        super()
        this.state = {
            onSubmit: this.handleSubmit.bind(this),
            submitDisabled: true,
            inputs: [
                {
                    label: 'Identity',
                    name: 'address',
                    onChange: this.generateSignature.bind(this),
                    options: identities.getAll().map(({ address, name }) => ({
                        key: address,
                        text: name,
                        value: address,
                    })),
                    search: true,
                    selection: true,
                    type: 'dropdown',
                },
                {
                    label: 'Message',
                    name: 'data',
                    onChange: this.generateSignature.bind(this),
                    type: 'text',
                    value: '',
                },
                {
                    label: 'data (hex)',
                    name: 'dataHex',
                    type: 'textarea',
                    value: '',
                },
                {
                    label: 'Signature (hex)',
                    name: 'signature',
                    type: 'textarea',
                    value: '',
                }
            ]
        }
    }

    generateSignature(e, { data, address }) {
        if (!data || !address) return
        const { inputs } = this.state
        const identity = identities.find(address)
        const keyPair = signingKeyPair(identity.keyData) // signKeypair
        const signature = newSignature(data, keyPair.secretKey, false)
        findInput(inputs, 'dataHex').value = '0x' + bytesToHex(decodeUTF8(data))
        findInput(inputs, 'signature').value = '0x' + bytesToHex(signature)
        this.setState({ inputs })
    }

    handleSubmit(e, values) {

    }

    render() {
        return <FormBuilder {...this.state} />
    }
}