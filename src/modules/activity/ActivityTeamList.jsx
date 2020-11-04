import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Button } from 'semantic-ui-react'
import { isFn } from '../../utils/utils'
import { ButtonAcceptOrReject } from '../../components/buttons'
import DataTable from '../../components/DataTable'
import { translated } from '../../services/language'
import { showForm } from '../../services/modal'

import { getUser } from '../chat/ChatClient'
import { get as getIdentity } from '../identity/identity'
import { get as getPartner } from '../partner/partner'
import PartnerForm from '../partner/PartnerForm'
import { query } from '../timekeeping/timekeeping'
import TimekeepingInviteForm from '../timekeeping/TimekeepingInviteForm'
import { handleInvitation as handleTkInvitation } from '../timekeeping/notificationHandlers'

const textsCap = translated({
    accepted: 'accepted',
    invite: 'invite',
    invited: 'invited',
    status: 'status',
    team: 'team',

    addPartner: 'add partner',
    emptyMessage: 'No team member available. Click on the invite button to invite parters.',
    userId: 'User ID',
    unknownUser: 'unknown user',
}, true)[1]

export default class ActivityTeamList extends Component {
    constructor(props) {
        super(props)

        this.state = {
            columns: [
                { key: 'name', title: textsCap.team },
                { key: '_status', textAlign: 'center', title: textsCap.status },
            ],
            data: new Map(),
            emptyMessage: { content: textsCap.emptyMessage },
            rowProps: ({ accepted }) => ({ positive: accepted }),
            searchExtraKeys: ['address', 'userId'],
            topLeftMenu: [{
                content: textsCap.invite,
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
                        content={textsCap.addPartner}
                        onClick={() => showForm(PartnerForm, { values: { address } })}
                    />
                ),
                invited: true,
                userId,
                _status: accepted ? textsCap.accepted : (!isOwnIdentity ? textsCap.invited : (
                    // Worker identity belongs to current user => button to accept or reject
                    <ButtonAcceptOrReject
                        onAction={(_, accept) => handleTkInvitation( projectId, address, accept )}
                        style={{ marginTop: 10 }}
                    />
                ))
            })

        })
        this.setState({ data })
    }

    render = () => <DataTable {...this.state} />
}
ActivityTeamList.propTypes = {
    projectHash: PropTypes.string.isRequired,
}