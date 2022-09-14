import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import { Button } from 'semantic-ui-react'
import FormBuilder, { findInput, fillValues } from '../../components/FormBuilder'
import { isFn, arrSort, textEllipsis } from '../../utils/utils'
// services
import { translated } from '../../services/language'
import { showForm } from '../../services/modal'
import { addToQueue, QUEUE_TYPES } from '../../services/queue'
import { unsubscribe } from '../../services/react'
import { getProjects as getUserProjects, openStatuses } from '../activity/activity'
import identities, { getSelected } from '../identity/identity'
import partners, { rxPartners } from '../partner/partner'
import PartnerForm from '../partner/PartnerForm'
import { query, queueables } from './timekeeping'

const notificationType = 'timekeeping'
const childType = 'invitation'
const textsCap = translated({
    activity: 'activity',
    close: 'close',
    identity: 'identity',
    invite: 'invite',
    invitee: 'invitee',
    partner: 'partner',
    myself: 'myself',
    activityLabel: 'select an activity',
    addedToQueueDesc: 'invitation request has been added to background queue',
    addedToQueue: 'added to queue',
    addPartner: 'add new partner',
    formHeader: 'Timekeeping - invitation to join the Team',
    invitedAndAccepted: 'invited and accepted successfully',
    inviteSuccess: 'invitation sent!',
    inviteSuccessNotifyFailed: 'invitation sent but failed to notify user!',
    partnerAcceptedInvite: 'partner already accepted an invitation to the selected activity',
    partnerInvited: 'partner has already been invited to the selected activity',
    partnerLabel: 'select a partner',
    partnerUserIdWarning: 'selected partner does not include an User ID.',
    queueTitleOwnAccept: 'Timekeeping - accept own invitation',
    txFailed: 'transaction failed',
    updateParner: 'update Partner',
    zeroActivityWarning: 'you must have one or more open activities',
}, true)[1]

export default class TimeKeepingInviteForm extends Component {
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
                    label: textsCap.activity,
                    name: 'projectHash',
                    options: [],
                    placeholder: textsCap.activityLabel,
                    required: true,
                    search: true,
                    selection: true,
                    type: 'dropdown',
                    value: '',
                },
                {
                    rxValue: new BehaviorSubject(),
                    label: textsCap.partner,
                    name: 'workerAddress',
                    onChange: this.handlePartnerChange,
                    options: [],
                    placeholder: textsCap.partnerLabel,
                    required: true,
                    search: ['text', 'value', 'description'],
                    selection: true,
                    type: 'dropdown',
                },
                {
                    content: textsCap.addPartner,
                    icon: 'plus',
                    name: 'addpartner',
                    onClick: () => showForm(PartnerForm, {
                        // once partner created update the input with newly created partner's address
                        onSubmit: (success, { address }) => success && findInput(
                            this.state.inputs,
                            'workerAddress'
                        ).rxValue.next(address)
                    }),
                    fluid: true,
                    type: 'button',
                },
            ]
        }

        this.originalSetState = this.setState
        this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
    }

    async componentWillMount() {
        this._mounted = true
        this.subscriptions = {}
        const { values } = this.props
        const { inputs } = this.state
        const proIn = findInput(inputs, 'projectHash')
        proIn.loading = true
        this.setState({ inputs })

        // retrieve project hashes by address
        const projects = await getUserProjects()
        proIn.loading = false
        proIn.options = arrSort(
            Array.from(projects)
                // include only active (open/reopened) projects
                .filter(([_, { status }]) => openStatuses.indexOf(status) >= 0)
                .map(([pId, project]) => ({
                    key: pId,
                    text: project.name || textEllipsis(pId, 40),
                    value: pId,
                    project,
                })),
            'text'
        )
        proIn.invalid = proIn.options.length === 0
        proIn.message = !proIn.invalid ? null : {
            content: textsCap.zeroActivityWarning,
            status: 'error'
        }

        values && fillValues(inputs, values)
        this.setState({ inputs })

        // automatically update when partner list changes
        this.subscriptions.partners = rxPartners.subscribe(map => {
            const { inputs } = this.state
            const partnerIn = findInput(inputs, 'workerAddress')
            const { address: selectedAddress, name } = getSelected()
            const options = Array.from(map)
                .map(([address, { name, userId }]) => address !== selectedAddress && ({
                    description: userId && '@' + userId,
                    key: address,
                    text: name,
                    value: address
                }))
                .concat({
                    // add selected identity so that project owner can invite themself
                    description: textsCap.myself,
                    key: selectedAddress + name,
                    text: name,
                    value: selectedAddress,
                })
                .filter(Boolean)
            // populate partner's list
            partnerIn.options = arrSort(options, 'text')
            this.setState({ inputs })
        })
    }

    componentWillUnmount() {
        this._mounted = false
        unsubscribe(this.subscriptions)
    }

    handlePartnerChange = async (_, { projectHash: projectId, workerAddress }) => {
        const { inputs } = this.state
        const partnerIn = findInput(inputs, 'workerAddress')
        const partner = partners.get(workerAddress)
        const { userId } = partner || {}
        // do not require user id if selected address belongs to user
        const requireUserId = !identities.get(workerAddress) && partner && !userId
        partnerIn.invalid = requireUserId
        partnerIn.loading = !!projectId && !!workerAddress && !requireUserId
        partnerIn.message = !requireUserId ? null : {
            content: (
                <p>
                    {textsCap.partnerUserIdWarning} <br />
                    <Button
                        basic
                        content={textsCap.updateParner}
                        onClick={e => e.preventDefault() | showForm(PartnerForm, {
                            onSubmit: (_, { address, userId }) => {
                                partnerIn.invalid = !userId
                                userId && partnerIn.rxValue.next(address)
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
        const [invitedAr, acceptedAr] = await Promise.all([
            query.worker.listInvited(projectId),
            query.worker.listWorkers(projectId),
        ])
        const accepted = acceptedAr.includes(workerAddress)
        const invited = invitedAr.includes(workerAddress)
        /*
         * accepted values:
         * null => not yet invited or rejected
         * true => invited and already accepted
         * false => invited but hasn't responded
         */
        partnerIn.loading = false
        // allows (re-)invitation if user hasn't accepted (!== true) invitation
        partnerIn.invalid = !!accepted
        if (accepted || invited) {
            partnerIn.message = {
                content: accepted ? textsCap.partnerAcceptedInvite : textsCap.partnerInvited,
                status: accepted ? 'error' : 'warning'
            }
        }
        this.setState({ inputs, submitDisabled: false })
    }

    handleSubmit(e, values) {
        const { onSubmit } = this.props
        const { inputs } = this.state
        const { projectHash: projectId, workerAddress } = values
        const { project } = findInput(inputs, 'projectHash')
            .options.find(x => x.value === projectId)
        const { name: projectName, ownerAddress } = project
        const ownIdentity = identities.get(workerAddress)
        const isOwner = ownIdentity && workerAddress === ownerAddress
        const { name, userId } = ownIdentity || partners.get(workerAddress)
        this.setState({
            submitDisabled: true,
            loading: true,
            message: {
                content: textsCap.addedToQueueDesc,
                header: textsCap.addedToQueue,
                icon: true,
                status: 'loading'
            }
        })

        const selfInviteThen = success => {
            this.setState({
                submitDisabled: false,
                loading: false,
                success,
                message: {
                    header: success ? textsCap.invitedAndAccepted : textsCap.txFailed,
                    icon: true,
                    status: success ? 'success' : 'error'
                }
            })
            isFn(onSubmit) && onSubmit(success, values)
        }
        const acceptOwnInvitationTask = queueables.worker.accept(projectId, workerAddress, true, {
            title: textsCap.queueTitleOwnAccept,
            description: `${textsCap.identity}: ${name}`,
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
                { projectHash: projectId, projectName, workerAddress },
                err => {
                    this.setState({
                        submitDisabled: false,
                        loading: false,
                        success: !err,
                        message: {
                            header: !err ? textsCap.inviteSuccess : textsCap.inviteSuccessNotifyFailed,
                            content: err || '',
                            icon: true,
                            status: !err ? 'success' : 'warning',
                        }
                    })
                    isFn(onSubmit) && onSubmit(!err, values)
                }
            ],
        }

        const extraProps = {
            title: textsCap.formHeader,
            description: `${textsCap.invitee}: ${name}`,
            then: isOwner ? selfInviteThen : (success, err) => {
                if (success) return
                this.setState({
                    submitDisabled: false,
                    loading: false,
                    message: {
                        header: textsCap.txFailed,
                        content: `${err}`,
                        icon: true,
                        status: 'error',
                    }
                })
            },
            next: isOwner ? null : (ownIdentity ? acceptOwnInvitationTask : notifyWorkerTask)
        }
        addToQueue(queueables.worker.add(
            projectId,
            ownerAddress,
            workerAddress,
            extraProps,
        ))
    }

    render = () => <FormBuilder {...{ ...this.props, ...this.state }} />
}
TimeKeepingInviteForm.propTypes = {
    values: PropTypes.shape({
        projectHash: PropTypes.string,
        userIds: PropTypes.array,
        workerAddress: PropTypes.string,
    })
}
TimeKeepingInviteForm.defaultProps = {
    closeText: textsCap.close,
    header: textsCap.formHeader,
    size: 'tiny',
    submitText: textsCap.invite,
}