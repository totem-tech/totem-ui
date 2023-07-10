import React, { useMemo } from 'react'
import PropTypes from 'prop-types'
import { Button } from 'semantic-ui-react'
import { Message, useQueryBlockchain } from '../../utils/reactjs'
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
import TimekeepingInviteForm, {
    inputNames as tkInputNames
} from '../timekeeping/TimekeepingInviteForm'

const textsCap = {
    accepted: 'accepted',
    addMyself: 'add myself',
    addPartner: 'add partner',
    emptyMessage: 'No team member available. Click on the invite button to invite parters.',
    invite: 'invite',
    invited: 'invited',
    status: 'status',
    teamMember: 'team member',
}
translated(textsCap, true)

export default function ActivityTeamList(props) {
    const { activityId } = props
    // const [tableProps] = useState(() => getTableProps(props))
    const [
        tableProps,
        inviteesQuery,
        workersQuery
    ] = useMemo(() => [
        getTableProps(props),
        {
            args: [activityId],
            func: 'api.query.timekeeping.projectInvitesList',
        },
        {
            args: [activityId],
            func: 'api.query.timekeeping.projectWorkersList',
            // valueModifier: postProcess(true),
        }
    ], [activityId])
    const {
        message: msg1,
        result: invitees = []
    } = useQueryBlockchain(inviteesQuery)
    const {
        message: msg2,
        result: workers = []
    } = useQueryBlockchain(workersQuery)

    if (msg1 || msg2) return <Message {...msg1 || msg2} />

    const data = [...workers, ...invitees].map((
        address,
        _1,
        _2,
        accepted = workers.includes(address)
    ) => [
            address,
            {
                accepted,
                address,
                invited: true,
                name: <AddressName {...{ address }} />,
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
            }
        ])
    return (
        <DataTable {...{
            ...props,
            ...tableProps,
            data: new Map(data),
        }} />
    )
}
ActivityTeamList.propTypes = {
    activityId: PropTypes.string.isRequired,
}
const getTableProps = ({ activityId }) => ({
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
                                projectHash: activityId,
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
            values: { projectHash: activityId }
        })
    }],
})