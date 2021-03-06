import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import { isFn, arrUnique, deferred, objHasKeys } from '../../utils/utils'
import FormBuilder, { findInput, fillValues } from '../../components/FormBuilder'
import { translated } from '../../services/language'
import { getAllTags } from '../partner/partner'
import { addFromUri, find, generateUri, get, set, USAGE_TYPES } from './identity'
import { getAll as getLocations, rxLocations } from '../location/location'
import { showForm } from '../../services/modal'
import LocationForm from '../location/LocationForm'
import { Button } from 'semantic-ui-react'
import { validateMnemonic } from 'bip39'

const textsCap = translated({
    address: 'address',
    autoSaved: 'changes will be auto-saved',
    bip39Warning: 'The mnemonic you have entered is not BIP39 compatible. You may or may not be able to restore your identity on any other wallet applications. It is recommended that you use a BIP39 compatible mnemonic. If you choose to use BIP39 incompatible mnemonic, please use at your own risk!',
    create: 'create',
    business: 'business',
    generate: 'generate',
    identity: 'identity',
    name: 'name',
    personal: 'personal',
    restore: 'restore',
    seed: 'seed',
    tags: 'tags',
    update: 'update',
    headerCreate: 'create identity',
    headerRestore: 'restore identity',
    headerUpdate: 'update identity',
    identityNamePlaceholder: 'enter a name for your Blockchain identity',
    locationIdLabel: 'contact address',
    locationIdPlaceholder: 'select a location for this identity',
    locationIdCreateTittle: 'create a new location',
    restoreInputLabel: 'restore my existing identity',
    seedExists: 'seed already exists in the identity list with name:',
    seedPlaceholder: 'enter existing seed or generate one',
    tagsInputEmptyMessage: 'enter tag and press enter to add, to tags list',
    tagsPlaceholder: 'enter tags',
    uniqueNameRequired: 'please enter an unique name',
    usageType: 'usage type',
    validSeedRequired: 'please enter a valid seed',
}, true)[1]

export const requiredFields = Object.freeze({
    address: 'address',
    name: 'name',
    uri: 'uri',
    usageType: 'usageType',
})
export const inputNames = Object.freeze({
    ...requiredFields,
    locationId: 'locationId',
    restore: 'restore',
    tags: 'tags',
})

export default class IdentityForm extends Component {
    constructor(props) {
        super(props)

        let  { autoSave, header, message, submitText, values } = props
        const { address, restore } = values || {}
        const existingValues = get(address)
        this.values = { ...existingValues, ...values }
        this.rxAddress = new BehaviorSubject(address)
        this.doUpdate = !!existingValues

        if (submitText !== null) {
            submitText = submitText || (
                this.doUpdate
                    ? autoSave
                        ? null
                        : textsCap.update
                    : restore
                        ? textsCap.restore
                        : textsCap.create
            )
        }
        this.header = header || (
            this.doUpdate
                ? textsCap.headerUpdate
                : textsCap.headerCreate
        )
        this.state = {
            header: this.header,
            message,
            onChange: this.handleFormChange,
            onSubmit: this.handleSubmit,
            submitText,
            success: false,
            inputs: fillValues([
                {
                    hidden: this.doUpdate,
                    name: inputNames.restore,
                    onChange: this.handleRestoreChange,
                    options: [{
                        label: textsCap.restoreInputLabel,
                        value: true,
                    }],
                    rxValue: new BehaviorSubject(),
                    type: 'Checkbox-group',
                },
                {
                    label: textsCap.name,
                    maxLength: 64,
                    minLength: 3,
                    name: inputNames.name,
                    placeholder: textsCap.identityNamePlaceholder,
                    required: true,
                    rxValue: new BehaviorSubject(),
                    validate: this.validateName,
                },
                {
                    hidden: true,
                    label: textsCap.seed,
                    name: inputNames.uri,
                    onChange: this.handleUriChange,
                    placeholder: textsCap.seedPlaceholder,
                    readOnly: true,
                    required: true,
                    rxValue: new BehaviorSubject(),
                    type: 'text',
                    validate: this.values.restore && this.validateUri,
                },
                {
                    inline: true,
                    label: textsCap.usageType,
                    name: inputNames.usageType,
                    onChange: this.handleUsageTypeChange,
                    options: [
                        { label: textsCap.personal, value: USAGE_TYPES.PERSONAL },
                        { label: textsCap.business, value: USAGE_TYPES.BUSINESS }
                    ],
                    radio: true,
                    required: true,
                    rxValue: new BehaviorSubject(),
                    type: 'Checkbox-group',
                },
                {
                    label: textsCap.address,
                    name: inputNames.address,
                    rxValue: this.rxAddress,
                    type: 'hidden',
                },
                {
                    allowAdditions: true,
                    label: textsCap.tags,
                    name: inputNames.tags,
                    noResultsMessage: textsCap.tagsInputEmptyMessage,
                    multiple: true,
                    onAddItem: this.handleAddTag,
                    options: arrUnique([
                        ...getAllTags(),
                        ...(this.values.tags || []),
                    ])
                        .map(tag => ({
                            key: tag,
                            text: tag,
                            value: tag,
                        })),
                    placeholder: textsCap.tagsPlaceholder,
                    type: 'dropdown',
                    search: true,
                    selection: true,
                },
                {
                    clearable: true,
                    label: (
                        <div>
                            {textsCap.locationIdLabel + ' '}
                            <Button {...{
                                as: 'a', // prevents form being submitted unexpectedly
                                icon: 'plus',
                                onClick: () => showForm(LocationForm, { onSubmit: this.handleLocationCreate }),
                                size: 'mini',
                                style: { padding: 3 },
                                title: textsCap.locationIdCreateTittle,
                            }} />
                        </div>
                    ),
                    name: inputNames.locationId,
                    options: this.getLocationOptions(getLocations()),
                    placeholder: textsCap.locationIdPlaceholder,
                    rxOptions: rxLocations,
                    rxOptionsModifier: this.getLocationOptions,
                    rxValue: new BehaviorSubject(),
                    search: ['text'],
                    selection: true,
                    type: 'dropdown',
                },
            ], this.values),
        }
    }

    getLocationOptions = locationsMap => Array.from(locationsMap)
        .map(([id, loc]) => loc.partnerIdentity
            ? null
            : ({
                description: [ loc.state, loc.countryCode ].filter(Boolean).join(', '),
                key: id,
                text: loc.name,
                title: [ loc.addressLine1, loc.addressLine2, loc.city, loc.postcode ].filter(Boolean).join(' '),
                value: id,
            })
        )
        .filter(Boolean)

    handleAddTag = (_, data) => {
        const { inputs } = this.state
        findInput(inputs, inputNames.tags).options.push({
            key: data.value,
            text: data.value,
            value: data.value
        })
        this.setState({ inputs })
    }

    handleFormChange = (...args) => {
        const { autoSave, onChange } = this.props
        const [_, values, invalid] = args
        this.values = values
        isFn(onChange) && onChange(...args)
        if (invalid || !autoSave || !this.doUpdate) return

        // prevent saving if one or more fields are empty
        if (!objHasKeys(values, Object.keys(requiredFields), true)) return
        this.handleSubmit(...args)
    }

    handleLocationCreate = (success, _, id) => { 
        if (!success) return
        const { inputs } = this.state
        const locationIdIn = findInput(inputs, inputNames.locationId)
        locationIdIn.rxValue.next(id)
    }

    handleRestoreChange = (_, values) => {
        const { inputs } = this.state
        const restore = values[inputNames.restore]
        const uriInput = findInput(inputs, inputNames.uri)
        uriInput.action = restore ? undefined : this.generateBtn
        uriInput.readOnly = !restore
        uriInput.hidden = !restore
        uriInput.validate = restore ? this.validateUri : undefined
        if (restore) {
            uriInput.rxValue.next('')
            this.rxAddress.next('')
        }
        this.setState({
            inputs,
            header: restore
                ? textsCap.headerRestore
                : this.header
        })
    }

    handleUriChange = deferred(() => {
        const { inputs } = this.state
        const isRestore = !!this.values.restore
        const seed = this.values[inputNames.uri]
        const mnemonic = this.values[inputNames.uri].split('/')[0]
        const uriInput = findInput(inputs, inputNames.uri)
        const valid = !seed || !mnemonic || !isRestore || validateMnemonic(mnemonic)

        // validate BIP39 compatibility and warn user if not compatible
        uriInput.message = valid
            ? null
            : {
                content: textsCap.bip39Warning,
                status: 'warning'
            }
        this.setState({ inputs })
    }, 500)

    handleSubmit = deferred(() => {
        const { onSubmit } = this.props
        const { values } = this
        const address = values[inputNames.address]
        set(address, { ...values })
        isFn(onSubmit) && onSubmit(true, values)
        this.setState({ success: true })
    }, 100)

    handleUsageTypeChange = (_, { usageType = USAGE_TYPES.PERSONAL}) => {
        const isRestore = !!this.values[inputNames.restore]
        if (isRestore) return // nothing to do

        const { inputs } = this.state
        let seed = this.values[inputNames.uri]
        if (!this.doUpdate) {
            seed = seed || generateUri()
            const usageTypeCode = usageType === USAGE_TYPES.PERSONAL ? 0 : 1
            seed = seed.split('/totem/')[0] + `/totem/${usageTypeCode}/0`
        }
        const { address = '' } = seed && addFromUri(seed) || {}
        const uriInput = findInput(inputs, inputNames.uri)
        this.rxAddress.next(address)
        uriInput.rxValue.next(seed)
        this.setState({ inputs })
    }

    validateName = (_, { value: name }) => {
        const { address } = find(name) || {}
        if (address && address !== this.values.address) return textsCap.uniqueNameRequired
    }

    validateUri = (_, { value: seed }) => {
        if (!seed) return

        const { inputs } = this.state
        const { address } = seed && addFromUri(seed) || {}
        if (!address) {
            this.rxAddress.next('')
            return textsCap.validSeedRequired
        }
        const existing = find(address)
        if (existing) return `${textsCap.seedExists} ${existing.name}`
        this.values[inputNames.address] = address
        this.rxAddress.next(address)
        if (seed.includes('/totem/')) {
            // extract usageType
            const usagetypeInt = parseInt(seed.split('/totem/')[1])
            const usageType = usagetypeInt === 1 ? 'business' : 'personal'
            const usageTypeIn = findInput(inputs, inputNames.usageType)
            usageTypeIn.hidden = true
            this.values.usageType = usageType
            usageTypeIn.rxValue.next(usageType)
            this.setState({ inputs })
        }

        return null
    }

    render = () => <FormBuilder {...{ ...this.props, ...this.state }} />
}
IdentityForm.propTypes = {
    // whether to auto save when upadating identity
    autoSave: PropTypes.bool,
    values: PropTypes.shape({
        address: PropTypes.string,
    }),
}
IdentityForm.defaultProps = {
    autoSave: false,
    closeOnSubmit: true,
    size: 'tiny'
}