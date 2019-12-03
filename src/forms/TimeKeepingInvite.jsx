import React from 'react'
import PropTypes from 'prop-types'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import { Button } from 'semantic-ui-react'
import FormBuilder, { findInput, fillValues } from '../components/FormBuilder'
import PartnerForm from '../forms/Partner'
import { getProjects } from '../services/project'
import { getUser } from '../services/ChatClient'
import { getSelected } from '../services/identity'
import addressbook from '../services/partners'
import { showForm } from '../services/modal'
import { addToQueue, QUEUE_TYPES } from '../services/queue'
import timeKeeping from '../services/timeKeeping'
import { isFn, arrSort } from '../utils/utils'

const notificationType = 'time_keeping'
const childType = 'invitation'

export default class TimeKeepingInviteForm extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.state = {
            submitDisabled: undefined,
            loading: false,
            message: {},
            onSubmit: this.handleSubmit.bind(this),
            success: false,
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
                    bond: new Bond(),
                    label: 'Partner',
                    name: 'workerAddress',
                    onChange: this.handlePartnerChange.bind(this),
                    options: [],
                    placeholder: 'Select a partner',
                    search: true,
                    selection: true,
                    type: 'dropdown',
                    validate: (_, { value }) => {
                        if (!value) return
                        const { userId } = addressbook.get(value)
                        const isOwnId = (getUser() || {}).id === userId
                        return !isOwnId ? null : 'You cannot invite yourself'
                    },
                },
                {
                    content: 'Add New Partner',
                    icon: 'plus',
                    name: 'addpartner',
                    onClick: () => showForm(PartnerForm),
                    fluid: true,
                    type: 'button',
                }
            ]
        }

        fillValues(this.state.inputs, props.values)
    }

    componentWillMount() {
        const { inputs } = this.state
        // retrieve owner projects
        const { address: ownerAddress } = getSelected()
        const proIn = findInput(inputs, 'projectHash') || {}
        proIn.loading = true
        this.setState({ inputs })

        // automatically update when addressbook changes
        this.tieId = addressbook.bond.tie(() => {
            const { inputs } = this.state
            const partnerIn = findInput(inputs, 'workerAddress')
            // populate partner's list
            partnerIn.options = arrSort(
                Array.from(addressbook.getAll()).map(([address, { name, userId }]) => ({
                    description: userId && '@' + userId,
                    key: address,
                    text: name,
                    value: address
                })),
                'text'
            )
            this.setState({ inputs })
        })

        // retrieve project hashes by address
        getProjects().then(projects => {
            proIn.loading = false
            proIn.options = arrSort(
                Array.from(projects)
                    // include only active (open/reopened) projects
                    .filter(([_, { status }]) => [0, 1].indexOf(status) >= 0)
                    .map(([hash, project]) => ({
                        key: hash,
                        text: project.name,
                        value: hash,
                        project,
                    })),
                'text'
            )

            proIn.invalid = proIn.options.length === 0
            proIn.message = !proIn.invalid ? null : {
                content: 'You must have one or more active projects',
                status: 'error'
            }
            this.setState({ inputs })
        })
    }

    componentWillUnmount() {
        addressbook.bond.untie(this.tieId)
    }

    handlePartnerChange(_, { projectHash, workerAddress }) {
        const { inputs } = this.state
        const partnerIn = findInput(inputs, 'workerAddress')
        const partner = addressbook.get(workerAddress)
        const { userId } = partner
        partnerIn.invalid = !userId
        partnerIn.loading = !!(userId && projectHash && workerAddress)
        partnerIn.message = !!userId ? null : {
            content: (
                <p>
                    Selected partner does not include an User ID. <br />
                    <Button
                        basic
                        content='Update Partner'
                        onClick={e => e.preventDefault() | showForm(PartnerForm, {
                            onSubmit: (success, { address, userId }) => {
                                if (!success || !userId) return
                                // partnerIn
                                partnerIn.bond.changed(address)
                            },
                            values: partner,
                        })}
                    />
                </p>
            ),
            status: 'error'
        }
        this.setState({ inputs })

        // check if partner is already invited or accepted
        partnerIn.loading && timeKeeping.worker.accepted(projectHash, workerAddress).then(accepted => {
            partnerIn.loading = false
            if (accepted) {
                partnerIn.invalid = true
                partnerIn.message = {
                    content: 'Partner already accepted invitation to selected project',
                    status: 'error'
                }
            } else if (accepted === false) {
                // invited but hasn't accepted yet
                partnerIn.message = {
                    content: 'Partner has already been invited to selected project',
                    status: 'warning'
                }
            }
            this.setState({ inputs })
        })
    }

    handleSubmit(e, values) {
        const { onSubmit } = this.props
        const { inputs } = this.state
        const { projectHash, workerAddress } = values
        const { project } = findInput(inputs, 'projectHash').options.find(x => x.value === projectHash)
        const { name: projectName, ownerAddress } = project
        const { userId } = addressbook.get(workerAddress)
        this.setState({
            submitDisabled: true,
            loading: true,
            message: {
                content: 'Invitation request has been added to background queue. You will be notified shortly of the progress.',
                header: 'Added to queue',
                showIcon: 'true',
                status: 'success'
            }
        })

        const queueProps = {
            type: QUEUE_TYPES.BLOCKCHAIN,
            func: 'timeKeeping_invitation_add',
            args: [projectHash, ownerAddress, workerAddress],
            title: 'Time Keeping - Invite Worker',
            description: 'Worker',
            next: {
                type: QUEUE_TYPES.CHATCLIENT,
                func: 'notify',
                args: [
                    [userId],
                    notificationType,
                    childType,
                    null,
                    { projectHash, projectName, workerAddress },
                    err => {
                        this.setState({
                            submitDisabled: false,
                            loading: false,
                            success: !err,
                            message: !err ? {
                                content: 'Notification containing an invitation has been sent to the selected partner',
                                header: 'Invitation sent!',
                                showIcon: true,
                                status: 'success',
                            } : {
                                    header: 'Notification Failed!',
                                    content: 'Blockchain invitation sent but failed to notify user. Error: ' + err,
                                    showIcon: true,
                                    status: 'warning',
                                }
                        })
                        isFn(onSubmit) && onSubmit(!err, values)
                    }],
            }
        }
        addToQueue(queueProps)
    }

    render() {
        return <FormBuilder {...{ ...this.props, ...this.state }} />
    }
}
TimeKeepingInviteForm.propTypes = {
    values: PropTypes.shape({
        projectHash: PropTypes.string,
        userIds: PropTypes.array
    })
}
TimeKeepingInviteForm.defaultProps = {
    closeText: 'Close',
    header: 'Time Keeping: Invite Worker',
    size: 'tiny',
    subheader: '',
    submitText: 'Invite',
}