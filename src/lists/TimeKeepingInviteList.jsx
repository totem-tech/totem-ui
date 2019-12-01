import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { formatStrTimestamp } from '../utils/time'
import client from '../services/ChatClient'
import { showForm } from '../services/modal'
import { newNotificationBond } from '../services/notification'
import ListFactory from '../components/ListFactory'
import TimeKeepingInviteForm from '../forms/TimeKeepingInvite'
import { getAddressName } from '../components/ProjectDropdown'
import { addToQueue, QUEUE_TYPES } from '../services/queue'
import { getSelected, selectedAddressBond } from '../services/identity'
import timeKeeping, { getInvites } from '../services/timeKeeping'

const notifyType = 'time_keeping'
const childType = 'invitation'
export default class TimeKeepingInviteList extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.state = {
            listProps: {
                columns: [
                    // notificationId
                    // { key: '_userId', title: 'User ID' },
                    { key: 'addressName', title: 'Worker Identity' },
                    { key: '_status', textAlign: 'center', title: 'status' },
                ],
                data: [],
                rowProps: invite => ({ positive: invite.status === true }),
                topLeftMenu: [
                    {
                        content: 'Invite',
                        onClick: () => {
                            const { projectHash } = this.props
                            showForm(TimeKeepingInviteForm, {
                                onSubmit: success => success && this.loadInvites(),
                                values: { projectHash }
                            })
                        }
                    }
                ],
                type: 'DataTable'
            }
        }
    }

    componentWillMount() {
        this.tieIdAddress = selectedAddressBond.tie(() => this.loadInvites())
    }

    componentWillUnmount() {
        selectedAddressBond.untie(this.tieIdAddress)
    }

    sendFormalInvitation(workerIds) {
        const { projectHash } = this.props
        const { listProps: { data }, project: { name: projectName, ownerAddress, userId: ownerId } } = this.state
        workerIds.filter(id => !!data.get(id).workerAddress).forEach(workerId => {
            const { workerAddress } = data.get(workerId)
            addToQueue({
                type: QUEUE_TYPES.BLOCKCHAIN,
                func: 'timeKeeping_invitation_add',
                args: [projectHash, ownerAddress, workerAddress],
                title: 'Time Keeping - send formal invitation',
                description: `Worker ID: ${workerId} | Identity: ${workerAddress}`,
                // ToDo: validate if blockchain storage updated successfully. (requires queue service update)
                next: {
                    type: QUEUE_TYPES.CHATCLIENT,
                    func: 'notify',
                    args: [
                        [workerId],
                        notifyType,
                        childType,
                        null,
                        { projectHash, projectName, workerAddress },
                        err => !err && this.loadInvites()
                    ]
                }
            })
        })
    }

    loadInvites() {
        const { projectHash } = this.props
        const { listProps } = this.state
        this.projectHash = projectHash
        if (!projectHash) {
            listProps.data = []
            return this.setState({ listProps })
        }

        // client.project(projectHash, null, false, (err, project) => {
        //     const { address } = getSelected()
        //     const { ownerAddress } = project || {}
        //     const isOwner = ownerAddress === address
        // })
        // timeKeeping.invitation.listByProject()
        getInvites(projectHash).then(invites => {
            Array.from(invites).forEach(([_, invite]) => {
                invite._status = invite.status === true ? 'accepted' : 'invited'
            })
            listProps.data = invites
            this.setState({ listProps })
        }, console.log)
    }

    render() {
        const { projectHash } = this.props
        const { listProps } = this.state
        listProps.emptyMessage = projectHash ? undefined : {
            content: 'Select a project to view invites',
            status: 'warning'
        }
        if (this.projectHash !== this.props.projectHash) setTimeout(() => this.loadInvites())

        return <ListFactory {...listProps} />
    }
}
TimeKeepingInviteList.propTypes = {
    projectHash: PropTypes.string
}