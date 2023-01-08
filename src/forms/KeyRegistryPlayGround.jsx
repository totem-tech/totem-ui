import React, { Component } from 'react'
import { BehaviorSubject } from 'rxjs'
import { getIdentityOptions } from '../modules/identity/getIdentityOptions'
// import FormBuilder, { findInput } from '../components/FormBuilder'
// import { newSignature, signingKeyPair, verifySignature } from '../utils/naclHelper'
// import { encodeBase64, decodeBase64, decodeUTF8, hashToStr } from '../utils/convert'
// services
import { rxIdentities } from '../modules/identity/identity'
import { queueables } from '../services/blockchain'
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
                    rxOptions: rxIdentities,
                    rxOptionsModifier: getIdentityOptions,
                    required: true,
                    search: ['keywords'],
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
                    rxValue: new BehaviorSubject(),
                    label: 'Message (hex)',
                    name: 'dataHex',
                    required: true,
                    type: 'text',
                    value: '',
                },
                {
                    rxValue: new BehaviorSubject(),
                    label: 'Public key - hex',
                    name: 'publicHex',
                    required: true,
                    type: 'text',
                    value: '',
                },
                {
                    rxValue: new BehaviorSubject(),
                    label: 'Public key - base64',
                    name: 'publicBase64',
                    type: 'text',
                    value: '',
                },
                {
                    rxValue: new BehaviorSubject(),
                    label: 'Private key - hex',
                    name: 'privateHex',
                    required: true,
                    type: 'text',
                    value: '',
                },
                {
                    rxValue: new BehaviorSubject(),
                    label: 'Private key - base64',
                    name: 'privateBase64',
                    type: 'text',
                    value: '',
                },
                {
                    rxValue: new BehaviorSubject(),
                    label: 'Signature - hex',
                    name: 'signatureHex',
                    required: true,
                    type: 'text',
                    value: '',
                },
                {
                    rxValue: new BehaviorSubject(),
                    label: 'Signature - base64',
                    name: 'signatureBase64',
                    type: 'text',
                    value: '',
                },
            ]
        }
    }

    generateSignature = async (e, { data, address }) => {
        if (!data || !address) return
        // const { inputs } = this.state
        // const identity = identities.find(address)
        // const keyPair = signingKeyPair(identity.keyData)
        // const signature = newSignature(data, keyPair.secretKey, false)
        // const newValues = {
        //     dataHex: hashToStr(decodeUTF8(data)),
        //     signatureHex: hashToStr(signature),
        //     signatureBase64: encodeBase64(signature),
        //     publicHex: hashToStr(decodeBase64(keyPair.publicKey)),
        //     publicBase64: keyPair.publicKey,
        //     privateHex: hashToStr(decodeBase64(keyPair.secretKey)),
        //     privateBase64: keyPair.secretKey,
        // }
        // Object.keys(newValues).forEach(key => findInput(inputs, key).rxValue.changed(newValues[key]))
    }

    handleSubmit = (e, { address, dataHex, publicHex, signatureHex }) => {
        this.setState({ loading: true })
        addToQueue(queueables.registerKey(address, publicHex, dataHex, signatureHex, {
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

    render = () => 'REQUIRES MIGRATION TO POLKADOTJS' //<FormBuilder {...this.state} />
}