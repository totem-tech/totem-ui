import React, { useEffect, useState } from 'react'
import { Icon } from 'semantic-ui-react'
import FormBuilder, { fillValues, findInput } from '../../components/FormBuilder'
import { translated } from '../../services/language'
import { showForm } from '../../services/modal'
import { useRxSubject } from '../../services/react'
import { textEllipsis } from '../../utils/utils'
import { get as getIdentity, rxIdentities } from '../identity/identity'
import { get as getLocation } from '../location/location'

const textsCap = translated({
    blockchainLabel: 'Blockchain',
    blockchainPlaceholder: 'select Blockchain you want to make deposit in',
    emailLabel: 'email address',
    emailPlaceholder: 'enter you email address',
    ethAddressLabel: 'your Ethereum address',
    ethAddressPlaceholder: 'enter the address you will deposit from',
    familyNameLabel: 'family name',
    familyNamePlaceholder: 'enter your family name',
    givenNameLabel: 'given name',
    givenNamePlaceholder: 'enter your given name',
    formHeader: 'request deposit address',
    identityErrorLocation: 'please select an identity with contact address',
    identityLabel: 'identity (to receive funds)',
    identityPlaceholder: 'select an identity',
}, true)[1]
export const inputNames = {
    blockchain: 'blockchain',
    email: 'email',
    ethAddress: 'ethAddress',
    familyName: 'familyName',
    givenName: 'givenName',
    identity: 'identity',
}

export default function RequestFrom(props = {}) {
    const [inputs] = useState(fillValues(formInputs, props.values))
    const [state, setState] = useState({})
    const [identityOptions] = useRxSubject(
        rxIdentities,
        map => Array.from(map).map(([_, { address, locationId, name }]) => {
            let location = getLocation(locationId)
            return {
                description: !location ? '' : (
                    <span>
                        <Icon className='no-margin' name='building' /> {textEllipsis(location.name, 15, 3, false)}
                    </span>
                ), //location name with icon
                key: address,
                text: name,
                value: address,
            }
        })
    )
    findInput(inputs, inputNames.identity).options = identityOptions

    useEffect(() => {
        setState.mounted = true
        return () => setState.mounted = false
    }, [setState])

    return (
        <FormBuilder {...{
            ...props,
            ...state,
            inputs,
            onSubmit: handleSubmit.bind({ props, state, setState, inputs }),
        }} />
    )
}
RequestFrom.defaultProps = {
    header: textsCap.formHeader,
    size: 'tiny',
}

const formInputs = [
    {
        label: textsCap.identityLabel,
        name: inputNames.identity,
        options: [],
        placeholder: textsCap.identityPlaceholder,
        required: true,
        search: ['text', 'value', 'description'],
        selection: true,
        type: 'dropdown',
        validate: (_, { value }) => {
            if (!value) return
            const { locationId } = getIdentity(value) || {}
            return locationId ? false : textsCap.identityErrorLocation
        }
    },
    {
        name: 'names',
        type: 'group',
        inputs: [
            {
                label: textsCap.givenNameLabel,
                maxLength: 64,
                minLength: 3,
                name: inputNames.givenName,
                placeholder: textsCap.givenNamePlaceholder,
                required: true,
                type: 'text',
            },
            {
                label: textsCap.familyNameLabel,
                maxLength: 64,
                minLength: 3,
                name: inputNames.familyName,
                placeholder: textsCap.familyNamePlaceholder,
                required: true,
                type: 'text',
            },
        ],
    },
    {
        label: textsCap.emailLabel,
        maxLength: 64,
        minLength: 3,
        name: inputNames.email,
        placeholder: textsCap.emailPlaceholder,
        required: true,
        type: 'email',
    },
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
        search: ['text', 'value'],
        selection: true,
        type: 'dropdown'
    },
    {
        label: textsCap.ethAddressLabel,
        name: inputNames.ethAddress,
        placeholder: textsCap.ethAddressPlaceholder,
        required: false, // only required when ETH selected
        type: 'text',
    }
]

function handleSubmit(_, values) {
    const { props, state, setState } = this || {}
    console.log('onSumbit: loading start')
    setState.mounted && setState({...state, loading: true})

    setTimeout(() => {
        console.log('onSumbit: loading stop')
        setState.mounted && setState({...state, loading: false, success: true})
    }, 3000)
}
showForm(RequestFrom)