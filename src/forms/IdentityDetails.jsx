// A read only form to display identity details including seed
import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { Button } from 'semantic-ui-react'
import FormBuilder, { fillValues, findInput } from '../components/FormBuilder'
import identityService from '../services/identity'
import { copyToClipboard, isFn, textCapitalize } from '../utils/utils'
import { confirm } from '../services/modal'

const words = {
    address: 'address',
    close: 'close',
    copy: 'copy',
    identity: 'identity',
    name: 'name',
    permanently: 'permanently',
    remove: 'remove',
    seed: 'seed',
    show: 'show',
}
const wordsCapitalized = textCapitalize(words)
const texts = {
    cryptoType: 'Crypto Type',
    hideSeed: 'Hide seed',
    identityDetails: 'Identity details',
    noKeepItHidden: 'No keep it hidden',
    removeWarningPart1: 'You are about to remove the following identity.',
    removeWarningPart2: `If not backed up, this action is irreversible. 
        You will lose access to any activity/data related to this project.`,
    selectedWalletWarning: 'Cannot remove selected wallet',
    showSeed: 'Show seed',
}

export default class IdentityDetails extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.identity = {}
        this.showSeed = false
        this.state = {
            closeOnSubmit: true,
            closeText: <Button negative={false} positive content={wordsCapitalized.close} />,
            onSubmit: this.handleSubmit.bind(this),
            submitText: (
                <Button
                    icon='trash'
                    negative
                    positive={false}
                    content={`${wordsCapitalized.remove} ${wordsCapitalized.permanently}`}
                />
            ),
            success: false, // sets true  when identity removed
            inputs: [
                {
                    label: wordsCapitalized.name,
                    name: 'name',
                    readOnly: true,
                    type: 'text',
                },
                {
                    action: {
                        icon: 'copy',
                        onClick: (e) => e.preventDefault() | copyToClipboard(this.identity.address),
                        style: { cursor: 'pointer' },
                        title: `${wordsCapitalized.copy} ${words.address}`,
                    },
                    label: wordsCapitalized.address,
                    name: 'address',
                    readOnly: true,
                    type: 'text',
                },
                {
                    inlineLabel: {
                        icon: { className: 'no-margin', name: 'eye' },
                        style: { cursor: 'pointer' },
                        title: `${wordsCapitalized.show} ${words.seed}`,
                        onClick: () => {
                            const toggle = () => {
                                const { inputs } = this.state
                                this.showSeed = !this.showSeed
                                const uriIn = findInput(inputs, 'uri')
                                uriIn.action = !this.showSeed ? undefined : {
                                    icon: 'copy',
                                    onClick: (e) => e.preventDefault() | copyToClipboard(this.identity.uri),
                                    title: `${wordsCapitalized.copy} ${words.seed}`,
                                }
                                uriIn.inlineLabel.icon.name = `eye${this.showSeed ? ' slash' : ''}`
                                uriIn.inlineLabel.title = `${this.showSeed ? texts.hideSeed : texts.showSeed}`
                                uriIn.value = this.getUri()
                                this.setState({ inputs })
                            }
                            this.showSeed ? toggle() : confirm({
                                cancelButton: <Button positive content={texts.noKeepItHidden} />,
                                confirmButton: <Button negative content={wordsCapitalized.show} />,
                                header: texts.showSeed,
                                onConfirm: toggle,
                                size: 'mini',
                            })
                        },
                    },
                    labelPosition: 'left', // for inlineLabel
                    label: wordsCapitalized.seed,
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
            ],
        }
    }

    componentWillMount() {
        const { address } = this.props.values
        this.identity = identityService.get(address) || {}
        fillValues(this.state.inputs, { ...this.identity, uri: this.getUri() })
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

        confirm({
            confirmButton: (
                <Button
                    icon='trash'
                    content={`${wordsCapitalized.remove} ${wordsCapitalized.permanently}`}
                    negative
                />
            ),
            content: [
                <p key='0'>{texts.removeWarningPart1} <b>{texts.removeWarningPart2}</b></p>,
                <p key='1'>{`${wordsCapitalized.identity} ${words.name}`}: <b>{name}</b></p>
            ],
            header: `${wordsCapitalized.remove} ${wordsCapitalized.identity}`,
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