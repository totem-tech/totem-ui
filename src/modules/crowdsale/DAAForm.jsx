import React, { useEffect, useReducer, useState } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import FormBuilder, { fillValues, findInput } from '../../components/FormBuilder'
import { translated } from '../../services/language'
import { reducer } from '../../services/react'
import client from '../chat/ChatClient'
import { isFn } from '../../utils/utils'
import { crowdsaleData } from './crowdsale'
import PromisE from '../../utils/PromisE'

const textsCap = translated({
    addressAlreadyAllocated: 'you have already been assigned an address for this chain.',
    addressAlreadyAllocated2: 'Reload page to see your missing address.',
    blockchainLabel: 'Blockchain',
    blockchainPlaceholder: 'select Blockchain you want to make deposit in',
    ethAddressError: 'valid Ethereum address required',
    ethAddressLabel: 'whitelist your own Ethereum address',
    ethAddressLabelDetails: 'this is the Ethereum address you will be sending funds from',
    ethAddressPlaceholder: 'enter the Ethereum address you will deposit from',
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
    const [inputs] = useState(() => fillValues(getInputs(), props.values, true))

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

const handleSubmitCb = (setState, props) => async (_, values) => {
    const { onSubmit } = props
    const blockchain = values[inputNames.blockchain]
    const isETH =  blockchain === 'ETH'
    const newState = { loading: true, message: null, success: false }
    setState(newState)
    
    try {
        const address = await client.crowdsaleDAA.promise(
            blockchain,
            isETH ? values[inputNames.ethAddress] : ''
        )
        newState.success = !!address
        let { blockchains = [], depositAddresses = {}, ethAddress } = crowdsaleData()
        depositAddresses[blockchain] = address
        ethAddress = isETH
            ? values[inputNames.ethAddress]
            : ethAddress
        
        if (!blockchains.includes(blockchain)) blockchains.push(blockchain)

        // makes sure to save the ethAddress to localStorage
        crowdsaleData({ blockchains, ethAddress, depositAddresses })
        await PromisE.delay(1000)
    } catch (err) {
        newState.success = false
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

export const getInputs = () => [
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
                const { depositAddresses = {} } = crowdsaleData()
                if (!!depositAddresses[blockchain]) return textsCap.addressAlreadyAllocated

                const address = await client.crowdsaleDAA.promise(blockchain, '0x0')
                depositAddresses[blockchain] = address
                crowdsaleData({ depositAddresses })
                return address && `${textsCap.addressAlreadyAllocated} ${textsCap.addressAlreadyAllocated2}`
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
        labelDetails: textsCap.ethAddressLabelDetails,
        name: inputNames.ethAddress,
        placeholder: textsCap.ethAddressPlaceholder,
        required: true,
        type: 'identity',
    }
]