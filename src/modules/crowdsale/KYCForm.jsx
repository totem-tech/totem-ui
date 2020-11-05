import React, { useEffect, useReducer, useState } from 'react'
import { BehaviorSubject } from 'rxjs'
import { Button, Icon } from 'semantic-ui-react'
import { isFn, textEllipsis } from '../../utils/utils'
import FormBuilder, { findInput } from '../../components/FormBuilder'
import { translated } from '../../services/language'
import { showForm } from '../../services/modal'
import { reducer, useRxSubject } from '../../services/react'
import client from '../chat/ChatClient'
import { get as getIdentity, rxIdentities } from '../identity/identity'
import IdentityForm from '../identity/IdentityForm'
import { get as getLocation } from '../location/location'

const textsCap = translated({
    emailLabel: 'email address',
    emailPlaceholder: 'enter you email address',
    familyNameLabel: 'family name',
    familyNamePlaceholder: 'enter your family name',
    givenNameLabel: 'given name',
    givenNamePlaceholder: 'enter your given name',
    formHeader: 'Crowsale - Know Your Customer (KYC)',
    formSubheader: 'in order to participate in the crowdsale you must complete your KYC data',
    identityErrorLocation: 'please select an identity with contact address',
    identityLabel: 'identity (to receive funds)',
    identityPlaceholder: 'select an identity',
    kycDoneMsg: 'you have already submitted your KYC!',
    updateIdentity: 'update identity',
}, true)[1]
export const inputNames = {
    email: 'email',
    familyName: 'familyName',
    givenName: 'givenName',
    identity: 'identity',
}

export default function KYCForm(props = {}) {
    const [state, setStateOrg] = useReducer(reducer, {})
    const [setState] = useState(() => (...args) => setStateOrg.mounted && setStateOrg(...args))
    const [inputs] = useRxSubject(rxIdentities, identitiesMap => {
        const inputs = formInputs.map(x => ({...x})) //objCopy(x, {})
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
        setStateOrg.mounted = true
        setState({ loading: true })
        client.crowdsaleKYC
            .promise(true)
            .then(kycDone => {
                setState({
                    loading: false,
                    inputsDisabled: kycDone
                        ? Object.values(inputNames)
                        : props.inputsDisabled,
                    message: !kycDone
                        ? null
                        : {
                            header: textsCap.kycDoneMsg,
                            icon: true,
                            status: 'error',
                        },
                    submitDisabled: !!kycDone,
                })
                return
            })
            .catch(err => setState({
                loading: false,
                message: {
                    content: `${err}`,
                    icon: true,
                    status: 'error',
                },
            }))
        return () => setStateOrg.mounted = false
    }, [setStateOrg])

    return (
        <FormBuilder {...{
            ...props,
            ...state,
            inputs,
            onSubmit: handleSubmitCb(props, setState)
        }} />
    )
}
KYCForm.defaultProps = {
    closeOnSubmit: true,
    header: textsCap.formHeader,
    size: 'tiny',
    subheader: textsCap.formSubheader,
}

// showForm(KYCForm) // remove

const handleSubmitCb = (props, setState) => async (_, values) => {
    const { onSubmit } = props || {}
    const address = values[inputNames.identity]
    const { locationId } = getIdentity(address)
    const location = getLocation(locationId)
    values = {...values, location}
    setState({ loading: true })
    let newState = {
        loading: false,
        message: null,
        success: false,
    }
    try {
        const result = await client.crowdsaleKYC.promise(values)
        newState.success = result === true
    } catch (err) {
        newState.message = {
            content: `${err}`,
            icon: true,
            status: 'error',
        }
    }

    setState(newState)

    isFn(onSubmit) && onSubmit(newState.success, values)
}

const formInputs = Object.freeze([
    {
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
        maxLength: 128,
        name: inputNames.email,
        placeholder: textsCap.emailPlaceholder,
        required: true,
        type: 'email',
    },
])