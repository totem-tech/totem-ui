import React, { useEffect, useReducer, useState } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import { Button, Icon } from 'semantic-ui-react'
import { isArr, isFn, objWithoutKeys, textEllipsis } from '../../utils/utils'
import FormBuilder, { fillValues, findInput, inputsForEach } from '../../components/FormBuilder'
import { translated } from '../../services/language'
import { confirm, showForm } from '../../services/modal'
import { reducer, useRxSubject } from '../../services/react'
import client from '../chat/ChatClient'
import { get as getIdentity, rxIdentities, set as saveIdentity } from '../identity/identity'
import { get as getLocation, getAll as getLocations, rxLocations, set as setLocation } from '../location/location'
import LocationForm, { inputNames as locInputNames } from '../location/LocationForm'
import { getInputs as getDAAInputs, inputNames as daaInputNames, } from './DAAForm'
import { confirmBackup } from '../../views/GettingStartedView'
import PromisE from '../../utils/PromisE'
import { crowdsaleData, rxCrowdsaleData } from './crowdsale'
import { setToast } from '../../services/toast'
import { getInputs, inputNames } from './KYCForm'

const textsCap = translated({
    formHeaderView: 'your crowdsale data',
    locationLabel: 'contact address',
}, true)[1]


export default function KYCViewForm(props) {
    const [inputs] = useRxSubject(rxCrowdsaleData, kycData => {
        const { depositAddresses = {}, location = {} } = kycData
        const locationIn = {
            accordion: { collapsed: true, styled: true },
            inputs: [{
                content: (
                    <LocationForm {...{
                        El: 'div',
                        // disable all inputs
                        inputsReadOnly: Object.values(locInputNames),
                        style: { width: '100%'},
                        submitText: null,
                        values: location,
                    }} />
                ),
                name: 'location-form',
                type: 'html'
            }],
            label: textsCap.locationLabel,
            name: 'location-group',
            type: 'group',
        }
        // replace location dropdown field with an accordion with read-only LocationForm in an accordion
        const inputs = getInputs().map(input =>
            input.name === inputNames.locationId
                ? locationIn
                : input
        )
        const blockchains = Object.keys(depositAddresses)
            .filter(x => !!depositAddresses[x])
        return fillValues(inputs, { ...kycData, blockchains })
    })

    return (
        <FormBuilder {...{
            ...props,
            inputs,
            inputsReadOnly: Object.values(inputNames),
            submitText: null,
        }} />
    )
}
KYCViewForm.defaultProps = {
    header: textsCap.formHeaderView,
    size: 'tiny',
}