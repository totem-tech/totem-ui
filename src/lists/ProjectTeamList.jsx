import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Button } from 'semantic-ui-react'
import { isFn } from '../utils/utils'
import { ButtonAcceptOrReject } from '../components/buttons'
import DataTable from '../components/DataTable'
import PartnerForm from '../forms/Partner'
import TimekeepingInviteForm from '../modules/timekeeping/TimekeeepingInviteForm'
import { getUser } from '../services/chatClient'
import { get as getIdentity } from '../services/identity'
import { translated } from '../services/language'
import { showForm } from '../services/modal'
import { get as getPartner } from '../services/partner'
import { query } from '../modules/timekeeping/timekeeping'
import { handleInvitation } from '../modules/timekeeping/notificationHandlers'


const wordsCap = translated({
    accepted: 'accepted',
    invite: 'invite',
    invited: 'invited',
    status: 'status',
    team: 'team',
}, true)[1]
const [texts] = translated({
    addPartner: 'Add Partner',
    emptyMessage: 'No team member available. Click on the invite button to invite parters.',
    userId: 'User ID',
    unknownUser: 'Unknown user',
})

export default class ProjectTeamList extends Component {
    constructor(props) {
        super(props)

        this.state = {
            columns: [
                { key: 'name', title: wordsCap.team },
                { key: '_status', textAlign: 'center', title: wordsCap.status },
            ],
            data: new Map(),
            emptyMessage: { content: texts.emptyMessage },
            rowProps: ({ accepted }) => ({ positive: accepted }),
            searchExtraKeys: ['address', 'userId'],
            topLeftMenu: [{
                content: wordsCap.invite,
                onClick: () => showForm(TimekeepingInviteForm, {
                    values: { projectHash: this.props.projectHash }
                })
            }],
            searchExtraKeys: ['userId', 'status']
        }

        this.originalSetState = this.setState
        this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
    }

    componentWillMount() {
        this._mounted = true
        const { projectHash: projectId } = this.props
        const { listInvited, listWorkers } = query.worker
        this.unsubscribers = {
            workersAccepted: listWorkers(projectId, this.setWorkersCb(projectId, true)),
            workersInvited: listInvited(projectId, this.setWorkersCb(projectId, false)),
        }
    }

    componentWillUnmount() {
        this._mounted = false
        Object.values(this.unsubscribers).forEach(fn => isFn(fn) && fn())
    }

    setWorkersCb = (projectId, accepted) => workerAddresses => {
        const { data } = this.state
        const { id: currentUserId } = getUser() | {}
        workerAddresses.forEach(address => {
            let { name, userId } = getPartner(address) || {}
            let isOwnIdentity = false
            if (!name || !userId) {
                const { name: iName } = getIdentity(address) || {}
                if (iName) {
                    isOwnIdentity = true
                    // address is owned by current user
                    name = iName
                    userId = currentUserId
                }
            }

            data.set(address, {
                accepted,
                address,
                name: name || (
                    <Button
                        content={texts.addPartner}
                        onClick={() => showForm(PartnerForm, { values: { address } })}
                    />
                ),
                invited: true,
                userId,
                _status: accepted ? wordsCap.accepted : (!isOwnIdentity ? wordsCap.invited : (
                    // Worker identity belongs to current user => button to accept or reject
                    <ButtonAcceptOrReject
                        onClick={accept => handleInvitation(
                            projectId,
                            address,
                            accept,
                        )}
                        style={{ marginTop: 10 }}
                    />
                ))
            })

        })
        this.setState({ data })
    }

    render = () => <DataTable {...this.state} />
}
ProjectTeamList.propTypes = {
    projectHash: PropTypes.string.isRequired,
}