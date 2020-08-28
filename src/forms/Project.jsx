import React, { Component } from 'react'
import PropTypes from 'prop-types'
import Balance from '../components/Balance'
import FormBuilder, { fillValues, findInput } from '../components/FormBuilder'
import { arrSort, generateHash, isFn, objClean } from '../utils/utils'
import { getAll, getSelected } from '../services/identity'
import { translated } from '../services/language'
import { getProjects, queueables } from '../services/project'
import { addToQueue, QUEUE_TYPES } from '../services/queue'

const [words, wordsCap] = translated({
    cancel: 'cancel',
    close: 'close',
    create: 'create',
    description: 'description',
    name: 'name',
    update: 'update',
}, true)
const [texts] = translated({
    descLabel: 'Activity Description',
    descPlaceholder: 'Enter short description of the activity... (max 160 characters)',
    formHeaderCreate: 'Create a new Activity',
    formHeaderUpdate: 'Update Activity',
    nameLabel: 'Activity Name',
    namePlaceholder: 'Enter activity name',
    ownerLabel: 'Select the owner Identity for this Activity ',
    ownerPlaceholder: 'Select owner',
    saveBONSAIToken: 'Save BONSAI auth token',
    saveDetailsTitle: 'Save Activity details to messaging service',
    submitErrorHeader: 'Request failed',
    submitQueuedMsg: 'Your request has been added to background queue. You may close the dialog now.',
    submitQueuedHeader: 'Activity has been queued',
    submitSuccessHeader: 'Activity saved successfully',
    submitTitleCreate: 'Create activity',
    submitTitleUpdate: 'Update activity',
})
const validKeys = ['name', 'ownerAddress', 'description']

// Create or update project form
export default class ProjectForm extends Component {
    constructor(props) {
        super(props)

        this.state = {
            onSubmit: this.handleSubmit,
            success: false,
            inputs: [
                {
                    label: texts.nameLabel,
                    name: 'name',
                    minLength: 3,
                    placeholder: texts.namePlaceholder,
                    required: true,
                    type: 'text',
                    value: ''
                },
                {
                    disabled: !!props.hash,
                    label: texts.ownerLabel,
                    name: 'ownerAddress',
                    placeholder: texts.ownerPlaceholder,
                    required: true,
                    search: ['text', 'value'],
                    selection: true,
                    type: 'dropdown',
                },
                {
                    label: texts.descLabel,
                    name: 'description',
                    maxLength: 160,
                    placeholder: texts.descPlaceholder,
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
        const { hash, header } = this.props
        const { inputs } = this.state
        const values = this.props.values || {}
        const ownerAddressIn = findInput(inputs, 'ownerAddress')
        values.ownerAddress = values.ownerAddress || getSelected().address

        const options = getAll().map(({ address, name }) => ({
            description: <Balance address={address} className='description' />,
            key: address,
            text: name,
            value: address
        }))
        ownerAddressIn.options = arrSort(options, 'text')

        fillValues(inputs, values)
        this.setState({
            inputs,
            header: header || (hash ? texts.formHeaderUpdate : texts.formHeaderCreate),
            submitText: hash ? wordsCap.update : wordsCap.create,
        })
    }

    componentWillUnmount = () => this._mounted = false

    handleSubmit = (e, values) => {
        const { onSubmit, hash: existingHash } = this.props
        const create = !existingHash
        const hash = existingHash || generateHash(values)
        const token = generateHash(objClean(values, validKeys))
        const { description: desc, name: projectName, ownerAddress } = values
        const title = create ? texts.submitTitleCreate : texts.submitTitleUpdate
        const description = `${wordsCap.name}: ${projectName}` + '\n' + `${wordsCap.description}: ${desc}`
        const message = {
            content: texts.submitQueuedMsg,
            header: texts.submitQueuedHeader,
            status: 'loading',
            showIcon: true
        }
        const handleTxError = (ok, err) => !ok && this.setState({
            message: {
                content: `${err}`,
                header: texts.submitErrorHeader,
                showIcon: true,
                status: 'error'
            },
            submitDisabled: false,
        })

        this.setState({ message, submitDisabled: true })

        // save auth token to blockchain and then store data to off-chain DB
        const updateTask = queueables.saveBONSAIToken(ownerAddress, hash, token, {
            title: texts.saveBONSAIToken,
            description: token,
            then: handleTxError,
            next: {
                type: QUEUE_TYPES.CHATCLIENT,
                func: 'project',
                title: texts.saveDetailsTitle,
                description,
                args: [
                    hash,
                    values,
                    create,
                    err => {
                        isFn(onSubmit) && onSubmit(!err, values)
                        this.setState({
                            message: {
                                content: err || '',
                                header: err ? texts.submitErrorHeader : texts.submitSuccessHeader,
                                showIcon: true,
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

    render = () => <FormBuilder {...{ ...this.props, ...this.state }} />
}
ProjectForm.propTypes = {
    // Project hash
    hash: PropTypes.string,
    values: PropTypes.shape({
        description: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        ownerAddress: PropTypes.string.isRequired,
    }),
}
ProjectForm.defaultProps = {
    closeText: wordsCap.close,
    size: 'tiny',
}