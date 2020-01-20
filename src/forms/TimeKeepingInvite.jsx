import React from 'react'
import PropTypes from 'prop-types'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import { Button } from 'semantic-ui-react'
import FormBuilder, { findInput, fillValues } from '../components/FormBuilder'
import PartnerForm from '../forms/Partner'
import { getUser } from '../services/ChatClient'
import identities, { getSelected } from '../services/identity'
import { showForm } from '../services/modal'
import partners from '../services/partners'
import { getProjects, openStatuses } from '../services/project'
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
                    onChange: this.handlePartnerChange,
                    options: [],
                    placeholder: 'Select a partner',
                    required: true,
                    search: ['text', 'value', 'description'],
                    selection: true,
                    type: 'dropdown',
                },
                {
                    content: 'Add New Partner',
                    icon: 'plus',
                    name: 'addpartner',
                    onClick: () => showForm(PartnerForm, {
                        onSubmit: (success, { address }) => {
                            // once partner created update the input with newly created partner's address
                            success && findInput(this.state.inputs, 'workerAddress').bond.changed(address)
                        }
                    }),
                    fluid: true,
                    type: 'button',
                },
            ]
        }

        this.originalSetState = this.setState
        this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
    }

    componentWillMount() {
        this._mounted = true
        const { inputs } = this.state
        const proIn = findInput(inputs, 'projectHash')
        proIn.loading = true
        this.setState({ inputs })

        // automatically update when addressbook changes
        this.tieId = partners.bond.tie(() => {
            const { inputs } = this.state
            const partnerIn = findInput(inputs, 'workerAddress')
            const { address, name } = getSelected()
            // populate partner's list
            partnerIn.options = arrSort(
                Array.from(partners.getAll()).map(([address, { name, userId }]) => ({
                    description: userId && '@' + userId,
                    key: address,
                    text: name,
                    value: address
                })).concat({
                    // add selected identity so that project owner can invite themself
                    description: 'Myself',
                    key: address + name,
                    text: name,
                    value: address,
                }),
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
                    .filter(([_, { status }]) => openStatuses.indexOf(status) >= 0)
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

        fillValues(inputs, this.props.values)
    }

    componentWillUnmount() {
        this._mounted = false
        partners.bond.untie(this.tieId)
    }

    handlePartnerChange = (_, { projectHash, workerAddress }) => {
        const { inputs } = this.state
        const partnerIn = findInput(inputs, 'workerAddress')
        const partner = partners.get(workerAddress)
        const { userId } = partner || {}
        // do not require user id if selected address belongs to user
        const requireUserId = !identities.get(workerAddress) && !userId
        partnerIn.invalid = requireUserId
        partnerIn.loading = !!projectHash && !!workerAddress && !requireUserId
        partnerIn.message = !requireUserId ? null : {
            content: (
                <p>
                    Selected partner does not include an User ID. <br />
                    <Button
                        basic
                        content='Update Partner'
                        onClick={e => e.preventDefault() | showForm(PartnerForm, {
                            onSubmit: (_, { address, userId }) => {
                                partnerIn.invalid = !userId
                                userId && partnerIn.bond.changed(address)
                            },
                            values: partner,
                        })}
                    />
                </p>
            ),
            status: 'error'
        }
        this.setState({ inputs })
        if (!partnerIn.loading) return

        // check if partner is already invited or accepted
        timeKeeping.worker.accepted(projectHash, workerAddress).then(accepted => {
            /*
             * accepted values:
             * null => not yet invited or rejected
             * true => invited and already accepted
             * false => invited but hasn't responded
             */
            partnerIn.loading = false
            // allows (re-)invitation if user hasn't accepted (!== true) invitation
            partnerIn.invalid = !!accepted
            if (accepted === null) return this.setState({ inputs })

            partnerIn.message = {
                content: accepted ? 'Partner already accepted invitation to selected project' : 'Partner has already been invited to selected project',
                status: accepted ? 'error' : 'warning'
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
        const ownIdentity = identities.get(workerAddress)
        const { name, userId } = ownIdentity || partners.get(workerAddress)
        this.setState({
            submitDisabled: true,
            loading: true,
            message: {
                content: 'Invitation request has been added to background queue',
                header: 'Added to queue',
                showIcon: true,
                status: 'loading'
            }
        })

        const acceptOwnInvitationTask = {
            address: workerAddress, // for automatic balance check 
            type: QUEUE_TYPES.BLOCKCHAIN,
            func: 'timeKeeping_worker_accept',
            args: [projectHash, workerAddress, true],
            title: 'Time Keeping - accept own invitation',
            description: 'Identity: ' + name,
            then: success => {
                this.setState({
                    submitDisabled: false,
                    loading: false,
                    success,
                    message: {
                        header: success ? 'Invitated and accepted successfully' : 'Transaction failed',
                        showIcon: true,
                        status: success ? 'success' : 'error'
                    }
                })
                isFn(onSubmit) && onSubmit(success, values)
            },
        }
        const notifyWorkerTask = {
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
                        message: {
                            header: !err ? 'Invitation sent!' : 'Invitation sent but failed to notify user!',
                            content: err || '',
                            showIcon: true,
                            status: !err ? 'success' : 'warning',
                        }
                    })
                    isFn(onSubmit) && onSubmit(!err, values)
                }
            ],
        }

        addToQueue({
            address: ownerAddress, // for balance check
            type: QUEUE_TYPES.BLOCKCHAIN,
            func: 'timeKeeping_worker_add',
            args: [projectHash, ownerAddress, workerAddress],
            title: 'Time Keeping - Invite Team Member',
            description: 'Invitee: ' + name,
            next: !!ownIdentity ? acceptOwnInvitationTask : notifyWorkerTask
        })
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
    header: 'Time Keeping: Invite Team Member',
    size: 'tiny',
    subheader: '',
    submitText: 'Invite',
}