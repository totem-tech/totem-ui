import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { secretStore } from 'oo7-substrate'
import { formatStrTimestamp } from '../utils/time'
import client, { getUser} from '../services/ChatClient'
import storage from '../services/storage'
import { showForm } from '../services/modal'
import { newNotificationBond } from '../services/notification'
import ListFactory from '../components/ListFactory'
import TimeKeepingInviteForm from '../forms/TimeKeepingInvite'

export default class TimeKeepingInviteList extends ReactiveComponent {
    constructor(props) {
        super(props) 

        this.state = {
            listProps: {
                columns: [
                    // notificationId
                    { key: 'userId', title: 'User ID' },
                    { key: '_accepted', textAlign: 'center', title: 'Accepted' },
                    { key: '_tsInvited', textAlign: 'center', title: 'Date Invited' },
                    { key: '_tsAccepted', textAlign: 'center', title: 'Date Accepted' },
                ],
                data: [],
                topLeftMenu: [
                    {
                        content: 'Invite',
                        onClick: ()=> {
                            const { projectHash } = this.props
                            showForm(TimeKeepingInviteForm, {
                                onSubmit: success => success && this.loadInvites(),
                                values: {projectHash}
                            })
                        }
                    }
                ],
                type: 'DataTable'
            }
        }
    }

    componentWillMount() {
        // listen for notifications: timekeeping invitations and responses
        this.tieId = newNotificationBond.tie(({type, childType, data: {projectHash}}) => {
            type === 'time_keeping'
                && childType === 'invitation'
                    && this.props.projectHash === projectHash
                        && this.loadInvites()
        })
    }

    componentWillUnmount() {
        // unsubscribe from notifiers
        newNotificationBond.untie(this.tieId)
    }

    loadInvites() {
        const { projectHash } = this.props
        const { listProps } = this.state
        this.projectHash = projectHash
        if (!projectHash) {
            listProps.emptyMessage = {
                content: 'Select a project to view invites',
                status: 'warning'
            }
            this.setState({listProps})
            return
        }
        client.project(projectHash, null, null, (err, project) => {
            const {id : currentUserId} = getUser() || {}
            const { address } = secretStore()._keys[storage.walletIndex()] || {}
            const isOwner = project.ownerAddress === address
            listProps.emptyMessage = {
                content: err || 'No invites found',
                status: err ? 'error' : 'warning'
            }
            const {timeKeeping} = project || {}
            const { invitations } = timeKeeping || {}
            listProps.data = Object.keys(invitations || {}).filter(userId => isOwner || userId === currentUserId)
                .map(userId =>  {
                    const inv = invitations[userId] || {}
                    return {
                        userId: '@' + userId,
                        _accepted: inv.accepted ? 'Yes' : 'No',
                        _tsInvited: formatStrTimestamp(inv.tsInvited),
                        _tsAccepted: formatStrTimestamp(inv.tsAccepted),
                    }
                })
            this.setState({ listProps})
        })
    }

    render() {
        if (this.projectHash !== this.props.projectHash) this.loadInvites()
        return <ListFactory {...this.state.listProps} />
    }
}
TimeKeepingInviteList.propTypes = {
    projectHash: PropTypes.string
}