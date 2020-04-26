import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Bond } from 'oo7'
import FormBuilder, { findInput, fillValues } from '../components/FormBuilder'
import { isFn } from '../utils/utils'
// services
import identityService from '../services/identity'
import { translated } from '../services/language'
import { getAllTags } from '../services/partner'

const [words, wordsCap] = translated({
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
}, true)
const [texts] = translated({
    identityNamePlaceholder: 'A name for the identity',
    restoreInputLabel: 'Restore my existing identity',
    seedExists: 'Seed already exists in the identity list',
    seedPlaceholder: 'Enter existing seed or generate one',
    tagsInputEmptyMessage: 'Enter tag and press enter to add, to tags list',
    tagsPlaceholder: 'Enter tags',
    uniqueNameRequired: 'Please enter an unique name',
    usageType: 'Usage type',
    validSeedRequired: 'Please enter a valid seed',
})

export default class IdentityForm extends Component {
    constructor(props) {
        super(props)

        this.values = { ...props.values }
        this.addressBond = new Bond().defaultTo(this.values.address)
        this.doUpdate = !!this.values.address
        this.validateUri = this.validateUri

        this.state = {
            message: props.message,
            onChange: (_, values) => this.values = values,
            onSubmit: this.handleSubmit,
            submitText: wordsCap.create,
            success: false,
            inputs: [
                {
                    hidden: this.doUpdate,
                    name: 'restore',
                    onChange: this.handleRestoreChange,
                    options: [
                        { label: texts.restoreInputLabel, value: true },
                    ],
                    type: 'Checkbox-group',
                },
                {
                    label: wordsCap.name,
                    name: 'name',
                    placeholder: texts.identityNamePlaceholder,
                    required: true,
                    validate: this.validateName,
                    value: '',
                },
                {
                    bond: new Bond(),
                    hidden: true,
                    label: wordsCap.seed,
                    name: 'uri',
                    placeholder: texts.seedPlaceholder,
                    readOnly: true,
                    required: true,
                    type: 'text',
                    validate: this.values.restore ? this.validateUri : undefined,
                    value: '',
                },
                {
                    bond: new Bond(),
                    hidden: this.doUpdate && (this.values.uri || '').includes('/totem/'),
                    inline: true,
                    label: texts.usageType,
                    name: 'usageType',
                    onChange: (_, { usageType }) => this.updateSeed(this.values.uri, usageType),
                    options: [
                        { label: wordsCap.personal, value: 'personal' },
                        { label: wordsCap.business, value: 'business' }
                    ],
                    radio: true,
                    required: true,
                    type: 'Checkbox-group',
                },
                {
                    bond: this.addressBond,
                    label: wordsCap.address,
                    name: 'address',
                    type: 'hidden',
                    value: '',
                },
                {
                    allowAdditions: true,
                    label: wordsCap.tags,
                    name: 'tags',
                    noResultsMessage: texts.tagsInputEmptyMessage,
                    multiple: true,
                    onAddItem: this.handleAddTag,
                    options: getAllTags().map(tag => ({
                        key: tag,
                        text: tag,
                        value: tag,
                    })),
                    placeholder: texts.tagsPlaceholder,
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
            uriInput.bond.changed('')
            this.addressBond.changed('')
        }
        this.setState({ inputs })
    }

    handleSubmit = () => {
        const { onSubmit } = this.props
        const { values } = this
        identityService.set(values.address, values)
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
        const { address } = identityService.addFromUri(seed) || {}
        this.addressBond.changed(address)
        findInput(inputs, 'uri').bond.changed(seed)
        this.setState({ inputs })
    }

    validateName = (_, { value: name }) => {
        const existing = identityService.find(name)
        if (existing && existing.address !== this.values.address) {
            return texts.uniqueNameRequired
        }
    }

    validateUri = (_, { value: seed }) => {
        const { inputs } = this.state
        const { address } = identityService.addFromUri(seed) || {}
        if (!account) {
            this.addressBond.changed('')
            return texts.validSeedRequired
        }
        if (identityService.find(address)) return texts.seedExists
        this.values.address = address
        this.addressBond.changed(address)
        if (seed.includes('/totem/')) {
            // extract usageType
            const usagetypeInt = parseInt(seed.split('/totem/')[1])
            const usageType = usagetypeInt === 1 ? 'business' : 'personal'
            const usageTypeIn = findInput(inputs, 'usageType')
            usageTypeIn.hidden = true
            this.values.usageType = usageType
            usageTypeIn.bond.changed(usageType)
            this.setState({ inputs })
        }
        return null
    }

    render() {
        const { doUpdate, props, state, values: { restore } } = this
        const action = doUpdate ? wordsCap.update : (restore ? wordsCap.restore : wordsCap.create)
        state.message = state.message || props.message
        state.header = props.header || `${action} ${wordsCap.identity}`
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