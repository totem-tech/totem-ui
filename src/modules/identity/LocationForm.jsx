import React, { Component } from 'react'
import PropTypes from 'prop-types'
import FormBuilder from '../../components/FormBuilder'
import { arrSort, isFn } from '../../utils/utils'
import { randomHex } from '../../services/blockchain'
import { translated } from '../../services/language'
import storage from '../../services/storage'
import { setLocation } from './identity'

const textsCap = translated({
    addressLine1Label: 'address line 1',
    addressLine1Placeholder: 'Eg: 123A Street',
    addressLine2Label: 'address line 2',
    addressLine2Placeholder: '',
    cityLabel: 'city',
    cityPlaceholder: 'enter your city',
    countryLabel: 'country',
    countryPlaceholder: 'select your country',
    postcodeLabel: 'postcode or zip',
    postcodePlaceholder: 'enter your postcode or zip',
    stateLabel: 'state or province',
    statePlaceholder: 'enter your state or province',
}, true)[1]

export const inputNames = {
    city: 'city',
    country: 'country',
    postcode: 'postcode',
    state: 'state',
    addressLine1: 'addressLine1',
    addressLine2: 'addressLine2',
}

export default class LocationForm extends Component {
    constructor(props = {}) {
        super(props)

        this.doUpdate = !!props.id
        this.state = {
            inputs: [
                {
                    label: textsCap.addressLine1Label,
                    minLength: 3,
                    maxLength: 64,
                    name: inputNames.addressLine1,
                    placeholder: textsCap.addressLine1Placeholder,
                    required: true,
                    type: 'text',
                },
                {
                    label: textsCap.addressLine2Label,
                    maxLength: 64,
                    name: inputNames.addressLine2,
                    placeholder: textsCap.addressLine2Placeholder,
                    required: false,
                    type: 'text',
                },
                {
                    label: textsCap.cityLabel,
                    minLength: 3,
                    maxLength: 64,
                    name: inputNames.city,
                    placeholder: textsCap.cityPlaceholder,
                    required: true,
                    type: 'text',
                },
                {
                    label: textsCap.postcodeLabel,
                    minLength: 3,
                    maxLength: 64,
                    name: inputNames.postcode,
                    placeholder: textsCap.postcodePlaceholder,
                    required: true,
                    type: 'text',
                },
                {
                    label: textsCap.stateLabel,
                    minLength: 2,
                    maxLength: 64,
                    name: inputNames.state,
                    placeholder: textsCap.statePlaceholder,
                    required: true,
                    type: 'text',
                },
                {
                    label: textsCap.countryLabel,
                    name: inputNames.country,
                    options: arrSort(
                        storage.countries
                            .toArray()
                            .map(([_, { code, name }]) => ({
                                description: code,
                                text: name,
                                value: code,
                            })),
                        'text',
                    ),
                    placeholder: textsCap.countryPlaceholder,
                    required: true,
                    selection: true,
                    search: ['description', 'text'],
                    type: 'dropdown',
                }
            ]
        }
    }

    componentWillMount = () => {
        this._mounted = true
    }

    componentWillUnmount = () => this._mounted = false

    handleSubmit = (_, values) => {
        const { id = randomHex(), onSubmit } = this.props

        setLocation(id, values)
        isFn(onSubmit) && onSubmit(true, values)
    }

    render = () => <FormBuilder {...{ ...this.props, ...this.state }} />
}
LocationForm.propTypes = {
    id: PropTypes.string,
    values: PropTypes.object,
}