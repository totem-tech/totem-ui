import React, { Component } from 'react'
import { Bond } from 'oo7'
import FormBuilder, { findInput } from '../components/FormBuilder'
import { newSignature, signingKeyPair, verifySignature } from '../utils/naclHelper'
import { encodeBase64, decodeBase64, decodeUTF8, bytesToHex, hashToStr } from '../utils/convert'
// services
import identities from '../services/identity'
import { tasks } from '../services/blockchain'
import { addToQueue, QUEUE_TYPES } from '../services/queue'

export default class KeyRegistryPlayground extends Component {
    constructor() {
        super()
        this.state = {
            onSubmit: this.handleSubmit,
            inputs: [
                {
                    label: 'Identity',
                    name: 'address',
                    onChange: this.generateSignature,
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
                    onChange: this.generateSignature,
                    required: true,
                    type: 'text',
                    value: '',
                },
                {
                    bond: new Bond(),
                    label: 'Message (hex)',
                    name: 'dataHex',
                    required: true,
                    type: 'text',
                    value: '',
                },
                {
                    bond: new Bond(),
                    label: 'Public key - hex',
                    name: 'publicHex',
                    required: true,
                    type: 'text',
                    value: '',
                },
                {
                    bond: new Bond(),
                    label: 'Public key - base64',
                    name: 'publicBase64',
                    type: 'text',
                    value: '',
                },
                {
                    bond: new Bond(),
                    label: 'Private key - hex',
                    name: 'privateHex',
                    required: true,
                    type: 'text',
                    value: '',
                },
                {
                    bond: new Bond(),
                    label: 'Private key - base64',
                    name: 'privateBase64',
                    type: 'text',
                    value: '',
                },
                {
                    bond: new Bond(),
                    label: 'Signature - hex',
                    name: 'signatureHex',
                    required: true,
                    type: 'text',
                    value: '',
                },
                {
                    bond: new Bond(),
                    label: 'Signature - base64',
                    name: 'signatureBase64',
                    type: 'text',
                    value: '',
                },
            ]
        }
    }

    generateSignature = (e, { data, address }) => {
        if (!data || !address) return
        const { inputs } = this.state
        const identity = identities.find(address)
        const keyPair = signingKeyPair(identity.keyData)
        const signature = newSignature(data, keyPair.secretKey, false)
        const newValues = {
            dataHex: hashToStr(decodeUTF8(data)),
            signatureHex: hashToStr(signature),
            signatureBase64: encodeBase64(signature),
            publicHex: hashToStr(decodeBase64(keyPair.publicKey)),
            publicBase64: keyPair.publicKey,
            privateHex: hashToStr(decodeBase64(keyPair.secretKey)),
            privateBase64: keyPair.secretKey,
        }
        Object.keys(newValues).forEach(key => findInput(inputs, key).bond.changed(newValues[key]))
    }

    handleSubmit = (e, { address, dataHex, publicHex, signatureHex }) => {
        this.setState({ loading: true })
        addToQueue(tasks.registerKey(address, publicHex, dataHex, signatureHex, {
            title: 'Register Key',
            then: success => {
                this.setState({
                    loading: false,
                    message: {
                        header: 'Transaction ' + (success ? 'Success!' : 'Failed'),
                        status: success ? 'success' : 'error',
                    }
                })
            }
        }))
    }

    render = () => <FormBuilder {...this.state} />
}