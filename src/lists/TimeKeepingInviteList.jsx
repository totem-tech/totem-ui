import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { Button } from 'semantic-ui-react'
import { DataTable } from '../components/ListFactory'
import { textCapitalize } from '../utils/utils'
import TimeKeepingInviteForm from '../forms/TimeKeepingInvite'
import PartnerForm from '../forms/Partner'
import { showForm } from '../services/modal'
import { selectedAddressBond } from '../services/identity'
import timeKeeping, { getProjectWorkers } from '../services/timeKeeping'
import { UserID } from '../components/buttons'

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

        this.loadWorkers = this.loadWorkers.bind(this)
        this.state = {
            listProps: {
                columns: [
                    { key: '_userId', title: texts.userId },
                    { key: 'name', title: texts.workerIdentity },
                    { key: '_status', textAlign: 'center', title: wordsCap.status },
                ],
                data: [],
                rowProps: ({ accepted }) => ({ positive: accepted }),
                searchExtraKeys: ['address', 'userId'],
                topLeftMenu: [{
                    content: wordsCap.invite,
                    onClick: () => showForm(TimeKeepingInviteForm, {
                        onSubmit: success => success && this.loadWorkers(),
                        values: { projectHash: this.props.projectHash }
                    })
                }]
            }
        }
    }

    componentWillMount() {
        const { projectHash } = this.props
        this.tieIdAddress = selectedAddressBond.tie(this.loadWorkers)

        if (!projectHash) return
        this.projectHash = projectHash
        this.bond = timeKeeping.worker.listWorkers(projectHash)
        this.tieId = this.bond.tie(this.loadWorkers)
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
        this.bond = !projectHash ? null : timeKeeping.worker.listWorkers(projectHash)
        this.tieId = this.bond.tie(this.loadWorkers)
        !this.bond && this.loadWorkers()
    }

    loadWorkers() {
        const { projectHash } = this.props
        const { listProps } = this.state
        if (!projectHash) {
            listProps.data = []
            return this.setState({ listProps })
        }

        getProjectWorkers(projectHash).then(workers => {
            Array.from(workers).forEach(([_, invite]) => {
                const { accepted, address, name, userId } = invite
                invite._status = accepted === true ? words.accepted : words.invited
                invite._userId = !userId ? texts.unknownUser : <UserID {...{ userId }} />
                invite.name = name || (
                    <Button
                        content='Add Partner'
                        onClick={() => showForm(PartnerForm, { values: { address } })}
                    />
                )
            })
            listProps.data = workers
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