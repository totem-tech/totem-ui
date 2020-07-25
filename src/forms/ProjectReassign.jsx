import React from 'react'
import PropTypes from 'prop-types'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import { arrSort, isFn, textEllipsis } from '../utils/utils'
import FormBuilder, { fillValues, findInput } from '../components/FormBuilder'
import PartnerForm from '../forms/Partner'
// services
import identities from '../services/identity'
import { translated } from '../services/language'
import { confirm, showForm } from '../services/modal'
import partners from '../services/partner'
import { queueables } from '../services/project'
import { addToQueue, QUEUE_TYPES } from '../services/queue'

const [words, wordsCap] = translated({
    cancel: 'cancel',
    proceed: 'proceed',
}, true)
const [texts] = translated({
    confirmHeader: 'Are you sure you want to reassign this activity?',
    confirmMsg: `You are about to assign the ownership of this activity to an Identity that does not belong to you. 
        If you proceed, you will no longer be able to update or manage this activity.`,
    formHeader: 'Re-assign Activity Owner',
    hashLabel: 'Activity Unique ID',
    identityOptionsHeader: 'Select own identity',
    nameLabel: 'Activity Name',
    newOwnerLabel: 'New Activity Owner',
    newOwnerPlaceholder: 'Select new owner',
    newOwnerReassignSelfMsg: 'Cannot reassign activity to yourself',
    ownerLabel: 'Current Activity Owner',
    partnerOptionsHeader: 'Select a partner',
    queueDescription: 'Activity Name: ',
    queuedMsgHeader: 'Re-assign request added to queue',
    queuedMsgContent: 'Your request to reassign the activity has been added to queue. ',
    queueTitle: 'Re-assign activity owner',
})

export default class ReassignProjectForm extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.state = {
            message: {},
            onSubmit: this.handleSubmit,
            success: false,
            inputs: [
                {
                    label: texts.nameLabel,
                    name: 'name',
                    readOnly: true,
                    required: true,
                    type: 'text',
                    value: ''
                },
                {
                    label: texts.hashLabel,
                    name: 'hash',
                    readOnly: true,
                    required: true,
                    type: 'text',
                    value: ''
                },
                {
                    disabled: true,
                    label: texts.ownerLabel,
                    name: 'ownerAddress',
                    required: true,
                    search: true,
                    selection: true,
                    type: 'dropdown',
                },
                {
                    bond: new Bond(),
                    label: texts.newOwnerLabel,
                    name: 'newOwnerAddress',
                    onChange: this.handleNewOwnerChange,
                    placeholder: texts.newOwnerPlaceholder,
                    search: ['text', 'value'], // search both name and project hash
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
                            newOwnerIn.bond.changed(address)
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
        this.bond = Bond.all([identities.bond, partners.bond])
        this.tieId = this.bond.tie(() => {
            const { inputs } = this.state
            const { hash, values } = this.props
            const { ownerAddress } = values
            const identityOptions = identities.getAll()
                // dropdown options
                .map(({ address, name }) => ({
                    description: textEllipsis(address, 15),
                    key: 'identity-' + address,
                    text: name,
                    value: address
                }))

            const partnerOptions = Array.from(partners.getAll())
                // exclude any possible duplicates (if any identity is also in partner list)
                .filter(([address]) => !identities.find(address))
                .map(([address, { name }]) => ({
                    description: textEllipsis(address, 15),
                    key: 'partner-' + address,
                    text: name,
                    value: address
                }))

            const options = []
            identityOptions.length > 0 && options.push({
                key: 'identities',
                style: styles.itemHeader,
                text: texts.identityOptionsHeader,
                value: '' // keep
            }, ...arrSort(
                // exclude current owner
                identityOptions.filter(({ value }) => value !== ownerAddress),
                'text'
            ))
            partnerOptions.length > 0 && options.push({
                key: 'partners',
                style: styles.itemHeader,
                text: texts.partnerOptionsHeader,
                value: '' // keep
            }, ...arrSort(partnerOptions, 'text'))
            findInput(inputs, 'ownerAddress').options = identityOptions
            findInput(inputs, 'newOwnerAddress').options = options
            fillValues(inputs, { ...values, hash })
            this.setState({ inputs })
        })
    }

    componentWillUnmount() {
        this._mounted = false
        this.bond.untie(this.tieId)
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
        const doConfirm = !!identities.find(newOwnerAddress)
        const task = queueables.reassign(ownerAddress, newOwnerAddress, hash, {
            title: texts.queueTitle,
            description: texts.queueDescription + name,
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
                header: texts.queuedMsgHeader,
                content: texts.queuedMsgContent,
                status: 'success',
                showIcon: true
            },
            success: true
        })

        !!doConfirm ? proceed() : confirm({
            cancelButton: { content: wordsCap.cancel, color: 'green' },
            confirmButton: { content: wordsCap.proceed, negative: true },
            content: texts.confirmMsg,
            header: texts.confirmHeader,
            onConfirm: () => proceed(),
            size: 'tiny'
        })
    }

    render = () => <FormBuilder {...{ ...this.props, ...this.state }} />
}

ReassignProjectForm.propTypes = {
    hash: PropTypes.string.isRequired,
    values: PropTypes.shape({
        name: PropTypes.string.isRequired,
        ownerAddress: PropTypes.string.isRequired,
    }).isRequired
}
ReassignProjectForm.defaultProps = {
    header: texts.formHeader,
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