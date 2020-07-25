import React from 'react'
import PropTypes from 'prop-types'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import { Button } from 'semantic-ui-react'
import FormBuilder, { findInput, fillValues } from '../components/FormBuilder'
import PartnerForm from '../forms/Partner'
import { isFn, arrSort } from '../utils/utils'
// services
import identities, { getSelected } from '../services/identity'
import { translated } from '../services/language'
import { showForm } from '../services/modal'
import partners from '../services/partner'
import { getProjects, openStatuses } from '../services/project'
import { addToQueue, QUEUE_TYPES } from '../services/queue'
import timeKeeping, { query, workerTasks } from '../services/timeKeeping'

const notificationType = 'time_keeping'
const childType = 'invitation'
// ToDo: translate
const [words, wordsCap] = translated({
    activity: 'activity',
    close: 'close',
    identity: 'identity',
    invite: 'invite',
    invitee: 'invitee',
    partner: 'partner',
    myself: 'myself',
}, true)
const [texts] = translated({
    activityLabel: 'Select an activity',
    addedToQueueDesc: 'Invitation request has been added to background queue',
    addedToQueue: 'Added to queue',
    addPartner: 'Add New Partner',
    formHeader: 'Timekeeping - Invitation to join the Team',
    invitedAndAccepted: 'Invited and accepted successfully',
    inviteSuccess: 'Invitation sent!',
    inviteSuccessNotifyFailed: 'Invitation sent but failed to notify user!',
    partnerAcceptedInvite: 'Partner already accepted an invitation to the selected activity',
    partnerInvited: 'Partner has already been invited to the selected activity',
    partnerLabel: 'Select a partner',
    partnerUserIdWarning: 'Selected partner does not include an User ID.',
    queueTitleOwnAccept: 'Timekeeping - accept own invitation',
    queueTitleInviteTeamMember: 'Timekeeping - Invitation to join the Team',
    txFailed: 'Transaction failed',
    updateParner: 'Update Partner',
    zeroActivityWarning: 'You must have one or more open activities',
})

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
                    label: wordsCap.activity,
                    name: 'projectHash',
                    options: [],
                    placeholder: texts.activityLabel,
                    required: true,
                    search: true,
                    selection: true,
                    type: 'dropdown',
                    value: '',
                },
                {
                    bond: new Bond(),
                    label: wordsCap.partner,
                    name: 'workerAddress',
                    onChange: this.handlePartnerChange,
                    options: [],
                    placeholder: texts.partnerLabel,
                    required: true,
                    search: ['text', 'value', 'description'],
                    selection: true,
                    type: 'dropdown',
                },
                {
                    content: texts.addPartner,
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
            const options = Array.from(partners.getAll()).map(([address, { name, userId }]) => ({
                description: userId && '@' + userId,
                key: address,
                text: name,
                value: address
            })).concat({
                // add selected identity so that project owner can invite themself
                description: wordsCap.myself,
                key: address + name,
                text: name,
                value: address,
            })
            // populate partner's list
            partnerIn.options = arrSort(options, 'text')
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
                content: texts.zeroActivityWarning,
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
                    {texts.partnerUserIdWarning} <br />
                    <Button
                        basic
                        content={texts.updateParner}
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
        this.setState({ inputs, submitDisabled: partnerIn.loading })
        if (!partnerIn.loading) return

        // check if partner is already invited or accepted
        query.worker.accepted(projectHash, workerAddress).then(accepted => {
            /*
             * accepted values:
             * null => not yet invited or rejected
             * true => invited and already accepted
             * false => invited but hasn't responded
             */
            partnerIn.loading = false
            // allows (re-)invitation if user hasn't accepted (!== true) invitation
            partnerIn.invalid = !!accepted
            if (accepted !== null) {
                partnerIn.message = {
                    content: accepted ? texts.partnerAcceptedInvite : texts.partnerInvited,
                    status: accepted ? 'error' : 'warning'
                }
            }
            this.setState({ inputs, submitDisabled: false })
        })
    }

    handleSubmit(e, values) {
        const { onSubmit } = this.props
        const { inputs } = this.state
        const { projectHash, workerAddress } = values
        const { project } = findInput(inputs, 'projectHash').options.find(x => x.value === projectHash)
        const { name: projectName, ownerAddress } = project
        const ownIdentity = identities.get(workerAddress)
        const isOwner = ownIdentity && workerAddress === ownerAddress
        const { name, userId } = ownIdentity || partners.get(workerAddress)
        this.setState({
            submitDisabled: true,
            loading: true,
            message: {
                content: texts.addedToQueueDesc,
                header: texts.addedToQueue,
                showIcon: true,
                status: 'loading'
            }
        })

        const selfInviteThen = success => {
            this.setState({
                submitDisabled: false,
                loading: false,
                success,
                message: {
                    header: success ? texts.invitedAndAccepted : texts.txFailed,
                    showIcon: true,
                    status: success ? 'success' : 'error'
                }
            })
            isFn(onSubmit) && onSubmit(success, values)
        }
        const acceptOwnInvitationTask = workerTasks.accept(projectHash, workerAddress, true, {
            title: texts.queueTitleOwnAccept,
            description: `${wordsCap.identity}: ${name}`,
            then: selfInviteThen,
        })
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
                            header: !err ? texts.inviteSuccess : inviteSuccessNotifyFailed,
                            content: err || '',
                            showIcon: true,
                            status: !err ? 'success' : 'warning',
                        }
                    })
                    isFn(onSubmit) && onSubmit(!err, values)
                }
            ],
        }

        addToQueue(workerTasks.add(projectHash, ownerAddress, workerAddress, {
            title: texts.queueTitleInviteTeamMember,
            description: `${wordsCap.invitee}: ${name}`,
            then: isOwner && selfInviteThen,
            next: isOwner ? null : (ownIdentity ? acceptOwnInvitationTask : notifyWorkerTask)
        }))
    }

    render = () => <FormBuilder {...{ ...this.props, ...this.state }} />
}
TimeKeepingInviteForm.propTypes = {
    values: PropTypes.shape({
        projectHash: PropTypes.string,
        userIds: PropTypes.array
    })
}
TimeKeepingInviteForm.defaultProps = {
    closeText: wordsCap.close,
    header: texts.formHeader,
    size: 'tiny',
    submitText: wordsCap.invite,
}