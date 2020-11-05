import React, { useEffect, useReducer, useState } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import FormBuilder, { fillValues, findInput } from '../../components/FormBuilder'
import { translated } from '../../services/language'
import { reducer } from '../../services/react'
import client from '../chat/ChatClient'
import { isFn } from '../../utils/utils'

const textsCap = translated({
    addressAlreadyAllocated: 'you have already been assigned an address for this chain',
    blockchainLabel: 'Blockchain',
    blockchainPlaceholder: 'select Blockchain you want to make deposit in',
    ethAddressError: 'valid Ethereum address required',
    ethAddressLabel: 'whitelist your own Ethereum address',
    ethAddressPlaceholder: 'enter the address you will deposit from',
    formHeader: 'request deposit address',
    kycNotDoneMsg: 'you have not submitted your KYC yet!',
}, true)[1]
export const inputNames = {
    blockchain: 'blockchain',
    ethAddress: 'ethAddress',
}

export default function DAAForm(props = {}) {
    const [state, setStateOrg] = useReducer(reducer, { message: props.message })
    const [setState] = useState(() => (...args) => setState.mounted && setStateOrg(...args))
    const [inputs] = useState(() => fillValues(formInputs, props.values))

    useEffect(() => {
        setState.mounted = true
        setState({
            loading: true,
            onSubmit: handleSubmitCb(setState, props),
        })
        client.crowdsaleKYC
            .promise(true)
            .then(kycDone => {
                setState({
                    inputsDisabled: kycDone ? [] : inputNames,
                    loading: false,
                    message: kycDone
                        ? null
                        : {
                            content: textsCap.kycNotDoneMsg,
                            icon: true,
                            status: 'error',
                        }
                })
                return
            })
            // ignore error | should not occur
            .catch(console.log)
        return () => setState.mounted = false
    }, [setState])

    return <FormBuilder {...{ ...props, ...state, inputs }} />
}
DAAForm.propTypes = {
    values: PropTypes.object,
}
DAAForm.defaultProps = {
    closeOnSubmit: true,
    header: textsCap.formHeader,
    size: 'tiny',
}

// showForm(RequestFrom) // remove

const handleSubmitCb = (setState, props) => async (_, values) => {
    const { onSubmit } = props
    const blockchain = values[inputNames.blockchain]
    const ethAddress = values[inputNames.ethAddress]
    const newState = { loading: true, message: null, success: false }
    setState(newState)
    
    try {
        const address = await client.crowdsaleDAA.promise(blockchain, ethAddress)
        newState.success = !!address
    } catch (err) {
        newState.message = {
            content: `${err}`,
            icon: true,
            status: 'error',
        }
    }
    newState.loading = false
    setState(newState)
    isFn(onSubmit) && onSubmit(newState.success, values)
}

const formInputs = Object.freeze([
    {
        label: textsCap.blockchainLabel,
        name: inputNames.blockchain,
        options: [
            {
                description: 'BTC',
                icon: 'bitcoin',
                text: 'Bitcoin',
                value: 'BTC',
            },
            {
                description: 'ETH',
                icon: 'ethereum',
                text: 'Ethereum',
                value: 'ETH',
            },
            {
                description: 'DOT',
                icon: 'pinterest',
                text: 'Polkadot',
                value: 'DOT',
            },
        ],
        placeholder: textsCap.blockchainPlaceholder,
        required: true,
        rxValue: new BehaviorSubject(),
        search: ['text', 'value'],
        selectOnNavigation: false,
        selection: true,
        simple: true,
        type: 'dropdown',
        // check if user already has been assigned a requested deposit address for selected chain
        validate: async (_, { value: blockchain }, values) => {
            try {
                const address = await client.crowdsaleDAA.promise(blockchain, '0x0')
                return address && textsCap.addressAlreadyAllocated
            } catch (err) {
                return err
            }
        },
    },
    {
        chainType: 'ethereum', // validates the identity type as Ethereum address
        customMessages: { identity: textsCap.ethAddressError },
        hidden: values => values[inputNames.blockchain] !== 'ETH',
        ignoreAttributes: [ 'chainType' ], // prevents the chainType property being passed to an element
        label: textsCap.ethAddressLabel,
        name: inputNames.ethAddress,
        placeholder: textsCap.ethAddressPlaceholder,
        required: true,
        type: 'identity',
    }
])