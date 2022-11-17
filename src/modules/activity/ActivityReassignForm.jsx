import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import { arrSort, isFn, textEllipsis } from '../../utils/utils'
import FormBuilder, { fillValues, findInput } from '../../components/FormBuilder'
// services
import { translated } from '../../services/language'
import { confirm, showForm } from '../../services/modal'
import { addToQueue, QUEUE_TYPES } from '../../services/queue'
import { find as findIdentity, getAll as getIdentities } from '../identity/identity'
import partners from '../partner/partner'
import PartnerForm from '../partner/PartnerForm'
import { queueables } from './activity'
import AddressName from '../partner/AddressName'

let textsCap = {
    cancel: 'cancel',
    confirmHeader: 'are you sure you want to reassign this activity?',
    confirmMsg1: 'you are about to assign the ownership of this activity to an Identity that does not belong to you.',
    confirmMsg2: 'if you proceed, you will no longer be able to update or manage this activity.',
    formHeader: 're-assign activity Owner',
    activityIdLabel: 'activity ID',
    identity: 'identity',
    identityOptionsHeader: 'select own identity',
    nameLabel: 'activity Name',
    newOwnerLabel: 'new activity Owner',
    newOwnerPlaceholder: 'select new owner',
    newOwnerReassignSelfMsg: 'cannot reassign activity to yourself',
    ownerLabel: 'current Activity Owner',
    partner: 'partner',
    partnerOptionsHeader: 'select a partner',
    proceed: 'proceed',
    queueDescription: 'activity Name: ',
    queuedMsgHeader: 're-assign request added to queue',
    queuedMsgContent: 'your request to reassign the activity has been added to queue',
    queueTitle: 're-assign activity owner',
}
textsCap = translated(textsCap, true)[1]

export default class ActivityReassignForm extends Component {
    constructor(props) {
        super(props)

        this.state = {
            message: {},
            onSubmit: this.handleSubmit,
            success: false,
            inputs: [
                {
                    label: textsCap.nameLabel,
                    name: 'name',
                    readOnly: true,
                    required: true,
                    type: 'text',
                    value: ''
                },
                {
                    label: textsCap.activityIdLabel,
                    name: 'hash',
                    readOnly: true,
                    required: true,
                    type: 'text',
                    value: ''
                },
                {
                    disabled: true,
                    label: textsCap.ownerLabel,
                    name: 'ownerAddress',
                    required: true,
                    search: ['keywords'],
                    selection: true,
                    type: 'dropdown',
                },
                {
                    label: textsCap.newOwnerLabel,
                    name: 'newOwnerAddress',
                    onChange: this.handleNewOwnerChange,
                    placeholder: textsCap.newOwnerPlaceholder,
                    rxValue: new BehaviorSubject(),
                    search: ['keywords'], // search both name and project hash
                    selection: true,
                    required: true,
                    type: 'dropdown',

                },
                {
                    content: 'Add partner',
                    fluid: true,
                    name: 'addPartnerButton',
                    onClick: () => showForm(PartnerForm, {
                        onSubmit: (ok, { address }) => {
                            if (!ok) return
                            const { inputs } = this.state
                            const newOwnerIn = findInput(inputs, 'newOwnerAddress')
                            newOwnerIn.rxValue.next(address)
                        }
                    }),
                    type: 'button'
                }
            ]
        }

        this.originalSetState = this.setState
        this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
    }

    componentWillMount() {
        this._mounted = true
        const { inputs } = this.state
        const { hash, values } = this.props
        const { ownerAddress } = values
        const identityOptions = getIdentities()
            // dropdown options
            .map(({ address, name }) => ({
                description: textEllipsis(address, 15),
                key: 'identity-' + address,
                keywords: [
                    address,
                    name,
                    'identity',
                    textsCap.identity,
                ].join(' '),
                text: <AddressName {...{ address }} />,
                value: address
            }))

        const partnerOptions = Array.from(partners.getAll())
            // exclude any possible duplicates (if any identity is also in partner list)
            .filter(([address]) => !findIdentity(address))
            .map(([address, { name, userId }]) => ({
                description: textEllipsis(address, 15),
                key: 'partner-' + address,
                keywords: [
                    address,
                    name,
                    userId,
                    'partner',
                    textsCap.partner,
                ].join(' '),
                text: <AddressName {...{ address }} />,
                value: address
            }))

        const options = []
        identityOptions.length > 0 && options.push({
            key: 'identities',
            style: styles.itemHeader,
            text: textsCap.identityOptionsHeader,
            value: '' // keep
        }, ...arrSort(
            // exclude current owner
            identityOptions.filter(({ value }) => value !== ownerAddress),
            'text'
        ))
        partnerOptions.length > 0 && options.push({
            key: 'partners',
            style: styles.itemHeader,
            text: textsCap.partnerOptionsHeader,
            value: '' // keep
        }, ...arrSort(partnerOptions, 'text'))
        findInput(inputs, 'ownerAddress').options = identityOptions
        findInput(inputs, 'newOwnerAddress').options = options
        fillValues(inputs, { ...values, hash })
        this.setState({ inputs })
    }

    componentWillUnmount() {
        this._mounted = false
    }

    handleNewOwnerChange = (_, { ownerAddress, newOwnerAddress }) => {
        const valid = !ownerAddress || ownerAddress !== newOwnerAddress
        const { inputs } = this.state
        const input = findInput(inputs, 'newOwnerAddress')
        input.invalid = !valid
        input.message = valid ? null : {
            content: newOwnerReassignSelfMsg,
            status: 'error'
        }
        this.setState({ inputs })
    }

    handleSubmit = (_, values) => {
        const { values: project, onSubmit } = this.props
        const { hash, name, ownerAddress, newOwnerAddress } = values
        // confirm if re-assigning to someone else
        const doConfirm = !!findIdentity(newOwnerAddress)
        const task = queueables.reassign(ownerAddress, newOwnerAddress, hash, {
            title: textsCap.queueTitle,
            description: textsCap.queueDescription + name,
            next: {
                type: QUEUE_TYPES.CHATCLIENT,
                func: 'project',
                args: [
                    hash,
                    { ...project, ownerAddress: newOwnerAddress },
                    false,
                    err => isFn(onSubmit) && onSubmit(values, !err)
                ]
            }
        })
        const proceed = () => addToQueue(task) | this.setState({
            message: {
                header: textsCap.queuedMsgHeader,
                content: textsCap.queuedMsgContent,
                status: 'success',
                icon: true
            },
            success: true
        })

        !!doConfirm ? proceed() : confirm({
            cancelButton: { content: textsCap.cancel, color: 'green' },
            confirmButton: { content: textsCap.proceed, negative: true },
            content: textsCap.confirmMsg,
            header: textsCap.confirmHeader,
            onConfirm: () => proceed(),
            size: 'tiny'
        })
    }

    render = () => <FormBuilder {...{ ...this.props, ...this.state }} />
}

ActivityReassignForm.propTypes = {
    hash: PropTypes.string.isRequired,
    values: PropTypes.shape({
        name: PropTypes.string.isRequired,
        ownerAddress: PropTypes.string.isRequired,
    }).isRequired
}
ActivityReassignForm.defaultProps = {
    header: textsCap.formHeader,
    size: 'tiny',
}

const styles = {
    itemHeader: {
        background: 'grey',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '1em'
    }
}