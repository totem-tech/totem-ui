import React, { Component } from 'react'
import FormBuilder, { findInput } from '../components/FormBuilder'
import identities from '../services/identity'
import { newSignature, signingKeyPair, verifySignature } from '../utils/naclHelper'
import { encodeBase64, decodeBase64, decodeUTF8, bytesToHex } from '../utils/convert'


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
                    label: 'public key (hex and base64)',
                    name: 'publicHex',
                    type: 'textarea',
                    value: '',
                },
                {
                    label: 'private key (hex and base64)',
                    name: 'privateHex',
                    type: 'textarea',
                    value: '',
                },
                {
                    label: 'Signature (hex and base64)',
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
        findInput(inputs, 'signature').value = '0x' + bytesToHex(signature) + '\n' + encodeBase64(signature)
        findInput(inputs, 'publicHex').value = '0x' + bytesToHex(decodeBase64(keyPair.publicKey)) + '\n' + keyPair.publicKey 
        findInput(inputs, 'privateHex').value = '0x' + bytesToHex(decodeBase64(keyPair.secretKey)) + '\n' + keyPair.secretKey
        this.setState({ inputs })
    }

    handleSubmit(e, values) {

    }

    render() {
        return <FormBuilder {...this.state} />
    }
}