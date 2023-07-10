import React, { useMemo } from 'react'
import PropTypes from 'prop-types'
import { translated } from '../../utils/languageHelper'
import {
    RxSubjectView,
    statuses,
    useQueryBlockchain,
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

const textsCap = {
    actions: 'actions',
    activity: 'activity',
    abandoned: 'abandoned',
    blocks: 'blocks',
    cancelled: 'cancelled',
    close: 'close',
    closed: 'closed',
    create: 'create',
    delete: 'delete',
    deleted: 'deleted',
    description: 'description',
    export: 'export',
    name: 'name',
    never: 'never',
    onHold: 'On-hold',
    open: 'open',
    proceed: 'proceed',
    records: 'records',
    reopen: 're-open',
    reopened: 're-opened',
    status: 'status',
    team: 'team',
    timekeeping: 'timekeeping',
    update: 'update',
    unknown: 'unknown',
    unnamed: 'unnamed',

    areYouSure: 'are you sure?',
    closeActivity: 'close activity',
    deleteConfirmMsg1: 'you are about to delete the following activities:',
    deleteConfirmMsg2: `Warning: This action cannot be undone! 
        You will lose access to this Activity data forever! 
        A better option might be to archive the Activity.`,
    deleteConfirmHeader: 'delete activities',
    detailsNameLabel: 'activity name',
    detailsRecordIdLabel: 'activity ID',
    detailsDescLabel: 'description of activity',
    detailsTotalTimeLabel: 'total time',
    detailsStatusLabel: 'activity status',
    detailsFirstSeenLabel: 'first used at',
    detailsFormHeader: 'activity details',
    detailsTimeRecordsBtn: 'view time records',
    editActitity: 'update activity',
    loading: 'loading...',
    projectTeam: 'activity team',
    reassignOwner: 're-assign owner',
    reopenProject: 're-open ativity',
    totalTime: 'total time',
    viewDetails: 'view details',
    viewTeam: 'view team',

    subheader: 'time records',
    name404: 'unnamed activity'
}
translated(textsCap, true)

const ActivityDetails = React.memo(props => {
    let { activity, activityId } = props
    const activityIds = useMemo(() => [activityId], [activityId])
    activity = activity || activityId && useActivities({
        activityIds: activityIds,
        type: types.activity,
        valueModifier: map => map.get(activityId),
    })[0]

    // fetch and retrieve the block number Activity was first seen (first time a time record was submitted) 
    const {
        result: {
            columns,
            buttons = []
        } = {},
        message,
    } = useQueryBlockchain({
        // in case activity is not provided in the props, 
        // this will show a loading spinner until activity is fetched using `useActivities` hook.
        func: !!activity && 'api.query.timekeeping.projectFirstSeen',
        args: activityIds,
        subscribe: false,
        valueModifier: handleFirstSeenCb({ ...props, activity }),
    })

    return (
        <div>
            <DataTableVertical {...{
                columns,
                data: !columns
                    ? []
                    : [{ activityId, ...activity }],
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
        header: textsCap.detailsFormHeader,
        size: 'mini',
    }, modalId)
}
export default ActivityDetails

const handleFirstSeenCb = props => (firstSeen = 0) => {
    const {
        activityId,
        modalId,
        activity
    } = props
    const columns = [
        { key: 'name', title: textsCap.detailsNameLabel },
        {
            content: x => <LabelCopy {...{ value: x?.activityId }} />,
            key: 'activityId',
            title: textsCap.detailsRecordIdLabel,
        },
        { key: 'description', title: textsCap.detailsDescLabel },
        { key: '_totalTime', title: textsCap.detailsTotalTimeLabel },
        { key: '_statusText', title: textsCap.detailsStatusLabel },
        {
            content: () => (
                <RxSubjectView {...{
                    key: firstSeen,
                    subject: rxBlockNumber,
                    valueModifier: (currentBlock, oldValue) => {
                        if (oldValue !== undefined) return RxSubjectView.IGNORE_UPDATE
                        return firstSeen
                            ? blockToDate(firstSeen, currentBlock)
                            : textsCap.never
                    },
                }} />
            ),
            title: textsCap.detailsFirstSeenLabel,
        }
    ]
    const buttons = [
        {
            // view team button
            content: <div>{textsCap.team}</div>,
            icon: { name: 'group' },
            key: 'workers',
            onClick: () => showInfo({
                content: <ActivityTeamList activityId={activityId} />,
                header: textsCap.projectTeam,
                subheader: activity.name,
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
                        projectName: activity.name,
                        ownerAddress: activity.ownerAddress,
                        topGrid: {
                            left: { computer: 12 },
                            right: { computer: 4 },
                        },
                    }} />
                ),
                collapsing: false,
                confirmButton: null,
                cancelButton: null,
                header: activity.name || textsCap.name404,
                subheader: textsCap.subheader,
            }),
            type: 'Button',
        },
        {
            // edit activity button
            content: <div>{textsCap.update}</div>,
            key: 'edit',
            icon: 'pencil',
            onClick: () => showForm(ActivityForm, {
                activityId,
                values: activity,
            }, modalId),
            title: textsCap.editActitity,
        }
    ].filter(Boolean)

    return { columns, buttons }
}