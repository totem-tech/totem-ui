import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { showForm } from '../services/modal'
import { DataTable } from '../components/ListFactory'
import TimeKeepingInviteForm from '../forms/TimeKeepingInvite'
import { selectedAddressBond } from '../services/identity'
import timeKeeping, { getProjectWorkers } from '../services/timeKeeping'
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
    unknownUser: 'Unknown user',
    workerIdentity: 'Worker Identity',
}

export default class TimeKeepingInviteList extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.loadInvites = this.loadInvites.bind(this)
        this.state = {
            listProps: {
                columns: [
                    { key: '_userId', title: texts.userId },
                    { key: 'addressName', title: texts.workerIdentity },
                    { key: '_status', textAlign: 'center', title: wordsCap.status },
                ],
                data: [],
                searchExtraKeys: ['address', 'userId'],
                rowProps: ({ accepted }) => ({ positive: accepted }),
                topLeftMenu: [{
                    content: wordsCap.invite,
                    onClick: () => showForm(TimeKeepingInviteForm, {
                        onSubmit: success => success && this.loadInvites(),
                        values: { projectHash: this.props.projectHash }
                    })
                }]
            }
        }
    }

    componentWillMount() {
        const { projectHash } = this.props
        this.tieIdAddress = selectedAddressBond.tie(this.loadInvites)

        if (!projectHash) return
        this.projectHash = projectHash
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

        getProjectWorkers(projectHash).then(invites => {
            Array.from(invites).forEach(([_, invite]) => {
                const { accepted, userId } = invite
                console.log({ userId })
                invite._status = accepted === true ? words.accepted : words.invited
                invite._userId = !userId ? texts.unknownUser : <UserID {...{ userId }} />
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