import React, { useEffect, useReducer, useState } from 'react'
import { BehaviorSubject } from 'rxjs'
import { Button, Icon } from 'semantic-ui-react'
import { isFn, textEllipsis } from '../../utils/utils'
import FormBuilder, { findInput, inputsForEach, resetForm } from '../../components/FormBuilder'
import { translated } from '../../services/language'
import { showForm } from '../../services/modal'
import { reducer, useRxSubject } from '../../services/react'
import client from '../chat/ChatClient'
import { get as getIdentity, rxIdentities } from '../identity/identity'
import IdentityForm from '../identity/IdentityForm'
import { get as getLocation, getAll as getLocations, rxLocations, set as setLocation } from '../location/location'
import LocationForm from '../location/LocationForm'

const textsCap = translated({
    emailLabel: 'email address',
    emailPlaceholder: 'enter you email address',
    familyNameLabel: 'family name',
    familyNamePlaceholder: 'enter your family name',
    givenNameLabel: 'given name',
    givenNamePlaceholder: 'enter your given name',
    formHeader: 'Crowdsale - Know Your Customer (KYC)',
    formSubheader: 'in order to participate in the crowdsale you must complete your KYC data',
    identityErrorLocation: 'please select an identity with contact address',
    identityLabel: 'identity to receive XTX tokens',
    identityPlaceholder: 'select an identity',
    locationIdCreateTittle: 'create new location',
    locationIdLabel: 'contact address',
    locationIdPlaceholder: 'select a location',
    offlineMsg: 'you must be online to access this area',
    kycDoneMsg: 'you have already submitted your KYC!',
    updateIdentity: 'update identity',
}, true)[1]
export const inputNames = {
    email: 'email',
    familyName: 'familyName',
    givenName: 'givenName',
    identity: 'identity',
    locationId: 'locationId',
}

export default function KYCForm(props = {}) {
    const [state, setStateOrg] = useReducer(reducer, {})
    // prevents triggering state change when component is not mounted
    const [setState] = useState(() => (...args) => setStateOrg.mounted && setStateOrg(...args))
    const [inputs] = useState(() => {
        const inputs = getInputs()
        inputsForEach(inputs, input => {
            switch (input.name) {
                case inputNames.identity:
                    // on identity change update locationId 
                    input.onChange = (e, values) => {
                        const identity = values[inputNames.identity]
                        const { locationId } = identity && getIdentity(identity) || {}
                        if (!identity || !locationId) return

                        const { rxValue } = findInput(inputs, inputNames.locationId) || {}
                        rxValue && rxValue.next(locationId)
                    }
                    break
            }
        })
        return inputs
    })

    useEffect(() => {
        setStateOrg.mounted = true
        setState({
            loading: true,
            onSubmit: handleSubmitCb(props, setState),
        })
        // on-load check if user has already submitted KYC
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
            inputs
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
    const locationId = values[inputNames.locationId]
    const location = getLocation(locationId)
    values = { ...values, location }
    setState({ loading: true })
    let newState = {
        loading: false,
        message: null,
        success: false,
    }
    try {
        const result = await client.crowdsaleKYC.promise(values)
        newState.success = result === true
        // mark location
        setLocation({ isCrowdsale: true }, locationId)

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

const getInputs = () => [
    {
        label: textsCap.identityLabel,
        name: inputNames.identity,
        options: [],
        placeholder: textsCap.identityPlaceholder,
        required: true,
        rxOptions: rxIdentities,
        rxOptionsModifier: identitiesMap => Array.from(identitiesMap)
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
            }),
        rxValue: new BehaviorSubject(),
        search: ['text', 'value', 'description'],
        selection: true,
        type: 'dropdown',
        // validate: (_, { value: address }, v, rxValue) => {
        //     const { locationId } = address && getIdentity(address) || {}
        //     if (!address || locationId) return false
        //     const updateBtn = (
        //         <Button {...{
        //             basic: true,
        //             icon: 'pencil',
        //             content: textsCap.updateIdentity,
        //             onClick: e => e.preventDefault() | showForm(IdentityForm, {
        //                 // force re-validate
        //                 onSubmit: ok => ok && rxValue && rxValue.next(address),
        //                 values: { address },
        //             }),
        //             size: 'tiny'
        //         }} />
        //     )
        //     return (
        //         <div>
        //             {textsCap.identityErrorLocation}
        //             <div>{updateBtn}</div>
        //         </div>
        //     )
        // },
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
        clearable: true,
        // disable if identity not selected
        disabled: values => !values[inputNames.identity],
        // show plus icon along with label to create a new location
        label: (
            <span>
                {textsCap.locationIdLabel}
                <Button {...{
                    icon: 'plus',
                    onClick: e => e.preventDefault() | showForm(LocationForm),
                    size: 'mini',
                    style: { padding: 3 },
                    title: textsCap.locationIdCreateTittle,
                }} />
            </span>
        ),
        name: inputNames.locationId,
        // set initial options
        options: getLocationOptions(getLocations()),
        placeholder: textsCap.locationIdPlaceholder,
        required: true,
        // update options whenever locations list changes
        rxOptions: rxLocations,
        rxOptionsModifier: getLocationOptions,
        rxValue: new BehaviorSubject(),
        search: true,
        selection: true,
        type: 'dropdown',
    },
    {
        label: textsCap.emailLabel,
        maxLength: 128,
        name: inputNames.email,
        placeholder: textsCap.emailPlaceholder,
        required: true,
        type: 'email',
    },
]

const getLocationOptions = locationsMap => Array.from(locationsMap)
    .map(([locationId, location]) => {
        const { addressLine1, city, countryCode, name, state } = location || {}
        return {
            description: textEllipsis(`${addressLine1}, ${city}`, 25, 3, false),
            icon: 'building',
            text: textEllipsis(name, 25, 3, false),
            title: `${state}, ${countryCode}`,
            value: locationId,
        }
    })