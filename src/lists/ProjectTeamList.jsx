import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { Button } from 'semantic-ui-react'
import { ButtonAcceptOrReject } from '../components/buttons'
import DataTable from '../components/DataTable'
import TimeKeepingInviteForm from '../forms/TimeKeepingInvite'
// services
import identities, { selectedAddressBond } from '../services/identity'
import { translated } from '../services/language'
import { showForm } from '../services/modal'
import { handleTKInvitation } from '../services/notification'
import PartnerForm from '../forms/Partner'
import timeKeeping, { getProjectWorkers } from '../services/timeKeeping'

const [words, wordsCap] = translated({
    accepted: 'accepted',
    invite: 'invite',
    invited: 'invited',
    status: 'status',
    team: 'team',
}, true)
const [texts] = translated({
    addPartner: 'Add Partner',
    userId: 'User ID',
    unknownUser: 'Unknown user',
})

export default class ProjectTeamList extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.state = {
            listProps: {
                columns: [
                    // { key: '_userId', title: texts.userId },
                    { key: 'name', title: wordsCap.team },
                    { key: '_status', textAlign: 'center', title: wordsCap.status },
                ],
                data: [],
                emptyMessage: null,
                rowProps: ({ accepted }) => ({ positive: accepted }),
                searchExtraKeys: ['address', 'userId'],
                topLeftMenu: [{
                    content: wordsCap.invite,
                    onClick: () => showForm(TimeKeepingInviteForm, {
                        onSubmit: success => success && this.loadWorkers(),
                        values: { projectHash: this.props.projectHash }
                    })
                }]
            },
            searchExtraKeys: ['userId', 'status']
        }

        this.originalSetState = this.setState
        this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
    }

    componentWillMount() {
        this._mounted = true
        const { projectHash } = this.props
        if (!projectHash) return

        this.projectHash = projectHash
        this.bond = Bond.all([
            timeKeeping.worker.listInvited(projectHash),
            timeKeeping.worker.listWorkers(projectHash),
            selectedAddressBond,
        ])
        this.tieId = this.bond.tie(() => this.loadWorkers())
    }

    componentWillUnmount() {
        this._mounted = false
        this.bond && this.bond.untie(this.tieId)
    }

    componentWillUpdate() {
        const { projectHash } = this.props
        if (this.projectHash === projectHash) return
        this.projectHash = projectHash
        this.bond && this.bond.untie(this.tieId)
        this.bond = !projectHash ? null : Bond.all([
            timeKeeping.worker.listInvited(projectHash),
            timeKeeping.worker.listWorkers(projectHash),
            selectedAddressBond,
        ])
        this.tieId = this.bond && this.bond.tie(() => this.loadWorkers())
        !this.bond && this.loadWorkers()
    }

    loadWorkers = () => {
        const { projectHash } = this.props
        const { listProps } = this.state
        if (!projectHash) {
            listProps.data = []
            return this.setState({ listProps })
        }

        getProjectWorkers(projectHash).then(({ workers }) => {
            Array.from(workers).forEach(([_, invite]) => {
                const { accepted, address, name } = invite
                const isOwnIdentity = !!identities.get(address)
                invite._status = accepted === true ? words.accepted : (!isOwnIdentity ? words.invited : (
                    // Worker identity belongs to current user => button to accept or reject
                    <ButtonAcceptOrReject onClick={accepted => handleTKInvitation(projectHash, address, accepted)} />
                ))
                invite.name = name || (
                    <Button
                        content={texts.addPartner}
                        onClick={() => showForm(PartnerForm, { values: { address } })}
                    />
                )
            })
            listProps.data = workers
            this.setState({ listProps })
        })
    }

    render = () => <DataTable {...this.state.listProps} />
}
ProjectTeamList.propTypes = {
    projectHash: PropTypes.string,
}