// A read only form to display identity details including seed
import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { Button } from 'semantic-ui-react'
import FormBuilder, { fillValues, findInput } from '../components/FormBuilder'
import identityService from '../services/identity'
import { copyToClipboard, isFn, textCapitalize } from '../utils/utils'
import { confirm } from '../services/modal'
import { Pretty } from '../Pretty'
import { ss58Decode } from '../utils/convert'

// address is used in some contexts to select the address from local storage. Do not change the text for address
const words = {
    address: 'address',
    close: 'close',
    copy: 'copy',
    identity: 'identity',
    name: 'name',
    never: 'never',
    permanently: 'permanently',
    remove: 'remove',
    seed: 'seed',
    show: 'show',
    tags: 'tags',
    usage: 'usage',
}
const wordsCap = textCapitalize(words)
const texts = {
    cryptoType: 'Identity type',
    hideSeed: 'Hide seed',
    identityDetails: 'Identity details',
    lastBackup: 'Last backup',
    noKeepItHidden: 'No keep it hidden',
    recoveryPhrase: 'Recovery Phrase',
    removeWarningPart1: 'You are about to remove the following identity.',
    removeWarningPart2: `If not backed up, this action is irreversible. 
        You will lose access to all activity/data related to this Identity.`,
    selectedWalletWarning: 'Cannot remove identity you are currently using',
    showSeed: 'Show seed phrase',
    txAllocations: 'TX Allocations',
}

// Read-only form
export default class IdentityDetails extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.identity = {}
        this.showSeed = false
        this.state = {
            closeOnSubmit: true,
            closeText: <Button negative={false} positive content={wordsCap.close} />,
            onSubmit: this.handleSubmit.bind(this),
            submitText: (
                <Button
                    icon='trash'
                    negative
                    positive={false}
                    content={`${wordsCap.remove} ${wordsCap.permanently}`}
                />
            ),
            success: false, // sets true  when identity removed
            inputs: [
                {
                    label: wordsCap.name,
                    name: 'name',
                    readOnly: true,
                    type: 'text',
                },
                {
                    action: {
                        icon: 'copy',
                        onClick: (e) => e.preventDefault() | copyToClipboard(this.identity.address),
                        style: { cursor: 'pointer' },
                        title: `${wordsCap.copy} ${words.identity}`,
                    },
                    label: wordsCap.identity,
                    name: 'address',
                    readOnly: true,
                    type: 'text',
                },
                {
                    inlineLabel: {
                        icon: { className: 'no-margin', name: 'eye' },
                        style: { cursor: 'pointer' },
                        title: `${wordsCap.show} ${texts.recoveryPhrase}`,
                        onClick: () => {
                            const toggle = () => {
                                const { inputs } = this.state
                                this.showSeed = !this.showSeed
                                const uriIn = findInput(inputs, 'uri')
                                uriIn.action = !this.showSeed ? undefined : {
                                    icon: 'copy',
                                    onClick: (e) => e.preventDefault() | copyToClipboard(this.identity.uri),
                                    title: `${wordsCap.copy} ${words.seed}`,
                                }
                                uriIn.inlineLabel.icon.name = `eye${this.showSeed ? ' slash' : ''}`
                                uriIn.inlineLabel.title = `${this.showSeed ? texts.hideSeed : texts.showSeed}`
                                uriIn.value = this.getUri()
                                this.setState({ inputs })
                            }
                            this.showSeed ? toggle() : confirm({
                                cancelButton: <Button positive content={texts.noKeepItHidden} />,
                                confirmButton: <Button negative content={wordsCap.show} />,
                                header: texts.showSeed,
                                onConfirm: toggle,
                                size: 'mini',
                            })
                        },
                    },
                    labelPosition: 'left', // for inlineLabel
                    label: wordsCap.seed,
                    name: 'uri',
                    readOnly: true,
                    type: 'text',
                    useInput: true,
                },
                {
                    label: texts.cryptoType,
                    name: 'type',
                    readOnly: true,
                },
                {
                    label: wordsCap.usage,
                    name: 'usageType',
                    readOnly: true,
                    type: 'text',
                },
                {
                    disabled: true,
                    label: wordsCap.tags,
                    multiple: true,
                    name: 'tags',
                    options: [],
                    search: true,
                    selection: true,
                    type: 'dropdown',
                },
                {
                    defaultValue: words.never,
                    label: texts.lastBackup,
                    name: 'cloudBackupTS',
                    readOnly: true,
                    type: 'text',
                },
                {
                    name: 'txAllocations',
                    type: 'html'
                }
            ],
        }
    }

    componentWillMount() {
        const { inputs } = this.state
        const { address, tags } = this.props.values || {}
        this.identity = identityService.get(address) || {}
        // populate 'tags' field options using the value
        findInput(inputs, 'tags').options = (tags || []).map(tag => ({
            key: tag,
            text: tag,
            value: tag,
        }))
        findInput(inputs, 'txAllocations').content = (
            <label style={{ fontWeight: 'bold', margin: 0 }}>
                {texts.txAllocations}: <Pretty value={runtime.balances.balance(ss58Decode(address))} />
            </label>
        )
        fillValues(inputs, { ...this.identity, uri: this.getUri() })
    }

    getUri() {
        const { uri } = this.identity
        return this.showSeed ? uri : '*'.repeat(uri.length)
    }

    handleSubmit() {
        const { onSubmit } = this.props
        const { address, name } = this.identity
        if (address === identityService.getSelected().address) {
            return confirm({
                cancelButton: 'Ok',
                confirmButton: null,
                content: texts.selectedWalletWarning,
                size: 'mini',
            })
        }

        const confirmContent = `${wordsCap.remove} ${wordsCap.permanently}`
        confirm({
            confirmButton: <Button icon='trash' content={confirmContent} negative />,
            content: [
                <p key='1'>{`${wordsCap.identity} ${words.name}`}: <b>{name}</b></p>,
                <p key='0'>{texts.removeWarningPart1} <b>{texts.removeWarningPart2}</b></p>
            ],
            header: `${wordsCap.remove} ${wordsCap.identity}`,
            onConfirm: () => {
                identityService.remove(address)
                this.setState({ success: true })
                isFn(onSubmit) && onSubmit(true, this.identity)
            },
            size: 'tiny',
        })
    }

    render() {
        return <FormBuilder {...{ ...this.props, ...this.state }} />
    }
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
    header: texts.identityDetails,
    size: 'small',
}