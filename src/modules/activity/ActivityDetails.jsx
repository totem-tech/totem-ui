import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { translated } from '../../utils/languageHelper'
import { subjectAsPromise } from '../../utils/reactjs'
import { blockToDate } from '../../utils/time'
import { rxBlockNumber } from '../../services/blockchain'
import { showForm, showInfo } from '../../services/modal'
import { ButtonGroup } from '../../components/buttons'
import DataTableVertical from '../../components/DataTableVertical'
import LabelCopy from '../../components/LabelCopy'
import { statuses } from '../../components/Message'
import TimekeepingList from '../timekeeping/TimekeepingList'
import ActivityForm from './ActivityForm'
import ActivityTeamList from './ActivityTeamList'

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

const ActivityDetails = props => {
    const { id, modalId, project } = props
    const [tableProps, setTableProps] = useState({
        emptyMessage: {
            content: textsCap.loading,
            icon: true,
            status: statuses.LOADING,
        }
    })

    useEffect(() => {
        let mounted = true
        const [promise] = subjectAsPromise(rxBlockNumber)
        promise.then(currentBlock => {
            if (!mounted) return

            const columns = [
                { key: 'name', title: textsCap.detailsNameLabel },
                {
                    content: ({ id }) => (
                        <LabelCopy {...{ value: id }} />
                    ),
                    key: 'recordId',
                    title: textsCap.detailsRecordIdLabel,
                },
                { key: 'description', title: textsCap.detailsDescLabel },
                { key: '_totalTime', title: textsCap.detailsTotalTimeLabel },
                { key: '_statusText', title: textsCap.detailsStatusLabel },
                {
                    content: ({ firstSeen }) => firstSeen
                        ? blockToDate(firstSeen, currentBlock)
                        : textsCap.never,
                    key: 'firstSeen',
                    title: textsCap.detailsFirstSeenLabel,
                }
            ]
            setTableProps({
                columns,
            })
        })
        return () => mounted = false
    }, [])

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
                        hideTimer: true,
                        isMobile: true,
                        isOwner: true,
                        manage: true,
                        projectHash: id,
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

    return (
        <div>
            <DataTableVertical {...{
                ...tableProps,
                data: [{ id, ...project }],
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
}
ActivityDetails.propTypes = {
    id: PropTypes.string,
    modalId: PropTypes.string,
    project: PropTypes.object,
}
ActivityDetails.asModal = (props = {}) => {
    let { id, modalId } = props
    modalId = modalId || id

    return showInfo({
        collapsing: true,
        content: <ActivityDetails {...{ ...props, modalId }} />,
        header: textsCap.detailsFormHeader,
        size: 'mini',
    }, modalId)
}
export default ActivityDetails

const showDetails = (project, recordId) => {
    const { isMobile } = this.state
    const data = { ...project }
    data.recordId = textEllipsis(recordId, 23)
    data._firstSeen = data.firstSeen ? data.firstSeen : textsCap.never
    const labels = {
        name: textsCap.detailsNameLabel,
        recordId: textsCap.detailsRecordIdLabel,
        description: textsCap.detailsDescLabel,
        _totalTime: textsCap.detailsTotalTimeLabel,
        _statusText: textsCap.detailsStatusLabel,
        _firstSeen: textsCap.detailsFirstSeenLabel
    }
    // Create a form on the fly and display data a read-only input fields
    const getContent = (mobile, desktop = mobile) => {
        const El = isMobile
            ? 'div'
            : 'span'
        return <El>{isMobile ? mobile : desktop}</El>
    }
    const btnRecords = {
        // view time records button
        content: getContent(
            textsCap.records,
            textsCap.detailsTimeRecordsBtn,
        ),
        icon: 'clock outline',
        key: 'records',
        name: 'records',
        onClick: () => confirm({
            cancelButton: textsCap.close,
            confirmButton: null,
            content: <TimekeepingList {...{
                isOwner: true,
                manage: true,
                projectHash: recordId,
                projectName: project.name,
                ownerAddress: project.ownerAddress,
            }} />,
            header: `${project.name}: ${textsCap.timekeeping}`,
        }),
        type: 'Button',
    }
    const btnTeam = {
        content: getContent(
            textsCap.team,
            textsCap.viewTeam,
        ),
        icon: { name: 'group' },
        key: 'workers',
        onClick: () => this.showTeam(recordId, project.name),
        title: textsCap.viewTeam,
    }
    const btnEdit = {
        content: getContent(
            textsCap.update,
            textsCap.editProject,
        ),
        key: 'edit',
        icon: 'pencil',
        onClick: () => showForm(ActivityForm, { hash: recordId, values: project }),
        title: textsCap.editProject,
    }
    const btnGroup = {
        basic: true,
        buttons: [btnTeam, btnRecords, btnEdit],
        El: ButtonGroup,
        fluid: true,
        name: 'buttons',
        type: 'button',
        // vertical: isMobile,
    }
    showForm(FormBuilder, {
        closeOnEscape: true,
        closeOnDimmerClick: true,
        closeText: null,
        header: textsCap.detailsFormHeader,
        inputs: Object
            .keys(labels)
            .map(key => ({
                action: key !== 'recordId'
                    ? undefined
                    : {
                        icon: 'copy',
                        onClick: () => copyToClipboard(recordId),
                    },
                label: labels[key],
                name: key,
                readOnly: true,
                type: key === 'description'
                    ? 'textarea'
                    : 'text',
                value: data[key]
            }))
            .concat(btnGroup),
        size: 'tiny',
        submitText: null
    })
}