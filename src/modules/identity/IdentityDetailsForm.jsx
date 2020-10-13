import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Button } from 'semantic-ui-react'
import { copyToClipboard, deferred, isFn } from '../../utils/utils'
import Balance from '../../components/Balance'
import FormBuilder, { fillValues, findInput } from '../../components/FormBuilder'
import { translated } from '../../services/language'
import { confirm } from '../../services/modal'
import { get, getSelected, remove, set } from './identity'
import IdentityForm from './IdentityForm'

const textsCap = translated({
    availableBalance: 'available balance',
    autoSaved: 'changes will be auto-saved',
    business: 'business',
    close: 'close',
    copyAddress: 'copy address',
    copySeed: 'copy seed',
    cryptoType: 'identity type',
    hideSeed: 'hide seed',
    identity: 'identity',
    identityDetails: 'identity details',
    lastBackup: 'last backup',
    loadingBalance: 'loading account balance',
    name: 'name',
    never: 'never',
    noKeepItHidden: 'no, keep it hidden',
    ok: 'OK',
    personal: 'personal',
    showSeed: 'show seed',
    removeIdentity: 'remove identity',
    removePermanently: 'remove permanently',
    removeWarningPart1: 'you are about to remove the following identity',
    removeWarningPart2: 'if not backed up, this action is irreversible',
    removeWarningPart3: 'you will lose access to all activity/data related to this identity.',
    selectedWalletWarning: 'cannot remove identity you are currently using',
    show: 'show',
    showSeed: 'show seed phrase',
    seed: 'seed',
    tags: 'tags',
    update: 'update',
    usage: 'usage',
}, true)[1]

// A read only form to display identity details including seed
export default class IdentityDetailsForm extends Component {
    constructor(props) {
        super(props)

        this.identity = get((props.values || {}).address) || {}
        const { address, tags } = this.identity
        this.showSeed = false
        this.names = {
            address: 'address',
            name: 'name',

        }
        this.state = {
            closeOnSubmit: true,
            closeText: {
                content: textsCap.close,
                negative: false,
            },
            subheader: <i style={{ color: 'grey' }}>{textsCap.autoSaved}</i>,
            submitText: null, // hide submit button
            success: false, // sets true  when identity removed and modal will be auto closed
            inputs: [
                {
                    content: (
                        <IdentityForm {...{
                            El: 'div',
                            // auto save changes
                            onChange: this.handleChange,
                            submitText: null,
                            values: this.identity,
                        }} />
                    ),
                    name: 'identity-form',
                    type: 'html',
                },
                {
                    action: {
                        icon: 'copy',
                        onClick: e => e.preventDefault() | copyToClipboard(this.identity.address),
                        style: { cursor: 'pointer' },
                        title: textsCap.copyAddress,
                    },
                    label: textsCap.identity,
                    name: this.names.address,
                    readOnly: true,
                    type: 'text',
                },
                {
                    inlineLabel: {
                        icon: { className: 'no-margin', name: 'eye' },
                        style: { cursor: 'pointer' },
                        title: textsCap.showSeed,
                        onClick: () => {
                            const toggle = () => {
                                const { inputs } = this.state
                                this.showSeed = !this.showSeed
                                const uriIn = findInput(inputs, 'uri')
                                uriIn.action = !this.showSeed ? undefined : {
                                    icon: 'copy',
                                    onClick: (e) => e.preventDefault() | copyToClipboard(this.identity.uri),
                                    title: textsCap.copySeed,
                                }
                                uriIn.inlineLabel.icon.name = `eye${this.showSeed ? ' slash' : ''}`
                                uriIn.inlineLabel.title = `${this.showSeed ? textsCap.hideSeed : textsCap.showSeed}`
                                uriIn.value = this.getUri(this.identity.uri)
                                this.setState({ inputs })
                            }
                            this.showSeed ? toggle() : confirm({
                                cancelButton: <Button positive content={textsCap.noKeepItHidden} />,
                                confirmButton: <Button negative content={textsCap.show} />,
                                header: textsCap.showSeed,
                                onConfirm: toggle,
                                size: 'mini',
                            })
                        },
                    },
                    labelPosition: 'left', // for inlineLabel
                    label: textsCap.seed,
                    name: 'uri',
                    readOnly: true,
                    type: 'text',
                    useInput: true,
                },
                {
                    label: textsCap.cryptoType,
                    name: 'type',
                    readOnly: true,
                },
                {
                    label: textsCap.lastBackup,
                    name: 'fileBackupTS',
                    readOnly: true,
                    type: 'text',
                    value: textsCap.never,
                },
                {
                    content: (
                        <Balance {...{
                            address: address,
                            EL: 'label',
                            emptyMessage: textsCap.loadingBalance,
                            prefix: `${textsCap.availableBalance}: `,
                            style: { fontWeight: 'bold', margin: '0 0 0 3px' },
                        }} />
                    ),
                    name: 'txAllocations',
                    type: 'html'
                },
                {
                    content: textsCap.removePermanently,
                    icon: 'trash',
                    fluid: true,
                    name: 'delete',
                    negative: true,
                    onClick: this.handleDelete,
                    style: { marginTop: 15 },
                    type: 'button'
                }
            ],
        }

        fillValues(this.state.inputs, { ...this.identity, uri: this.getUri(this.identity.uri) })
    }

    getUri = uri => this.showSeed || !uri ? uri : '*'.repeat(uri.length)

    handleChange = deferred((_, values) => set(values.address, values), 300)

    handleDelete = () => {
        const { onSubmit } = this.props
        const { address, name } = this.identity
        if (address === getSelected().address) {
            return confirm({
                cancelButton: textsCap.ok,
                confirmButton: null,
                content: textsCap.selectedWalletWarning,
                size: 'mini',
            })
        }

        confirm({
            confirmButton: <Button icon='trash' content={textsCap.removePermanently} negative />,
            content: [
                <p key='1'>{textsCap.removeWarningPart1}: <b>{name}</b></p>,
                <p key='0'>
                    <b>
                        {textsCap.removeWarningPart2}
                        {textsCap.removeWarningPart3}
                    </b>
                </p>
            ],
            header: textsCap.removeIdentity,
            onConfirm: () => {
                remove(address)
                this.setState({ success: true })
                isFn(onSubmit) && onSubmit(true, this.identity)
            },
            size: 'tiny',
        })
    }

    render = () => <FormBuilder {...{ ...this.props, ...this.state }} />
}
IdentityDetailsForm.propTypes = {
    values: PropTypes.shape({
        address: PropTypes.string.isRequired,
    }).isRequired,
}
IdentityDetailsForm.defaultProps = {
    closeOnDimmerClick: true,
    closeOnDocumentClick: true,
    closeOnEscape: true,
    header: textsCap.identityDetails,
    size: 'tiny',
}