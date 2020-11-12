import React, { useEffect, useReducer, useState } from 'react'
import { BehaviorSubject } from 'rxjs'
import { Button, Icon } from 'semantic-ui-react'
import { isArr, isFn, objWithoutKeys, textEllipsis } from '../../utils/utils'
import FormBuilder, { fillValues, findInput, inputsForEach } from '../../components/FormBuilder'
import { translated } from '../../services/language'
import { confirm, showForm } from '../../services/modal'
import { reducer } from '../../services/react'
import client from '../chat/ChatClient'
import { get as getIdentity, rxIdentities, set as saveIdentity } from '../identity/identity'
import { get as getLocation, getAll as getLocations, rxLocations, set as setLocation } from '../location/location'
import LocationForm from '../location/LocationForm'
import { getInputs as getDAAInputs, inputNames as daaInputNames, } from './DAAForm'
import { confirmBackup } from '../../views/GettingStartedView'
import PromisE from '../../utils/PromisE'
import { crowdsaleData, rxData } from './crowdsale'
import { setToast } from '../../services/toast'

const textsCap = translated({
    blockchainsLabel: 'select blockchains',
    blockchainsLabelDetails: `
        Select the blockchains that you will be sending funds from.
        You will be allocated a payment address for each selected blockchain once registration is complete.
    `,
    emailLabel: 'email address',
    emailPlaceholder: 'enter you email address',
    familyNameLabel: 'family name',
    familyNamePlaceholder: 'enter your family name',
    givenNameLabel: 'given name',
    givenNamePlaceholder: 'enter your given name',
    formHeader: 'Crowdsale registration',
    formSubheader: 'in order to participate in the crowdsale you must submit your KYC data',
    identityErrorLocation: 'please select an identity with contact address',
    identityLabel: 'identity to receive XTX tokens',
    identityPlaceholder: 'select an identity',
    locationIdCreateTittle: 'create new location',
    locationIdLabel: 'contact address',
    locationIdPlaceholder: 'select a location',
    offlineMsg: 'you must be online to access this area',
    ok: 'OK',
    kycDoneMsg: 'you have already submitted your KYC!',
    submitConfirmMsg: `
        In the last step you will backup your account data.
        This backup will be used to claim your tokens on the MainNet.
        Press OK to continue or cancel to return to the form.
    `,
    submitFailedBackupNotDone: 'you must complete the backup process',
    submitText: 'register',
    updateIdentity: 'update identity',
}, true)[1]
export const inputNames = {
    blockchains: 'blockchains',
    ethAddress: 'ethAddress',
    email: 'email',
    familyName: 'familyName',
    givenName: 'givenName',
    identity: 'identity',
    locationId: 'locationId',
}

export default function KYCForm(props = {}) {
    const [state, setStateOrg] = useReducer(reducer, {
        submitText: textsCap.submitText
    })
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
        return fillValues(inputs, props.values)
    })

    useEffect(() => {
        setStateOrg.mounted = true
        // no need to check KYC status if form is in view only mode
        const checkStatus = props.submitText !== null
        setState({
            loading: checkStatus,
            onSubmit: handleSubmitCb(props, setState),
        })
        // on-load check if user has already submitted KYC
        if (checkStatus) {
            client.crowdsaleKYC.promise(true)
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
        }
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
const handleSubmitCb = (props, setState) => async (_, values) => {
    const { onSubmit } = props || {}
    const locationId = values[inputNames.locationId]
    const location = getLocation(locationId)
    let blockchains = values[inputNames.blockchains]
    const ethAddress = values[inputNames.ethAddress]
    values = { ...values, location }
    let newState = {
        loading: false,
        message: null,
        success: false,
    }
    const confirmSubmit = () => new PromisE(resolve => {
        confirm({
            confirmButton: textsCap.ok,
            content: textsCap.submitConfirmMsg,
            onCancel: () => resolve(false),
            onConfirm: () => resolve(true),
            size: 'tiny',
        })
    })

    try {
        setState({ loading: true, message: null })
        const ok = await confirmSubmit()
        if (!ok) return setState({ loading: false })

        // save crowdsale data to localStorage
        crowdsaleData(objWithoutKeys(values, [inputNames.blockchains]))
        const backupDone = await confirmBackup()
        if (!backupDone) throw textsCap.submitFailedBackupNotDone

        const result = await client.crowdsaleKYC.promise(values)
        newState.success = !!result
        if (blockchains.length > 1 && blockchains.includes('ETH')) {
            // put ethereum at last
            blockchains = [...blockchains.filter(b => b !== 'ETH'), 'ETH']
        }
        // request deposit addresses for selected blockchains
        blockchains.map(blockchain => {
            const ethAddr = blockchain === 'ETH' ? ethAddress : ''
            client.crowdsaleDAA.promise(blockchain, ethAddr)
                .then(address => {
                    const { depositAddresses = {} } = rxData.value || {}
                    depositAddresses[blockchain] = address
                    crowdsaleData({ depositAddresses })
                })
                .catch(err => setToast({ content: `${err}`, status: 'error' }, 0, blockchain))
        })
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

const getInputs = () => {
    const daaInputs = getDAAInputs()
    const blockchainOptions = (findInput(daaInputs, daaInputNames.blockchain) || { options: [] })
        .options
        .map(o => ({ ...o, label: o.text }))
    const ethAddressIn = findInput(daaInputs, daaInputNames.ethAddress)
    const createLocationBtn = (
        <Button {...{
            as: 'a', // prevents form being submitted unexpectedly
            icon: 'plus',
            onClick: () => showForm(LocationForm, { closeOnSubmit: false }),
            size: 'mini',
            style: { padding: 3 },
            title: textsCap.locationIdCreateTittle,
        }} />
    )
    return [
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
                    {textsCap.locationIdLabel + ' '}
                    {createLocationBtn}
                </span>
            ),
            name: inputNames.locationId,
            noResultsMessage: textsCap.locationIdCreateTittle,
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
        {
            inline: true,
            label: textsCap.blockchainsLabel,
            labelDetails: textsCap.blockchainsLabelDetails,
            multiple: true,
            name: inputNames.blockchains,
            options: blockchainOptions,
            radio: false,
            required: true,
            type: 'checkbox-group',
            },
        {
            ...ethAddressIn,
            hidden: values => !(values[inputNames.blockchains] || []).includes('ETH')
        },
    ]
}