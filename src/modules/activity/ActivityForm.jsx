import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { arrSort, generateHash, isFn, objClean } from '../../utils/utils'
import FormBuilder, { fillValues, findInput } from '../../components/FormBuilder'
import { translated } from '../../services/language'
import { addToQueue, QUEUE_TYPES } from '../../services/queue'
import { getAll as getIdentities, getSelected } from '../identity/identity'
import Balance from '../identity/Balance'
import { getProjects, queueables } from './activity'
import ActivityTeamList from './ActivityTeamList'
import { Button } from 'semantic-ui-react'
import { closeModal, confirm } from '../../services/modal'

const textsCap = translated({
    cancel: 'cancel',
    close: 'close',
    create: 'create',
    description: 'description',
    name: 'name',
    update: 'update',

    addTeamMembers: 'add/view team members',
    descLabel: 'activity Description',
    descPlaceholder: 'enter short description of the activity... (max 160 characters)',
    formHeaderCreate: 'create a new Activity',
    formHeaderUpdate: 'update Activity',
    nameLabel: 'activity Name',
    namePlaceholder: 'enter activity name',
    ownerLabel: 'select the owner Identity for this Activity ',
    ownerPlaceholder: 'select owner',
    projectTeam: 'activity team',
    saveBONSAIToken: 'save BONSAI auth token',
    saveDetailsTitle: 'save Activity details to messaging service',
    submitErrorHeader: 'request failed',
    submitQueuedMsg: 'your request has been added to background queue. You may close the dialog now.',
    submitQueuedHeader: 'activity has been queued',
    submitSuccessHeader: 'activity saved successfully',
    submitTitleCreate: 'create activity',
    submitTitleUpdate: 'update activity',
}, true)[1]
const validKeys = ['name', 'ownerAddress', 'description']

// Create or update project form
export default class ActivityForm extends Component {
    constructor(props) {
        super(props)

        const { hash, header } = props
        this.state = {
            onSubmit: this.handleSubmit,
            success: false,
            header: header || (hash ? textsCap.formHeaderUpdate : textsCap.formHeaderCreate),
            submitText: hash ? textsCap.update : textsCap.create,
            inputs: [
                {
                    label: textsCap.nameLabel,
                    name: 'name',
                    minLength: 3,
                    placeholder: textsCap.namePlaceholder,
                    required: true,
                    type: 'text',
                    value: ''
                },
                {
                    disabled: !!props.hash,
                    label: textsCap.ownerLabel,
                    name: 'ownerAddress',
                    placeholder: textsCap.ownerPlaceholder,
                    required: true,
                    search: ['text', 'value'],
                    selection: true,
                    type: 'dropdown',
                },
                {
                    label: textsCap.descLabel,
                    name: 'description',
                    maxLength: 160,
                    placeholder: textsCap.descPlaceholder,
                    required: true,
                    type: 'textarea',
                    value: '',
                }
            ]
        }
        this.originalSetState = this.setState
        this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
    }

    componentWillMount() {
        this._mounted = true
        this.unsubscribers = {}
        const { inputs } = this.state
        const values = this.props.values || {}
        const ownerAddressIn = findInput(inputs, 'ownerAddress')
        values.ownerAddress = values.ownerAddress || getSelected().address

        const options = getIdentities().map(({ address, name }) => ({
            description: <Balance address={address} className='description' />,
            key: address,
            text: name,
            value: address
        }))
        ownerAddressIn.options = arrSort(options, 'text')

        fillValues(inputs, values)
        this.setState({ inputs })
    }

    componentWillUnmount = () => this._mounted = false

    handleSubmit = (e, values) => {
        const { onSubmit, hash: existingHash } = this.props
        const create = !existingHash
        const hash = existingHash || generateHash(values)
        const token = generateHash(objClean(values, validKeys))
        const { description: desc, name: projectName, ownerAddress } = values
        const title = create
            ? textsCap.submitTitleCreate
            : textsCap.submitTitleUpdate
        const description = `${textsCap.name}: ${projectName}` + '\n' + `${textsCap.description}: ${desc}`
        const message = {
            content: textsCap.submitQueuedMsg,
            header: textsCap.submitQueuedHeader,
            status: 'loading',
            icon: true
        }
        const handleTxError = (ok, err) => !ok && this.setState({
            message: {
                content: `${err}`,
                header: textsCap.submitErrorHeader,
                icon: true,
                status: 'error'
            },
            submitDisabled: false,
        })

        this.setState({ message, submitDisabled: true })

        // save auth token to blockchain and then store data to off-chain DB
        const updateTask = queueables.saveBONSAIToken(ownerAddress, hash, token, {
            title: textsCap.saveBONSAIToken,
            description: token,
            then: handleTxError,
            next: {
                type: QUEUE_TYPES.CHATCLIENT,
                func: 'project',
                title: textsCap.saveDetailsTitle,
                description,
                args: [
                    hash,
                    values,
                    create,
                    err => {
                        isFn(onSubmit) && onSubmit(!err, values)
                        this.setState({
                            message: {
                                content: err
                                    ? err
                                    : (
                                        <Button {...{
                                            content: textsCap.addTeamMembers,
                                            onClick: () => {
                                                const { modalId } = this.props
                                                closeModal(modalId)
                                                confirm({
                                                    confirmButton: null,
                                                    content: <ActivityTeamList projectHash={hash} />,
                                                    header: `${textsCap.projectTeam} - ${title}`,
                                                })
                                            },
                                        }} />
                                    ),
                                header: err
                                    ? textsCap.submitErrorHeader
                                    : textsCap.submitSuccessHeader,
                                icon: true,
                                status: !err ? 'success' : 'warning',
                            },
                            submitDisabled: false,
                            success: !err,
                        })
                        // trigger cache update
                        !err && getProjects(true)
                    }
                ],
            },
        })

        // Send transaction to blockchain first, then add to external storage
        const createTask = queueables.add(ownerAddress, hash, {
            title,
            description,
            then: handleTxError,
            next: updateTask
        })

        addToQueue(create ? createTask : updateTask)
    }

    render = () => {
        return <FormBuilder {...{ ...this.props, ...this.state }} />

    }
}
ActivityForm.propTypes = {
    // Project hash
    hash: PropTypes.string,
    values: PropTypes.shape({
        description: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        ownerAddress: PropTypes.string.isRequired,
    }),
}
ActivityForm.defaultProps = {
    closeText: textsCap.close,
    size: 'tiny',
}