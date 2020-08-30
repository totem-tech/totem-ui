import React, { Component } from 'react'
import PropTypes from 'prop-types'
import Balance from '../components/Balance'
import { Button } from 'semantic-ui-react'
import FormBuilder, { fillValues, findInput } from '../components/FormBuilder'
import { copyToClipboard, isFn } from '../utils/utils'
// services
import { get, getSelected, remove } from '../services/identity'
import { translated } from '../services/language'
import { confirm } from '../services/modal'

const textsCap = translated({
    close: 'close',
    identity: 'identity',
    name: 'name',
    never: 'never',
    seed: 'seed',
    show: 'show',
    tags: 'tags',
    usage: 'usage',
    copyAddress: 'copy address',
    copySeed: 'copy seed',
    cryptoType: 'identity type',
    hideSeed: 'hide seed',
    identityDetails: 'identity details',
    lastBackup: 'last backup',
    noKeepItHidden: 'no, keep it hidden',
    showSeed: 'show seed',
    removeIdentity: 'remove identity',
    removePermanently: 'remove permanently',
    removeWarningPart1: 'you are about to remove the following identity',
    removeWarningPart2: 'if not backed up, this action is irreversible',
    removeWarningPart3: 'you will lose access to all activity/data related to this identity.',
    selectedWalletWarning: 'cannot remove identity you are currently using',
    showSeed: 'show seed phrase',
    txAllocations: 'transaction balance',
}, true)[1]

// A read only form to display identity details including seed
export default class IdentityDetails extends Component {
    constructor(props) {
        super(props)

        const { address, tags } = props.values || {}
        this.identity = get(address) || {}
        this.showSeed = false
        this.state = {
            closeOnSubmit: true,
            closeText: (
                <Button
                    negative={false}
                    positive
                    content={textsCap.close}
                />
            ),
            onSubmit: this.handleSubmit,
            submitText: (
                <Button
                    icon='trash'
                    negative
                    positive={false}
                    content={textsCap.removePermanently}
                />
            ),
            success: false, // sets true  when identity removed
            inputs: [
                {
                    label: textsCap.name,
                    name: 'name',
                    readOnly: true,
                    type: 'text',
                },
                {
                    action: {
                        icon: 'copy',
                        onClick: e => e.preventDefault() | copyToClipboard(this.identity.address),
                        style: { cursor: 'pointer' },
                        title: textsCap.copyAddress,
                    },
                    label: textsCap.identity,
                    name: 'address',
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
                                uriIn.value = this.getUri()
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
                    label: textsCap.usage,
                    name: 'usageType',
                    readOnly: true,
                    type: 'text',
                },
                {
                    disabled: true,
                    label: textsCap.tags,
                    multiple: true,
                    name: 'tags',
                    options: (tags || []).map(tag => ({
                        key: tag,
                        text: tag,
                        value: tag,
                    })),
                    search: true,
                    selection: true,
                    type: 'dropdown',
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
                        <label style={{ fontWeight: 'bold', margin: 0 }}>
                            {textsCap.txAllocations}: {' '}
                            <Balance address={address} />
                        </label>
                    ),
                    name: 'txAllocations',
                    type: 'html'
                },
            ],
        }

        fillValues(this.state.inputs, { ...this.identity, uri: this.getUri() })
    }

    getUri = () => {
        const { uri } = this.identity
        return this.showSeed ? uri : '*'.repeat(uri.length)
    }

    // Delete identity on submit
    handleSubmit = () => {
        const { onSubmit } = this.props
        const { address, name } = this.identity
        if (address === getSelected().address) {
            return confirm({
                cancelButton: 'Ok',
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
IdentityDetails.propTypes = {
    values: PropTypes.shape({
        address: PropTypes.string.isRequired,
    }).isRequired,
}
IdentityDetails.defaultProps = {
    closeOnDimmerClick: true,
    closeOnDocumentClick: true,
    closeOnEscape: true,
    header: textsCap.identityDetails,
    size: 'tiny',
}