import React, { useEffect, useReducer, useState } from 'react'
import { BehaviorSubject } from 'rxjs'
import { Button, Icon } from 'semantic-ui-react'
import { arrUnique, textEllipsis } from '../../utils/utils'
import FormBuilder, { fillValues, findInput } from '../../components/FormBuilder'
import { translated } from '../../services/language'
import { showForm } from '../../services/modal'
import { reducer, useRxSubject } from '../../services/react'
import { get as getIdentity, rxIdentities } from '../identity/identity'
import { get as getLocation } from '../location/location'
import IdentityForm from '../identity/IdentityForm'
import PromisE from '../../utils/PromisE'

const textsCap = translated({
    blockchainLabel: 'Blockchain',
    blockchainPlaceholder: 'select Blockchain you want to make deposit in',
    emailLabel: 'email address',
    emailPlaceholder: 'enter you email address',
    ethAddressError: 'valid Ethereum address required',
    ethAddressLabel: 'whitelist your Ethereum address',
    ethAddressPlaceholder: 'enter the address you will deposit from',
    familyNameLabel: 'family name',
    familyNamePlaceholder: 'enter your family name',
    givenNameLabel: 'given name',
    givenNamePlaceholder: 'enter your given name',
    formHeader: 'request deposit address',
    identityErrorLocation: 'please select an identity with contact address',
    identityLabel: 'identity (to receive funds)',
    identityPlaceholder: 'select an identity',
    updateIdentity: 'update identity',
}, true)[1]
const kycFields = {
    email: 'email',
    familyName: 'familyName',
    givenName: 'givenName',
    identity: 'identity',
}
export const inputNames = {
    ...kycFields,
    kycDone: 'kycDone',
    blockchain: 'blockchain',
    ethAddress: 'ethAddress',
}

export default function RequestFrom(props = {}) {
    const [state, setStateOrg] = useReducer(reducer, {})
    const [setState] = useState(() => (...args) => setState.mounted && setStateOrg(...args))
    const [inputs] = useRxSubject(rxIdentities, identitiesMap => {
        const inputs = [...formInputs.map(x => ({ ...x }))]
        const identityIn = findInput(inputs, inputNames.identity)
        identityIn.options = Array.from(identitiesMap)
            .map(([_, { address, locationId, name }]) => {
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
        return inputs
    })

    useEffect(() => {
        setState.mounted = true
        setState({ loading: true, onSubmit: handleSubmitCb(setState) })
        setTimeout(() => {
            findInput(inputs, inputNames.kycDone)
                .rxValue.next(false)
            setState({ loading: false })
            return
        }, 300)
        return () => setState.mounted = false
    }, [setState])

    return <FormBuilder {...{ ...props, ...state, inputs }} />
}
RequestFrom.defaultProps = {
    header: textsCap.formHeader,
    size: 'tiny',
}

showForm(RequestFrom) // remove

const handleSubmitCb = setState => (_, values) => {
    console.log('onSumbit: loading start')
    setState({ loading: true })

    setTimeout(() => {
        console.log('onSumbit: loading stop')
        setState({ loading: false, success: true })
    }, 3000)
}

const hideIfKycDone = values => !!values[inputNames.kycDone]
const formInputs = Object.freeze([
    {
        name: inputNames.kycDone,
        rxValue: new BehaviorSubject(false),
        type: 'hidden',
    },
    {
        hidden: hideIfKycDone,
        label: textsCap.identityLabel,
        name: inputNames.identity,
        options: [],
        placeholder: textsCap.identityPlaceholder,
        required: true,
        rxValue: new BehaviorSubject(),
        search: ['text', 'value', 'description'],
        selection: true,
        type: 'dropdown',
        validate: (_, { value: address }, v, rxValue) => {
            const { locationId } = address && getIdentity(address) || {}
            if (!address || locationId) return false
            const updateBtn = (
                <Button {...{
                    basic: true,
                    icon: 'pencil',
                    content: textsCap.updateIdentity,
                    onClick: e => e.preventDefault() | showForm(IdentityForm, {
                        // force re-validate
                        onSubmit: ok => ok && rxValue && rxValue.next(address),
                        values: { address },
                    }),
                    size: 'tiny'
                }} />
            )
            return (
                <div>
                    {textsCap.identityErrorLocation}
                    <div>{updateBtn}</div>
                </div>
            )
        },
    },
    {
        hidden: hideIfKycDone,
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
        hidden: hideIfKycDone,
        label: textsCap.emailLabel,
        maxLength: 128,
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
        selectOnNavigation: false,
        selection: true,
        simple: true,
        type: 'dropdown',
        // check if user already has been assigned a requested deposit address for selected chain
        validate: async () => {
            await PromisE.delay(3000)
            // return 'you have already been assigned an address for this chain'
            return
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