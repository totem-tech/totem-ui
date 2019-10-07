import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { secretStore } from 'oo7-substrate'
import FormBuilder, { findInput, fillValues} from '../components/FormBuilder'
import client, { getUser } from '../services/ChatClient'
import storage from '../services/storage'
import { arrUnique, isFn } from '../utils/utils'

const notificationType = 'time_keeping'
const childType = 'invitation'

export default class TimeKeepingInviteForm extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.state = {
            loading: false,
            message: {},
            inputs: [
                {
                    label: 'Project',
                    name: 'projectHash',
                    options: [],
                    placeholder: 'Select a project',
                    required: true,
                    search: true,
                    selection: true,
                    type: 'dropdown',
                    value: '',
                },
                {
                    allowAdditions: true,
                    label: 'User',
                    multiple: true,
                    name: 'userIds',
                    noResultsMessage: 'Type user ID and press enter to add',
                    onAddItem: this.handleAddUser.bind(this),
                    options: [],
                    placeholder: 'Enter User ID(s)',
                    required: true,
                    search: true,
                    selection: true,
                    type: 'dropdown',
                    value: [],
                }
            ]
        }

        fillValues(this.state.inputs, props.values)
    }

    componentWillMount() {
        const { inputs } = this.state
        // retrieve owner projects
        const {address: ownerAddress} = secretStore()._keys[storage.walletIndex()] || {}
        const proIn = findInput(inputs, 'projectHash') || {}
        proIn.loading = true
        this.setState({inputs})
        client.projectsSearch({ownerAddress}, (err, projects) => {
            proIn.loading = false
            proIn.options = Array.from(projects).filter(([_, {status}]) => [0, 1].indexOf(status) >= 0)
                .map(([hash, {name}]) => ({
                    key: hash, 
                    text: name,
                    value: hash,
                }))

            proIn.invalid = !!err || proIn.options.length === 0
            proIn.message = !proIn.invalid ? {} : {
                header: 'No projects found',
                content: err || 'You must have one or more active projects',
                showIcon: true,
                status: 'error' 
            }

            this.setState({inputs})
        })
    }

    handleAddUser(e, data) {
        const {value: userId} = data
        const { inputs } = this.state
        const idsIn = findInput(inputs, 'userIds')
        idsIn.loading = true
        this.setState({inputs})
        client.idExists(userId, exists => {
            idsIn.loading = false
            idsIn.invalid = !exists
            idsIn.message = exists ? {} : {
                content: `User ID "${userId}" not found`,
                showIcon: true,
                status: 'error',
            }
            
            if (exists && (getUser() || {}).id !== userId) {
                idsIn.value = arrUnique(idsIn.value)
                idsIn.options = idsIn.value.map(id => ({
                    key: id,
                    text: id,
                    value: id,
                }))
            } else {
                // remove from values
                idsIn.value.splice(idsIn.value.indexOf(userId), 1)
            }

            this.setState({inputs})
        })
    }

    handleSubmit(e, values) {
        const { onSubmit } = this.props
        const {inputs} = this.state
        const { projectHash, userIds } = values
        const projectName = findInput(inputs, 'projectHash').options.find(x => x.value === projectHash).text
        this.setState({loading: true})
        client.notify(userIds, notificationType, childType, projectName, {projectHash}, err => {
            this.setState({
                loading: false,
                message: !err ? {
                    header: 'Notificaton sent!',
                    showIcon: true,
                    status: 'success',
                } : {
                    header: 'Submission Failed!',
                    content: err,
                    showIcon: true,
                    status: 'error',
                }
            })
            isFn(onSubmit) && onSubmit(!err, values)
        })
    }

    render() {
        const {inputs, loading, message} = this.state
        return (
            <FormBuilder
                { ...this.props}
                {...{
                    inputs,
                    loading,
                    message,
                    onSubmit: this.handleSubmit.bind(this),
                }}
            />
        )
    }
}
TimeKeepingInviteForm.propTypes = {
    values: PropTypes.shape({
        projectHash: PropTypes.string,
        userIds: PropTypes.array
    })
}
TimeKeepingInviteForm.defaultProps = {
    header: 'Time Keeping: Invite User(s)',
    size: 'tiny',
    submitText: 'Invite'
}
