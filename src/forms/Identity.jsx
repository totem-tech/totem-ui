import React from 'react'
import PropTypes from 'prop-types'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import Identicon from 'polkadot-identicon'
import { generateMnemonic } from 'bip39'
import FormBuilder, { findInput, fillValues } from '../components/FormBuilder'
import identityService from '../services/identity'
import { isFn, textCapitalize } from '../utils/utils'
import { ss58Encode } from '../utils/convert'

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
    seedExists: 'Seed alreaedy exists in the identity list',
    seedPlaceholder: 'Enter existing seed or generate one',
    tagsInputEmptyMessage: 'Enter tag and press enter to add, to tags list',
    tagsPlaceholder: 'Enter tags',
    uniqueNameRequired: 'Please enter an unique name',
    usageType: 'Usage type',
    validSeedRequired: 'Please enter a valid seed',
}

export default class IdentityForm extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.values = { ...props.values }
        this.addressBond = new Bond().defaultTo(this.values.address)
        this.doUpdate = !!this.values.address

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
                    validate: (_, { value: name }) => {
                        const existing = identityService.find(name)
                        if (existing && existing.address !== this.values.address) {
                            return texts.uniqueNameRequired
                        }
                    },
                    value: '',
                },
                {
                    bond: new Bond(),
                    hidden: true,
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
                    readOnly: true,
                    required: true,
                    type: 'text',
                    // validation for restore seed only
                    validate: (_, { value: seed }) => {
                        const { inputs } = this.state
                        const account = identityService.accountFromPhrase(seed)
                        if (!account) {
                            this.addressBond.changed('')
                            return texts.validSeedRequired
                        }
                        const address = ss58Encode(account)
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
                    },
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
                        { label: wordsCapitalized.personal, value: 'personal' },
                        { label: wordsCapitalized.business, value: 'business' }
                    ],
                    radio: true,
                    required: true,
                    type: 'Checkbox-group',
                },
                {
                    bond: this.addressBond,
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
        uriInput.hidden = !restore
        this.setState({ inputs })
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