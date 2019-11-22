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
import { getSelected } from '../services/identity'

const notifyType = 'time_keeping'
const childType = 'invitation'
export default class TimeKeepingInviteList extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.state = {
            listProps: {
                columns: [
                    // notificationId
                    { key: '_userId', title: 'User ID' },
                    { key: '_workerIdentity', title: 'Worker Identity' },
                    { key: 'status', textAlign: 'center', title: 'status' },
                    { key: '_tsInvited', textAlign: 'center', title: 'Date Invited' },
                    { key: '_tsAccepted', textAlign: 'center', title: 'Date Accepted' },
                ],
                data: [],
                selectable: true,
                rowProps: item => {
                    // formal invitation accepted
                    if (item.status === 'invitation accepted') return { positive: true }
                    // identity or formal invitation rejected
                    if (item.status.endsWith('rejected')) return { error: true }
                    // invitation in progress
                    if (!!item.status) return { warning: true }
                },
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
                topRightMenu: [
                    {
                        content: 'Send Formal Invitation',
                        onClick: this.sendFormalInvitation.bind(this)
                    }
                ],
                type: 'DataTable'
            }
        }
    }

    componentWillMount() {
        // listen for notifications: timekeeping invitations and responses
        this.tieId = newNotificationBond.tie(({ type, childType, data: { projectHash } }) => {
            type === 'time_keeping'
                && projectHash && projectHash === this.props.projectHash
                && this.loadInvites()
        })
    }

    componentWillUnmount() {
        // unsubscribe from notifiers
        newNotificationBond.untie(this.tieId)
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

        client.project(projectHash, null, null, (_, project = {}) => {
            client.timeKeepingInvitations(projectHash, (err, invitations) => {
                const { address } = getSelected()
                const { ownerAddress } = project
                const isOwner = ownerAddress && ownerAddress === address
                listProps.selectable = !!isOwner
                listProps.emptyMessage = {
                    content: err || 'No invites found',
                    status: err ? 'error' : 'warning'
                }
                Array.from(invitations).forEach(([userId, invitation]) => {
                    if (!invitation) return
                    const { tsAccepted, tsInvited, workerAddress } = invitation
                    invitation._userId = '@' + userId
                    invitation._workerIdentity = getAddressName(workerAddress)
                    invitation._tsInvited = formatStrTimestamp(tsInvited)
                    invitation._tsAccepted = formatStrTimestamp(tsAccepted)
                })
                listProps.data = invitations
                this.setState({ isOwner, listProps, project })
            })
        })
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