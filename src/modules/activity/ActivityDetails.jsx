import React, { useMemo } from 'react'
import PropTypes from 'prop-types'
import { translated } from '../../utils/languageHelper'
import {
    Message,
    RxSubjectView,
    copyRxSubject,
    statuses,
    useQueryBlockchain,
    useRxSubjects,
} from '../../utils/reactjs'
import { blockToDate } from '../../utils/time'
import { rxBlockNumber } from '../../services/blockchain'
import { showForm, showInfo } from '../../services/modal'
import { ButtonGroup } from '../../components/buttons'
import DataTableVertical from '../../components/DataTableVertical'
import LabelCopy from '../../components/LabelCopy'
import TimekeepingList from '../timekeeping/TimekeepingList'
import ActivityForm from './ActivityForm'
import ActivityTeamList from './ActivityTeamList'
import useActivities, { types } from './useActivities'
import AddressName from '../partner/AddressName'
import { BehaviorSubject, first } from 'rxjs'
import { isStr } from '../../utils/utils'
import { statusTexts } from './activity'
import { blocksToDuration } from '../timekeeping/timekeeping'

const textsCap = {
    activityIdLabel: 'activity ID',
    descLabel: 'description of activity',
    editActitity: 'update activity',
    firstSeenLabel: 'first used at',
    formHeader: 'activity details',
    loading: 'loading...',
    name: 'name',
    never: 'never',
    owner: 'owner',
    records: 'records',
    statusLabel: 'activity status',
    team: 'team',
    timeRecords: 'time records',
    totalTimeLabel: 'total time',
    update: 'update',
    viewRecords: 'view time records',
    viewTeam: 'view team',
}
translated(textsCap, true)

const ActivityDetails = React.memo(props => {
    let { activity, activityId } = props
    const activityIds = useMemo(() => [activityId].filter(Boolean), [activityId])
    activity = !!activity
        ? activity
        : !activityId
            ? null
            : useActivities({
                activityIds: activityIds,
                subjectOnly: true,
                type: types.activityIds,
                valueModifier: map => map.get(activityId),
            })[0]

    // fetch and retrieve the block number Activity was first seen (first time a time record was submitted) 
    const rxFirstSeenQuery = useQueryBlockchain({
        func: !!activityIds.length
            && 'api.query.timekeeping.projectFirstSeen',
        args: activityIds,
        subscribe: false,
        subjectOnly: true,
    })

    const [{
        columns,
        data,
        buttons = [],
        message,
    }] = useRxSubjects(
        [
            props,
            activity,
            rxFirstSeenQuery
        ],
        getState,
    )

    return (
        <div>
            <DataTableVertical {...{
                columns,
                data,
                emptyMessage: {
                    ...!!message
                        ? message
                        : {
                            content: textsCap.loading,
                            icon: true,
                            status: statuses.LOADING,
                        },
                    style: { margin: 0 },
                },
                ...!columns && {
                    containerProps: { style: { margin: 0 } },
                    tableProps: { style: { margin: 0 } },
                }
            }} />
            {!!buttons.length && (
                <div style={{
                    marginBottom: 14,
                    marginTop: -14,
                    padding: 1,
                }}>
                    <ButtonGroup {...{
                        buttons,
                        fluid: true,
                    }} />
                </div>
            )}
        </div>
    )
})
ActivityDetails.propTypes = {
    activity: PropTypes.object,
    activityId: PropTypes.string,
    modalId: PropTypes.string,
}
ActivityDetails.asModal = (props = {}) => {
    let { activityId, modalId } = props
    modalId = modalId || activityId

    return showInfo({
        collapsing: true,
        content: <ActivityDetails {...{ ...props, modalId }} />,
        header: textsCap.formHeader,
        size: 'mini',
    }, modalId)
}
export default ActivityDetails

const getState = ([
    props = {},
    activity,
    firstSeenQuery = {}
] = []) => {
    const {
        result: firstSeen = 0,
        message,
    } = firstSeenQuery
    const { activityId, modalId } = props
    const {
        name,
        ownerAddress,
        status,
        totalBlocks = 0
    } = activity || {}
    const columns = [
        {
            content: x => <AddressName address={x.ownerAddress} />,
            key: 'ownerAddress',
            title: textsCap.owner,
        },
        { key: 'name', title: textsCap.name },
        {
            content: x => <LabelCopy {...{ value: x?.activityId }} />,
            key: 'activityId',
            title: textsCap.activityIdLabel,
        },
        { key: 'description', title: textsCap.descLabel },
        { key: '_totalTime', title: textsCap.totalTimeLabel },
        { key: '_statusText', title: textsCap.statusLabel },
        {
            // this messaage will only be displayed when activity is loaded from cache but first seen retrieval failed
            content: () => !!message
                ? (
                    <Message {...{
                        ...message,
                        style: {
                            borderRadius: 0,
                            margin: 0,
                        },
                        size: 'mini',
                    }} />
                )
                : (
                    <RxSubjectView {...{
                        key: firstSeen,
                        subject: copyRxSubject(rxBlockNumber),
                        valueModifier: (
                            currentBlock,
                            _oldValue,
                            rxCopyBlockNr
                        ) => {
                            const res = currentBlock > 0
                                ? firstSeen
                                    ? blockToDate(firstSeen, currentBlock)
                                    : textsCap.never
                                : null // not ready yet

                            // once a value is retrieved unsbuscribe from 
                            if (currentBlock > 0 && isStr(res)) rxCopyBlockNr.unsubscribe()
                            return res
                        },
                    }} />
                ),
            style: !!message && { padding: 0 } || {},
            title: textsCap.firstSeenLabel,
        },
    ]
    const buttons = [
        {
            // view team button
            content: <div>{textsCap.team}</div>,
            icon: { name: 'group' },
            key: 'workers',
            onClick: () => ActivityTeamList.asModal({
                activityId,
                modalId,
                subheader: name,
            }),
            title: textsCap.viewTeam,
        },
        {
            // view time records button
            content: <div>{textsCap.records}</div>,
            icon: 'clock outline',
            key: 'records',
            name: 'records',
            onClick: () => showInfo({
                content: (
                    <TimekeepingList {...{
                        activityId: activityId,
                        hideTimer: true,
                        isMobile: true,
                        isOwner: true,
                        manage: true,
                        projectName: name,
                        ownerAddress: ownerAddress,
                        topGrid: {
                            left: { computer: 12 },
                            right: { computer: 4 },
                        },
                    }} />
                ),
                collapsing: false,
                confirmButton: null,
                cancelButton: null,
                header: name,
                subheader: textsCap.timeRecords,
            }),
            title: textsCap.viewRecords,
            type: 'Button',
        },
        {
            // edit activity button
            content: <div>{textsCap.update}</div>,
            key: 'edit',
            icon: 'pencil',
            onClick: () => showForm(
                ActivityForm,
                {
                    activityId,
                    values: activity,
                },
                modalId
            ),
            title: textsCap.editActitity,
        }
    ].filter(Boolean)

    return {
        buttons,
        columns,
        data: [
            activity && {
                ...activity,
                activityId,
                _statusText: statusTexts[status] || statusTexts.unknown,
                _totalTime: blocksToDuration(totalBlocks)
            }
        ].filter(Boolean),
        message: !activity
            ? message
            : null,
    }
}