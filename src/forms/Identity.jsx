import React from 'react'
import PropTypes from 'prop-types'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import Identicon from 'polkadot-identicon'
import { generateMnemonic } from 'bip39'
import FormBuilder, { findInput, fillValues } from '../components/FormBuilder'
import identityService from '../services/identity'
import { isFn, textCapitalize } from '../utils/utils'

const words = {
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
}
const wordsCapitalized = textCapitalize(words)
const texts = {
    identityNamePlaceholder: 'A name for the identity',
    restoreInputLabel: 'Restore my existing identity',
    seedPlaceholder: 'Enter existing seed or generate one',
    tagsInputEmptyMessage: 'Enter tag and press enter to add, to tags list',
    tagsPlaceholder: 'Enter tags',
    usageType: 'Usage Type',
}

export default class IdentityForm extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.values = { ...props.values }
        this.addressBond = new Bond().defaultTo(this.values.address)
        this.doUpdate = !!this.values.address
        this.generateBtn = {
            content: wordsCapitalized.generate,
            icon: 'magic',
            onClick: (e) => e.preventDefault() | this.updateSeed()
        }

        this.state = {
            message: props.message,
            onChange: (_, values) => this.values = values,
            onSubmit: this.handleSubmit.bind(this),
            success: false,
            inputs: [
                {
                    hidden: this.doUpdate,
                    name: 'restore',
                    onChange: this.handleRestoreChange.bind(this),
                    options: [
                        { label: texts.restoreInputLabel, value: true },
                    ],
                    type: 'Checkbox-group',
                },
                {
                    label: wordsCapitalized.name,
                    name: 'name',
                    placeholder: texts.identityNamePlaceholder,
                    required: true,
                    value: '',
                },
                {
                    action: this.doUpdate ? undefined : this.generateBtn,
                    bond: new Bond(),
                    hidden: this.doUpdate,
                    icon: (
                        <i style={{ opacity: 1 }} className="icon">
                            <Identicon
                                account={this.addressBond}
                                size={28}
                                style={{ marginTop: '5px' }}
                            />
                        </i>
                    ),
                    iconPosition: 'left',
                    label: wordsCapitalized.seed,
                    name: 'uri',
                    placeholder: texts.seedPlaceholder,
                    readOnly: this.doUpdate,
                    required: true,
                    type: 'text',
                    value: ''
                },
                {
                    hidden: this.doUpdate && (this.values.uri || '').includes('/totem/'),
                    inline: true,
                    label: texts.usageType,
                    name: 'usageType',
                    onChange: (_, { usageType }) => this.updateSeed(this.values.uri, usageType),
                    options: [
                        { label: wordsCapitalized.personal, value: 'personal' },
                        { label: wordsCapitalized.business, value: 'business' }
                    ],
                    radio: true,
                    required: true,
                    type: 'Checkbox-group',
                },
                {
                    label: wordsCapitalized.address,
                    name: 'address',
                    type: 'hidden',
                    value: '',
                },
                {
                    allowAdditions: true,
                    label: wordsCapitalized.tags,
                    name: 'tags',
                    noResultsMessage: texts.tagsInputEmptyMessage,
                    multiple: true,
                    onAddItem: this.handleAddTag.bind(this),
                    options: (this.values.tags || []).map(tag => ({
                        key: tag,
                        text: tag,
                        value: tag
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

    handleAddTag(_, data) {
        const { inputs } = this.state
        inputs.find(x => x.name === 'tags').options.push({
            key: data.value,
            text: data.value,
            value: data.value
        })
        this.setState({ inputs })
    }

    handleRestoreChange(_, { restore }) {
        const { inputs } = this.state
        const uriInput = findInput(inputs, 'uri')
        uriInput.action = restore ? undefined : this.generateBtn
        uriInput.readOnly = !restore
    }

    handleSubmit() {
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
        seed = seed || generateMnemonic()
        seed = seed.split('/totem/')[0] + `/totem/${usageType === 'personal' ? 0 : 1}/0`
        this.addressBond.changed(identityService.accountFromPhrase(seed) || '')
        findInput(inputs, 'uri').bond.changed(seed)
        this.setState({ inputs })
    }

    render() {
        const { doUpdate, props, state } = this
        const action = doUpdate ? wordsCapitalized.update : wordsCapitalized.create
        state.message = state.message || props.message
        state.header = props.header || `${action} ${wordsCapitalized.identity}`
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