import React, { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { translated } from '../../utils/languageHelper'
import { RxSubjectView, statuses, subjectAsPromise, useQueryBlockchain, useRxSubject } from '../../utils/reactjs'
import { blockToDate } from '../../utils/time'
import { rxBlockNumber } from '../../services/blockchain'
import { showForm, showInfo } from '../../services/modal'
import { ButtonGroup } from '../../components/buttons'
import DataTableVertical from '../../components/DataTableVertical'
import LabelCopy from '../../components/LabelCopy'
import TimekeepingList from '../timekeeping/TimekeepingList'
import ActivityForm from './ActivityForm'
import ActivityTeamList from './ActivityTeamList'
import { BehaviorSubject } from 'rxjs'

let textsCap = {
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
    project: 'project',
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
    closeProject: 'close activity',
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
    editProject: 'update activity',
    loading: 'loading...',
    projectsFailed: 'failed to retrieve activities',
    projectCloseReopenWarning: 'you are about to change status of the following activities to:',
    projectTeam: 'activity team',
    reassignOwner: 're-assign owner',
    reopenProject: 're-open ativity',
    totalTime: 'total time',
    viewDetails: 'view details',
    viewTeam: 'view team',

    subheader: 'time records',
    name404: 'unnamed activity'
}
textsCap = translated(textsCap, true)[1]

const ActivityDetails = React.memo(props => {
    const { activityId, activity } = props
    const args = useMemo(() => [activityId], [activityId])
    // fetch and retrieve the block number Activity was first seen 
    const {
        result: {
            columns,
            buttons
        } = {},
        message,
    } = useQueryBlockchain(
        null,
        'api.query.timekeeping.projectFirstSeen',
        args,
        false,
        handleFirstSeenCb(props),
    )

    return (
        <div>
            <DataTableVertical {...{
                columns,
                emptyMessage: message || {
                    content: textsCap.loading,
                    icon: true,
                    status: statuses.LOADING,
                },
                data: !columns
                    ? []
                    : [{ activityId, ...activity }],
            }} />
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
        id,
        modalId,
        project
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
                content: <ActivityTeamList projectHash={id} />,
                header: textsCap.projectTeam,
                subheader: project.name,
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
                        activityId: id,
                        hideTimer: true,
                        isMobile: true,
                        isOwner: true,
                        manage: true,
                        projectName: project.name,
                        ownerAddress: project.ownerAddress,
                        topGrid: {
                            left: { computer: 12 },
                            right: { computer: 4 },
                        }
                    }} />
                ),
                collapsing: false,
                confirmButton: null,
                cancelButton: null,
                header: project.name || textsCap.name404,
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
                hash: id,
                values: project,
            }, modalId),
            title: textsCap.editProject,
        }
    ].filter(Boolean)

    return { columns, buttons }
}