import React, { Component } from 'react'
import { Bond } from 'oo7'
import FormBuilder, { findInput } from '../components/FormBuilder'
import identities from '../services/identity'
import { newSignature, signingKeyPair, verifySignature } from '../utils/naclHelper'
import { encodeBase64, decodeUTF8, bytesToHex } from '../utils/convert'
import { addToQueue, QUEUE_TYPES } from '../services/queue'


export default class KeyRegistryPlayground extends Component {
    constructor() {
        super()
        this.state = {
            onSubmit: this.handleSubmit.bind(this),
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
                    required: true,
                    search: true,
                    selection: true,
                    type: 'dropdown',
                },
                {
                    label: 'Message',
                    name: 'data',
                    onChange: this.generateSignature.bind(this),
                    required: true,
                    type: 'text',
                    value: '',
                },
                {
                    bond: new Bond(),
                    label: 'Data (hex)',
                    name: 'dataHex',
                    required: true,
                    type: 'textarea',
                    value: '',
                },
                {
                    bond: new Bond(),
                    label: 'Signature (hex)',
                    name: 'signature',
                    required: true,
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
        const keyPair = signingKeyPair(identity.keyData, false) // signKeypair
        this.publicKey = ss58Encode(keyPair.publicKey)
        this.data = decodeUTF8(data)

        this.signature = newSignature(encodeBase64(this.data), encodeBase64(keyPair.secretKey), false)
        findInput(inputs, 'dataHex').bond.changed('0x' + bytesToHex(this.data))
        findInput(inputs, 'signature').bond.changed('0x' + bytesToHex(this.signature))
    }

    handleSubmit(e, { address }) {
        this.setState({ loading: true })
        addToQueue({
            type: QUEUE_TYPES.BLOCKCHAIN,
            title: 'Register Key',
            func: 'registerKey',
            args: [address, this.publicKey, this.signature, this.data],
            then: (success) => {
                this.setState({
                    loading: false,
                    message: {
                        header: 'Transaction ' + (success ? 'Success!' : 'Failed'),
                        status: success ? 'success' : 'error',
                    }
                })
            }
        })
    }

    render() {
        return <FormBuilder {...this.state} />
    }
}