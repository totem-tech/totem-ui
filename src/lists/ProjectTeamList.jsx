import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Button } from 'semantic-ui-react'
import { isFn } from '../utils/utils'
import { ButtonAcceptOrReject } from '../components/buttons'
import DataTable from '../components/DataTable'
import PartnerForm from '../forms/Partner'
import TimeKeepingInviteForm from '../forms/TimeKeepingInvite'
import { handleTKInvitation } from '../modules/notification/notification'
// services
import { get as getIdentity, selectedAddressBond, getSelected } from '../services/identity'
import { translated } from '../services/language'
import { showForm } from '../services/modal'
import { get as getPartner } from '../services/partner'
import { query } from '../services/timeKeeping'
import { getUser } from '../services/chatClient'

const [words, wordsCap] = translated({
    accepted: 'accepted',
    invite: 'invite',
    invited: 'invited',
    status: 'status',
    team: 'team',
}, true)
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
            ownerAddress: getSelected().address,
            listProps: {
                columns: [
                    // { key: '_userId', title: texts.userId },
                    { key: 'name', title: wordsCap.team },
                    { key: '_status', textAlign: 'center', title: wordsCap.status },
                ],
                data: new Map(),
                emptyMessage: { content: texts.emptyMessage },
                rowProps: ({ accepted }) => ({ positive: accepted }),
                searchExtraKeys: ['address', 'userId'],
                topLeftMenu: [{
                    content: wordsCap.invite,
                    onClick: () => showForm(TimeKeepingInviteForm, {
                        // onSubmit: success => success && this.loadWorkers(),
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
        let ignoredFirst = false
        const { projectHash: projectId } = this.props
        const { listInvited, listWorkers } = query.worker
        this.unsubscribers = {
            workersAccepted: listWorkers(projectId, this.setWorkers(projectId, true)),
            workersInvited: listInvited(projectId, this.setWorkers(projectId, false)),
        }
        this.tieId = selectedAddressBond.tie(ownerAddress => {
            // force reset everything
            const { listProps } = this.state
            listProps.data = !ignoredFirst ? listProps.data : new Map()
            this.setState({ ownerAddress, listProps })
            if (!ignoredFirst) {
                ignoredFirst = true
                return
            }
            this.componentWillUnmount()
            this.componentWillMount()
        })
    }

    componentWillUnmount() {
        this._mounted = false
        Object.values(this.unsubscribers).forEach(fn => isFn(fn) && fn())
        selectedAddressBond.untie(this.tieId)
    }

    // loadWorkers = () => {
    //     const { projectHash: projectId } = this.props
    //     const { listProps } = this.state
    //     if (!projectId) {
    //         listProps.data = []
    //         return this.setState({ listProps })
    //     }

    //     getProjectWorkers(projectId).then(({ workers }) => {
    //         Array.from(workers).forEach(([_, invite]) => {
    //             const { accepted, address, name } = invite
    //             const isOwnIdentity = !!getIdentity(address)
    //             invite._status = accepted === true ? words.accepted : (!isOwnIdentity ? words.invited : (
    //                 // Worker identity belongs to current user => button to accept or reject
    //                 <ButtonAcceptOrReject onClick={accepted => handleTKInvitation(projectId, address, accepted)} />
    //             ))
    //             invite.name = name || (
    //                 <Button
    //                     content={texts.addPartner}
    //                     onClick={() => showForm(PartnerForm, { values: { address } })}
    //                 />
    //             )
    //         })
    //         listProps.data = workers
    //         this.setState({ listProps })
    //     })
    // }

    setWorkers = (projectId, accepted) => workerAddresses => {
        const { listProps } = this.state
        const { data } = listProps
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

            // if (!accepted && data.get(address)) return
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
                _status: accepted ? words.accepted : (!isOwnIdentity ? words.invited : (
                    // Worker identity belongs to current user => button to accept or reject
                    <ButtonAcceptOrReject onClick={accept => handleTKInvitation(
                        projectId,
                        address,
                        accept,
                    )} />
                ))
            })
        })

        this.setState({ listProps })
    }

    render = () => <DataTable {...this.state.listProps} />
}
ProjectTeamList.propTypes = {
    projectHash: PropTypes.string.isRequired,
}