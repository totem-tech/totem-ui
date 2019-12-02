import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { formatStrTimestamp } from '../utils/time'
import client from '../services/ChatClient'
import { showForm } from '../services/modal'
import { newNotificationBond } from '../services/notification'
import { DataTable } from '../components/ListFactory'
import TimeKeepingInviteForm from '../forms/TimeKeepingInvite'
import { getAddressName } from '../components/ProjectDropdown'
import { addToQueue, QUEUE_TYPES } from '../services/queue'
import { getSelected, selectedAddressBond } from '../services/identity'
import timeKeeping, { getProjectInvites } from '../services/timeKeeping'
import { UserID } from '../components/buttons'
import { textCapitalize } from '../utils/utils'

const words = {
    accepted: 'accepted',
    invite: 'invite',
    invited: 'invited',
    status: 'status',
}
const wordsCap = textCapitalize(words)
const texts = {
    selectProject: 'Select a project to view invites',
    userId: 'User ID',
    workerIdentity: 'Worker Identity',
}

export default class TimeKeepingInviteList extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.loadInvites = this.loadInvites.bind(this)
        this.state = {
            listProps: {
                columns: [
                    // notificationId
                    { key: '_userId', title: texts.userId },
                    { key: 'addressName', title: texts.workerIdentity },
                    { key: '_status', textAlign: 'center', title: wordsCap.status },
                ],
                data: [],
                rowProps: invite => ({ positive: invite.status === true }),
                topLeftMenu: [{
                    content: wordsCap.invite,
                    onClick: () => {
                        const { projectHash } = this.props
                        showForm(TimeKeepingInviteForm, {
                            onSubmit: success => success && this.loadInvites(),
                            values: { projectHash }
                        })
                    }
                }]
            }
        }
    }

    componentWillMount() {
        const { projectHash } = this.props
        this.tieIdAddress = selectedAddressBond.tie(this.loadInvites)
        this.projectHash = projectHash

        if (!projectHash) return
        this.bond = timeKeeping.invitation.listByProject(projectHash)
        this.tieId = this.bond.tie(this.loadInvites)
    }

    componentWillUnmount() {
        this.bond && this.bond.untie(this.tieId)
        selectedAddressBond.untie(this.tieIdAddress)
    }

    componentWillUpdate() {
        const { projectHash } = this.props
        if (this.projectHash === projectHash) return
        this.projectHash = projectHash
        this.bond && this.bond.untie(this.tieId)
        this.bond = !projectHash ? null : timeKeeping.invitation.listByProject(projectHash)
        this.tieId = this.bond.tie(this.loadInvites)
        !this.bond && this.loadInvites()
    }

    loadInvites() {
        const { projectHash } = this.props
        const { listProps } = this.state
        if (!projectHash) {
            listProps.data = []
            return this.setState({ listProps })
        }

        getProjectInvites(projectHash).then(invites => {
            Array.from(invites).forEach(([_, invite]) => {
                const { status, userId } = invite
                invite._status = status === true ? words.accepted : words.invited
                invite._userId = <UserID {...{ userId }} />
            })
            listProps.data = invites
            this.setState({ listProps })
        })
    }

    render() {
        const { projectHash } = this.props
        const { listProps } = this.state
        listProps.emptyMessage = projectHash ? undefined : {
            content: texts.selectProject,
            status: 'warning'
        }
        return <DataTable {...listProps} />
    }
}
TimeKeepingInviteList.propTypes = {
    projectHash: PropTypes.string,
}