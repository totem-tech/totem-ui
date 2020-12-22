import React, { useEffect, useReducer, useState } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import { Button, Icon } from 'semantic-ui-react'
import PromisE from '../../utils/PromisE'
import { isArr, isFn, objWithoutKeys, textEllipsis } from '../../utils/utils'
import FormBuilder, { fillValues, findInput, inputsForEach } from '../../components/FormBuilder'
import { confirmBackup } from '../../views/GettingStartedView'
import { translated } from '../../services/language'
import { confirm, showForm } from '../../services/modal'
import { iUseReducer, reducer, useRxSubject } from '../../services/react'
import { setToast } from '../../services/toast'
import client from '../chat/ChatClient'
import { get as getIdentity, rxIdentities } from '../identity/identity'
import { get as getLocation, getAll as getLocations, rxLocations } from '../location/location'
import LocationForm, { inputNames as locInputNames } from '../location/LocationForm'
import { getInputs as getDAAInputs, inputNames as daaInputNames, } from './DAAForm'
import { crowdsaleData, rxCrowdsaleData } from './crowdsale'
import { showFaqs } from './FAQ'

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
    formHeader: 'crowdsale registration',
    formHeaderView: 'your crowdsale data',
    formSubheader: 'in order to participate in the crowdsale you must submit your KYC data',
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
    successMsg: `
        Fantastic! You have now been registered for the Totem Live Association crowdsale.
        You are now ready to deposit funds using any of your chosen Blockchains.
    `,
}, true)[1]
export const inputNames = {
    blockchains: 'blockchains',
    ethAddress: 'ethAddress',
    email: 'email',
    familyName: 'familyName',
    givenName: 'givenName',
    identity: 'identity',
    locationId: 'locationId',
    namesGroup: 'namesGroup',
}

export default function KYCForm(props = {}) {
    const [state, setState] = iUseReducer(null, rxSetState => {
        const inputs = getInputs()
        findInput(inputs, inputNames.identity).onChange = (e, values) => {
            const identity = values[inputNames.identity]
            const { locationId } = identity && getIdentity(identity) || {}
            if (!identity || !locationId) return

            const { rxValue } = findInput(inputs, inputNames.locationId) || {}
            rxValue && rxValue.next(locationId)
        }
        fillValues(inputs, props.values)

        return {
            inputs,
            onSubmit: handleSubmitCb(rxSetState, props),
        }
    })

    // no need to check KYC status if form is in view only mode
    props.submitText !== null && useEffect(() => {
        setState({ loading: true })
        // on-load check if user has already submitted KYC
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
            .catch(err => {
                setState({
                    loading: false,
                    message: {
                        content: `${err}`,
                        icon: true,
                        status: 'error',
                    },
                })
            })
    }, [])

    return <FormBuilder {...{ ...props, ...state }} />
}
KYCForm.propTypes = {
    values: PropTypes.object,
} 
KYCForm.defaultProps = {
    closeOnSubmit: true,
    header: textsCap.formHeader,
    size: 'tiny',
    subheader: textsCap.formSubheader,
    submitText: textsCap.submitText,
}


const handleSubmitCb = (rxSetState, props = {}) => async (_, values) => {
    const { onSubmit } = props
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
        rxSetState.next({ loading: true, message: null })
        const ok = await confirmSubmit()
        if (!ok) return rxSetState.next({ loading: false })

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
                    const { depositAddresses = {} } = rxCrowdsaleData.value || {}
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

    rxSetState.next(newState)

    isFn(onSubmit) && onSubmit(newState.success, values)
    newState.success && showFaqs({ content: textsCap.successMsg })
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

export const getInputs = () => {
    const rxLocationId = new BehaviorSubject('')
    const daaInputs = getDAAInputs()
    const blockchainOptions = (findInput(daaInputs, daaInputNames.blockchain) || { options: [] })
        .options
        .map(o => ({ ...o, label: o.text }))
    const ethAddressIn = findInput(daaInputs, daaInputNames.ethAddress)
    const createLocationBtn = (
        <Button {...{
            as: 'a', // prevents form being submitted unexpectedly
            icon: 'plus',
            onClick: () => showForm(LocationForm, {
                onSubmit: (ok, _, locationId) => ok && rxLocationId.next(locationId)
            }),
            size: 'mini',
            style: { padding: 3 },
            title: textsCap.locationIdCreateTittle,
        }} />
    )

    // pre-select identity if only one available
    const identityValue = rxIdentities.value.size === 1
        ? Array.from(rxIdentities.value)[0][0]
        : undefined
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
            rxValue: new BehaviorSubject(identityValue),
            search: ['text', 'value', 'description'],
            selection: true,
            type: 'dropdown',
        },
        {
            name: inputNames.namesGroup,
            type: 'group',
            unstackable: true,
            widths: 'equal',
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
            rxValue: rxLocationId,
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
            // hide if ETH not
            hidden: values => !(values[inputNames.blockchains] || []).includes('ETH')
        },
    ]
}