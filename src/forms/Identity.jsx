import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import FormBuilder, { findInput, fillValues } from '../components/FormBuilder'
import { isFn, arrUnique } from '../utils/utils'
// services
import identityService from '../services/identity'
import { translated } from '../services/language'
import { getAllTags } from '../services/partner'

const textsCap = translated({
    address: 'address',
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
    identityNamePlaceholder: 'a name for the identity',
    restoreInputLabel: 'restore my existing identity',
    seedExists: 'seed already exists in the identity list with name:',
    seedPlaceholder: 'enter existing seed or generate one',
    tagsInputEmptyMessage: 'enter tag and press enter to add, to tags list',
    tagsPlaceholder: 'enter tags',
    uniqueNameRequired: 'please enter an unique name',
    usageType: 'usage type',
    validSeedRequired: 'please enter a valid seed',
}, true)[1]

export default class IdentityForm extends Component {
    constructor(props) {
        super(props)

        this.values = { ...props.values }
        this.rxAddress = new BehaviorSubject(this.values.address)
        this.doUpdate = !!this.values.address
        this.validateUri = this.validateUri

        this.state = {
            message: props.message,
            onChange: (_, values) => this.values = values,
            onSubmit: this.handleSubmit,
            submitText: textsCap.create,
            success: false,
            inputs: [
                {
                    hidden: this.doUpdate,
                    name: 'restore',
                    onChange: this.handleRestoreChange,
                    options: [
                        { label: textsCap.restoreInputLabel, value: true },
                    ],
                    type: 'Checkbox-group',
                },
                {
                    label: textsCap.name,
                    name: 'name',
                    placeholder: textsCap.identityNamePlaceholder,
                    required: true,
                    validate: this.validateName,
                    value: '',
                },
                {
                    hidden: true,
                    label: textsCap.seed,
                    name: 'uri',
                    placeholder: textsCap.seedPlaceholder,
                    readOnly: true,
                    required: true,
                    rxValue: new BehaviorSubject(),
                    type: 'text',
                    validate: this.values.restore ? this.validateUri : undefined,
                    value: '',
                },
                {
                    hidden: this.doUpdate && (this.values.uri || '').includes('/totem/'),
                    inline: true,
                    label: textsCap.usageType,
                    name: 'usageType',
                    onChange: (_, { usageType }) => this.updateSeed(this.values.uri, usageType),
                    options: [
                        { label: textsCap.personal, value: 'personal' },
                        { label: textsCap.business, value: 'business' }
                    ],
                    radio: true,
                    required: true,
                    rxValue: new BehaviorSubject(),
                    type: 'Checkbox-group',
                },
                {
                    label: textsCap.address,
                    name: 'address',
                    rxValue: this.rxAddress,
                    type: 'hidden',
                    value: '',
                },
                {
                    allowAdditions: true,
                    label: textsCap.tags,
                    name: 'tags',
                    noResultsMessage: textsCap.tagsInputEmptyMessage,
                    multiple: true,
                    onAddItem: this.handleAddTag,
                    options: arrUnique([...getAllTags(), ...(this.values.tags || [])]).map(tag => ({
                        key: tag,
                        text: tag,
                        value: tag,
                    })),
                    placeholder: textsCap.tagsPlaceholder,
                    type: 'dropdown',
                    search: true,
                    selection: true,
                    value: this.values.tags || []
                },
            ],
        }
        fillValues(this.state.inputs, this.values)
    }

    handleAddTag = (_, data) => {
        const { inputs } = this.state
        inputs.find(x => x.name === 'tags').options.push({
            key: data.value,
            text: data.value,
            value: data.value
        })
        this.setState({ inputs })
    }

    handleRestoreChange = (_, { restore }) => {
        const { inputs } = this.state
        const uriInput = findInput(inputs, 'uri')
        uriInput.action = restore ? undefined : this.generateBtn
        uriInput.readOnly = !restore
        uriInput.hidden = !restore
        uriInput.validate = restore ? this.validateUri : undefined
        if (restore) {
            uriInput.rxValue.next('')
            this.rxAddress.next('')
        }
        this.setState({ inputs })
    }

    handleSubmit = () => {
        const { onSubmit } = this.props
        const { values } = this
        identityService.set(values.address, { ...values })
        isFn(onSubmit) && onSubmit(true, values)
        this.setState({ success: true })
    }

    updateSeed(seed, usageType = 'personal') {
        const { inputs } = this.state
        const { restore } = this.values
        if (restore) return
        if (!this.doUpdate) {
            seed = seed || identityService.generateUri()
            seed = seed.split('/totem/')[0] + `/totem/${usageType === 'personal' ? 0 : 1}/0`
        }
        const { address = '' } = seed && identityService.addFromUri(seed) || {}
        this.rxAddress.next(address)
        findInput(inputs, 'uri').rxValue.next(seed)
        this.setState({ inputs })
    }

    validateName = (_, { value: name }) => {
        const { address } = identityService.find(name) || {}
        if (address && address !== this.values.address) return textsCap.uniqueNameRequired
    }

    validateUri = (_, { value: seed }) => {
        const { inputs } = this.state
        const { address } = seed && identityService.addFromUri(seed) || {}
        if (!address) {
            this.rxAddress.next('')
            return textsCap.validSeedRequired
        }
        const existing = identityService.find(address)
        if (existing) return `${textsCap.seedExists} ${existing.name}`
        this.values.address = address
        this.rxAddress.next(address)
        if (seed.includes('/totem/')) {
            // extract usageType
            const usagetypeInt = parseInt(seed.split('/totem/')[1])
            const usageType = usagetypeInt === 1 ? 'business' : 'personal'
            const usageTypeIn = findInput(inputs, 'usageType')
            usageTypeIn.hidden = true
            this.values.usageType = usageType
            usageTypeIn.rxValue.next(usageType)
            this.setState({ inputs })
        }
        return null
    }

    render() {
        const { doUpdate, props, state, values: { restore } } = this
        const action = doUpdate ? textsCap.update : (restore ? textsCap.restore : textsCap.create)
        state.message = state.message || props.message
        state.header = props.header || `${action} ${textsCap.identity}`
        state.submitText = props.submitText || action
        return <FormBuilder {...{ ...props, ...state }} />
    }
}
IdentityForm.propTypes = {
    values: PropTypes.object,
}
IdentityForm.defaultProps = {
    closeOnSubmit: true,
    size: 'tiny'
}