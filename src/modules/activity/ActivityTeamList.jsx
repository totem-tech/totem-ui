import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Button } from 'semantic-ui-react'
import { unsubscribe } from '../../utils/reactjs'
import { ButtonAcceptOrReject } from '../../components/buttons'
import DataTable from '../../components/DataTable'
import { translated } from '../../utils/languageHelper'
import { showForm } from '../../services/modal'
import {
    get as getIdentity,
    getSelected as getSelectedIdentity,
} from '../identity/identity'
import AddressName from '../partner/AddressName'
import {
    handleInvitation as handleTkInvitation,
} from '../timekeeping/notificationHandlers'
import { query } from '../timekeeping/timekeeping'
import TimekeepingInviteForm, {
    inputNames as tkInputNames
} from '../timekeeping/TimekeepingInviteForm'

let textsCap = {
    accepted: 'accepted',
    invite: 'invite',
    invited: 'invited',
    status: 'status',

    addMyself: 'add myself',
    addPartner: 'add partner',
    emptyMessage: 'No team member available. Click on the invite button to invite parters.',
    teamMember: 'team member',
}
textsCap = translated(textsCap, true)[1]

export default function ActivityTeamList(props) {
    const [tableProps] = useState(() => getTableProps(props))
    const [workers, setWorkers] = useState([])
    const [invitees, setInvitees] = useState([])
    const { projectHash: activityId } = props

    useEffect(() => {
        let mounted = true
        const postProcess = (accepted, setState) => addresses => {
            const addDetails = address => ({
                accepted,
                address,
                name: <AddressName {...{ address }} />,
                invited: true,
                status: accepted
                    ? textsCap.accepted
                    : !getIdentity(address)
                        ? textsCap.invited
                        : (
                            // Worker identity belongs to current user => button to accept or reject
                            <ButtonAcceptOrReject {...{
                                onAction: (_, accept) => handleTkInvitation(
                                    activityId,
                                    address,
                                    accept
                                ),
                                style: { marginTop: 10 },
                            }} />
                        )
            })
            mounted && setState(addresses.map(addDetails))
        }
        const subs = {
            workers: query.worker.listWorkers(
                activityId,
                postProcess(true, setWorkers),
            ),
            invitees: query.worker.listInvited(
                activityId,
                postProcess(false, setInvitees),
            ),
        }

        return () => {
            mounted = false
            unsubscribe(subs)
        }
    }, [])


    return (
        <DataTable {...{
            ...props,
            ...tableProps,
            data: new Map(
                [...workers, ...invitees]
                    .map(x => [x.address, x])
            ),
        }} />
    )
}
ActivityTeamList.propTypes = {
    projectHash: PropTypes.string.isRequired,
}
const getTableProps = (props) => ({
    columns: [
        {
            key: 'name',
            draggable: true,
            onDragStart: (e, _, { address }) => {
                e.stopPropagation()
                e.dataTransfer.setData('Text', address)
            },
            title: textsCap.teamMember,
        },
        {
            key: 'status',
            textAlign: 'center',
            title: textsCap.status,
        },
    ],
    emptyMessage: {
        content: (
            <div>
                {textsCap.emptyMessage}
                <div>
                    <Button {...{
                        content: textsCap.addMyself,
                        icon: 'plus',
                        onClick: () => showForm(TimekeepingInviteForm, {
                            submitText: textsCap.addMyself,
                            inputsDisabled: Object.values(tkInputNames),
                            inputsHidden: ['addpartner'],
                            values: {
                                projectHash: props.projectHash,
                                workerAddress: getSelectedIdentity().address,
                            },
                        })
                    }} />
                </div>
            </div>
        )
    },
    rowProps: ({ accepted }) => ({ positive: accepted }),
    searchExtraKeys: ['address', 'userId', 'status'],
    topLeftMenu: [{
        content: textsCap.invite,
        onClick: () => showForm(TimekeepingInviteForm, {
            values: { projectHash: props.projectHash }
        })
    }],
})