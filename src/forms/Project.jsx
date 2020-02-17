import React, { Component } from 'react'
import PropTypes from 'prop-types'
import Currency from '../components/Currency'
import FormBuilder, { fillValues, findInput } from '../components/FormBuilder'
import { arrSort, generateHash, isFn } from '../utils/utils'
import identities, { getSelected } from '../services/identity'
import { translated } from '../services/language'
import { getProjects, tasks } from '../services/project'
import { addToQueue, QUEUE_TYPES } from '../services/queue'

const [words, wordsCap] = translated({
    cancel: 'cancel',
    close: 'close',
    create: 'create',
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
    submitErrorHeader: 'Request failed',
    submitQueuedMsg: 'Your request has been added to background queue. You may close the dialog now.',
    submitQueuedHeader: 'Activity has been queued',
    submitSuccessHeader: 'Activity saved successfully',
    submitTitleCreate: 'Create activity',
    submitTitleUpdate: 'Update activity',
})

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
        const { hash, header } = this.props
        const { inputs } = this.state
        const values = this.props.values || {}
        values.ownerAddress = values.ownerAddress || getSelected().address
        fillValues(inputs, values)
        this.setState({
            inputs,
            header: header || (hash ? texts.formHeaderUpdate : texts.formHeaderCreate),
            submitText: hash ? wordsCap.update : wordsCap.create,
        })

        // populate and auto update ownerAddress dropdown options
        this.tieId = identities.bond.tie(() => {
            const options = identities.getAll().map(({ address, name }) => ({
                description: <Currency address={address} className='description' />,
                key: address,
                text: name,
                value: address
            }))
            findInput(inputs, 'ownerAddress').options = arrSort(options, 'text')
            this.setState({ inputs })
        })
    }

    componentWillUnmount = () => {
        this._mounted = false
        identities.bond.untie(this.tieId)
    }

    handleSubmit = (e, values) => {
        const { onSubmit, hash: existingHash } = this.props
        const create = !existingHash
        const hash = existingHash || generateHash(values)
        const { name: projectName, ownerAddress } = values
        const title = create ? texts.submitTitleCreate : texts.submitTitleUpdate
        const description = `${texts.nameLabel}: ${projectName}`
        const message = {
            content: texts.submitQueuedMsg,
            header: texts.submitQueuedHeader,
            status: 'loading',
            showIcon: true
        }

        this.setState({
            message,
            submitDisabled: true
        })

        console.log({ values })
        const clientTask = {
            type: QUEUE_TYPES.CHATCLIENT,
            func: 'project',
            title,
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
        }

        // Send transaction to blockchain first, then add to external storage
        const blockchainTask = tasks.add(ownerAddress, hash, {
            title,
            description,
            next: clientTask
        })

        addToQueue(create ? blockchainTask : clientTask)
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