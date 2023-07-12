import PropTypes from 'prop-types'
import React from 'react'
import { BehaviorSubject } from 'rxjs'
import uuid from 'uuid'
import { Button } from '../../components/buttons'
import DataTable from '../../components/DataTable'
import { hashTypes, queueables as bcQueueables } from '../../services/blockchain'
import { confirm, showForm } from '../../services/modal'
import { addToQueue } from '../../services/queue'
import { translated } from '../../utils/languageHelper'
import {
    useIsMobile,
    useRxState,
    useRxSubject
} from '../../utils/reactjs'
import { deferred, objClean } from '../../utils/utils'
import identities, { rxIdentities } from '../identity/identity'
import AddressName from '../partner/AddressName'
import TimekeepingForm from './TimekeepingForm'
import TimekeepingUpdateForm from './TimekeepingUpdateForm'
import SumDuration from './SumDuration'
import { statuses, queueables } from './timekeeping'
import TimekeepingDetailsForm from './RecordDetails'
import TimekeepingInviteForm from './TimekeepingInviteForm'
import useTkRecords from './useTkRecords'

const toBeImplemented = () => alert('To be implemented')

const textsCap = {
    action: 'action',
    activity: 'activity',
    approve: 'approve',
    approved: 'approved',
    archive: 'archive',
    close: 'close',
    deleted: 'deleted',
    dispute: 'dispute',
    disputed: 'disputed',
    draft: 'draft',
    duration: 'duration',
    edit: 'edit',
    hash: 'hash',
    invoiced: 'invoiced',
    locked: 'locked',
    no: 'no',
    reject: 'reject',
    rejected: 'rejected',
    selected: 'selected',
    status: 'status',
    submitted: 'submitted',
    timekeeping: 'Timekeeping',
    timer: 'timer',
    yes: 'yes',
    unarchive: 'unarchive',
    worker: 'worker',

    activityName: 'activity name',
    activityUnnamed: 'unnamed activity',
    approveRecord: 'approve record',
    archiveRecord: 'archive record',
    banUser: 'ban user',
    blockStart: 'start block',
    blockEnd: 'end block',
    blockCount: 'number of blocks',
    emptyMessage: 'no time records available',
    emptyMessageArchive: 'no records have been archived yet',
    finishedAt: 'finished at',
    loading: 'loading...',
    orInviteATeamMember: 'maybe invite someone to an activity?',
    noTimeRecords: 'your team have not yet booked time.',
    numberOfBreaks: 'number of breaks',
    recordDetails: 'record details',
    recordId: 'record ID',
    rejectRecord: 'reject record',
    setAsDraft: 'set as draft',
    setAsDraftDetailed: 'set as draft and force user to submit again',
    unarchiveRecord: 'restore from archive',
    workerIdentity: 'worker identity',
}
translated(textsCap, true)
export const statusTexts = {
    [statuses.draft]: textsCap.draft,
    [statuses.submit]: textsCap.submitted,
    [statuses.dispute]: textsCap.disputed,
    [statuses.reject]: textsCap.rejected,
    [statuses.accept]: textsCap.approved,
    [statuses.invoice]: textsCap.invoiced,
    [statuses.delete]: textsCap.deleted,
}

export const rxInProgressIds = new BehaviorSubject(new Map()) // key: recordId, value: button title

const TimeKeepingList = React.memo(props => {
    const [data = new Map(), rxRecords] = useTkRecords(
        objClean(props, [
            'activityId',
            'archive',
            'identity',
            'manage'
        ])
    )
    const state = useRxState(getInitialState(props, rxRecords))[0]
    useRxSubject(rxInProgressIds) // trigger state update on change??

    const {
        activityId,
        archive,
        hideTimer,
        isMobile = useIsMobile(),
        manage,
    } = props
    const {
        columns,
        style,
        topLeftMenu,
        topRightMenu
    } = state
    const { loaded } = data
    const colWorkerAddress = columns.find(x => x.key === 'workerAddress')
    colWorkerAddress.hidden = !manage
    const timeBtn = topLeftMenu.find(x => x.key === 'timer')
    timeBtn.hidden = hideTimer
    topRightMenu.forEach(item => {
        // un/archive action is always visible
        if (item.key !== 'actionArchive') {
            item.hidden = !manage || archive
            return
        }
        item.content = archive
            ? textsCap.unarchive
            : textsCap.archive
        item.icon = archive
            ? 'reply all'
            : 'file archive'
    })

    const content = !loaded
        ? textsCap.loading
        : archive
            ? textsCap.emptyMessageArchive
            : (
                <div>
                    {manage
                        ? textsCap.noTimeRecords
                        : textsCap.emptyMessage + ' '}
                    {manage && (
                        <div>
                            <Button {...{
                                positive: true,
                                content: textsCap.orInviteATeamMember,
                                onClick: () => showForm(
                                    TimekeepingInviteForm,
                                    { values: { activityId } },
                                ),
                            }}
                            />
                        </div>
                    )}
                </div>
            )

    return (
        <DataTable {...{
            ...props,
            ...state,
            data,
            emptyMessage: {
                content,
                icon: !loaded,
                status: loaded
                    ? undefined
                    : 'loading',
            },
            isMobile,
            style: {
                paddingTop: 15,
                ...props.style,
                ...style,
            },
        }} />
    )
})
const arrOrStr = PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.string),
    PropTypes.string,
])
TimeKeepingList.propTypes = {
    activityId: arrOrStr,
    // whether to retrieve archives
    archive: PropTypes.bool,
    identity: arrOrStr,
    hideTimer: PropTypes.bool,
    // manage records of projects owned by selected identity
    manage: PropTypes.bool,
}
TimeKeepingList.defaultProps = {
    archive: false,
    hideTimer: false,
    manage: false,
}
export default TimeKeepingList

const getInitialState = (props, rxRecords) => rxState => {
    const {
        activityId,
        archive,
        manage
    } = props
    const recordIds = []
    const rxSelectedIds = new BehaviorSubject([])
    const columns = [
        {
            collapsing: true,
            hidden: ({ isMobile }) => isMobile,
            key: '_end_block',
            title: textsCap.finishedAt,
        },
        {
            hidden: ({ isMobile }) => manage && isMobile,
            key: 'activityName',
            title: textsCap.activity,
            style: { minWidth: 125 }
        },
        {
            content: x => <AddressName address={x?.workerAddress} />,
            draggableValueKey: 'workerAddress',
            key: 'workerAddress',
            title: textsCap.workerIdentity,
        },
        {
            key: 'duration',
            textAlign: 'center',
            title: textsCap.duration,
        },
        // { key: 'start_block', title: texts.blockStart },
        // { key: 'end_block', title: texts.blockEnd },
        {
            collapsing: true,
            content: ({ locked, submit_status }) => locked
                ? textsCap.locked
                : statusTexts[submit_status],
            hidden: ({ isMobile }) => isMobile,
            key: '_status',
            textAlign: 'center',
            title: textsCap.status,
        },
        {
            collapsing: true,
            content: getActionButtons(props),
            draggable: false,
            style: { padding: '0px 5px' },
            textAlign: 'center',
            title: textsCap.action,
        }
    ]

    const handleApproveClickCb = (approve = true) => (
        selectedIds,
        data = new Map()
    ) => selectedIds.forEach(recordId =>
        handleApprove(
            data.get(recordId),
            recordId,
            approve,
        )
    )
    const topRightMenu = [
        {
            content: textsCap.approve,
            icon: {
                color: 'green',
                name: 'check',
            },
            key: 'actionApprove',
            onClick: handleApproveClickCb(true),
        },
        {
            content: textsCap.reject,
            icon: { color: 'red', name: 'x' },
            key: 'actionReject',
            onClick: handleApproveClickCb(false),
        },
        {
            content: textsCap.banUser,
            icon: { color: 'red', name: 'ban' },
            key: 'actionBan',
            onClick: toBeImplemented //handleBan
        },
        {
            key: 'actionArchive',
            onClick: async (selectedIds, data) => {
                const identities = rxIdentities.value
                const arr = selectedIds
                    .map(id => {
                        const { workerAddress } = data.get(id) || {}
                        const isWorker = identities.get(workerAddress)
                        return isWorker && [id, workerAddress]
                    })
                    .filter(Boolean)
                if (!arr.length) return // none eligible

                const header = archive
                    ? textsCap.unarchiveRecord
                    : textsCap.archiveRecord
                confirm({
                    content: `${textsCap.selected}: ${arr.length}`,
                    header: `${header}?`,
                    onConfirm: () => arr.forEach(([recordId, workerAddress]) =>
                        handleArchive(
                            recordId,
                            !archive,
                            workerAddress,
                        )
                    ),
                    size: 'mini',
                })
            },
        }
    ]
    const state = {
        rxRecords,
        recordIds,

        // table props
        columns,
        data: new Map(),
        defaultSort: '_end_block',
        defaultSortAsc: false,
        loading: false,
        perPage: 10,
        onRowSelect: selectedIds => rxSelectedIds.next([...selectedIds]),
        rowProps: item => {
            const {
                approved,
                draft,
                rejected
            } = item
            return !rejected && draft
                ? {}
                : {
                    warning: rejected,
                    positive: approved,
                    title: approved
                        ? textsCap.approved
                        : rejected
                            ? textsCap.rejected
                            : ''
                }
        },
        searchExtraKeys: [
            'address',
            'hash',
            'approved',
            'workerAddress',
        ],
        selectable: true,
        topLeftMenu: [
            {
                active: false,
                content: textsCap.timer,
                icon: 'clock outline',
                key: 'timer',
                onClick: () => showForm(
                    TimekeepingForm,
                    { activityId }
                )
            },
            <SumDuration {...{
                data: rxRecords,
                ids: rxSelectedIds,
                key: 'sum'
            }} />,
        ],
        topRightMenu,
    }
    return state
}

export const getActionButtons = ({
    activityId,
    archive,
    manage,
    identity,
} = {}) => (record, recordId, asButton = true) => {
    const {
        approved,
        locked,
        // activityOwnerAddress,
        submit_status,
        workerAddress,
    } = record
    const editableStatuses = [
        statuses.draft,
        statuses.dispute,
        statuses.reject,
    ]
    const isSubmitted = submit_status === statuses.submit
    const inProgress = !!rxInProgressIds.value.get(recordId)
    // const isOwner = activityOwnerAddress === getSelected().address
    const isBtnInprogress = title => !!title
        && rxInProgressIds.value.get(recordId) === title
    const buttons = [
        {
            icon: 'eye',
            // Show details of the record in a modal
            onClick: () => TimekeepingDetailsForm.asModal({
                activityId,
                archive,
                manage,
                identity,
                recordId,
            }),
            title: textsCap.recordDetails,
        },
        !archive && {
            disabled: inProgress
                || !editableStatuses.includes(submit_status)
                || locked
                || approved,
            hidden: manage,
            icon: 'pencil',
            loading: isBtnInprogress(textsCap.edit),
            onClick: () => handleEdit(
                record,
                recordId,
                textsCap.edit,
            ),
            title: textsCap.edit,
        },
        !archive && {
            disabled: inProgress || !isSubmitted,
            hidden: !manage || approved,
            icon: 'check',
            loading: isBtnInprogress(textsCap.approve),
            onClick: () => handleApprove(
                record,
                recordId,
                true,
                textsCap.approve,
            ),
            positive: true,
            title: textsCap.approve,
        },
        !archive && {
            // set as draft button
            disabled: inProgress,
            hidden: !manage || !approved,
            icon: 'reply',
            loading: isBtnInprogress(textsCap.setAsDraft),
            onClick: (record, recordId, records) => confirm({
                content: <h3>{textsCap.setAsDraftDetailed}?</h3>,
                onConfirm: () => handleSetAsDraft(
                    record,
                    recordId,
                    textsCap.setAsDraft,
                ),
                size: 'tiny',
            }),
            title: textsCap.setAsDraft,
        },
        // !archive && {
        //     // dispute button
        //     disabled: inProgress
        //         || !isSubmitted
        //         || approved
        //         || !isOwner,
        //     hidden: !manage,
        //     icon: 'bug',
        //     loading: isBtnInprogress(textsCap.dispute),
        //     onClick: toBeImplemented,
        //     title: textsCap.dispute,
        // },
        !archive && {
            // reject button
            disabled: inProgress || !isSubmitted,
            hidden: !manage,
            icon: 'close',
            loading: isBtnInprogress(textsCap.reject),
            onClick: () => confirm({
                confirmButton: <Button negative content={textsCap.reject} />,
                onConfirm: () => handleApprove(
                    record,
                    recordId,
                    false,
                    textsCap.reject
                ),
                size: 'tiny'
            }),
            negative: true,
            title: textsCap.reject,
        },
        archive && {
            disabled: inProgress,
            icon: 'reply all',
            loading: isBtnInprogress(textsCap.unarchive),
            onClick: () => handleArchive(
                recordId,
                false,
                workerAddress
            ),
            title: textsCap.unarchive
        }
    ].filter(Boolean)

    return buttons
        .filter(x => !x.hidden)
        .map((props, i) => {
            props.key ??= i + props.title
            return !asButton
                ? props
                : <Button {...props} />
        })
}

// Approve or reject submitted time by a team member
const handleApprove = (
    record,
    recordId,
    approve = false,
    btnTitle
) => {
    if (!record) return
    const {
        activityId,
        activityOwnerAddress,
        submit_status,
        workerAddress,
    } = record
    const targetStatus = approve
        ? statuses.accept
        : statuses.reject
    const ignore = !workerAddress
        || submit_status !== statuses.submit
        || targetStatus === submit_status
    if (ignore) return

    setBtnInprogress(recordId, btnTitle)
    const actionTitle = approve
        ? textsCap.approveRecord
        : textsCap.rejectRecord
    const task = queueables.record.approve(
        activityOwnerAddress,
        workerAddress,
        activityId,
        recordId,
        approve,
        null,
        {
            title: `${textsCap.timekeeping} - ${actionTitle}`,
            description: `${textsCap.recordId}: ${recordId}`,
            then: () => setBtnInprogress(recordId),
        }
    )
    addToQueue(task)
}

// (Un)archive time record
const handleArchive = (recordId, archive = true, workerAddress) => {
    const title = archive
        ? textsCap.archiveRecord
        : textsCap.unarchiveRecord
    setBtnInprogress(recordId, title)
    const queueProps = bcQueueables.archiveRecord(
        workerAddress,
        hashTypes.timeRecordHash,
        recordId,
        archive,
        {
            title,
            description: `${textsCap.hash}: ${recordId}`,
            then: () => setBtnInprogress(recordId),
        }
    )
    addToQueue(queueProps)
}

const handleEdit = (record, recordId, btnTitle) => {
    const {
        activityId,
        activityName,
        duration,
        start_block,
        submit_status,
        total_blocks,
        workerAddress
    } = record
    setBtnInprogress(recordId, btnTitle)
    showForm(TimekeepingUpdateForm, {
        activityId,
        activityName,
        // remove it from inprogress list
        onClose: () => setBtnInprogress(recordId),
        recordId,
        values: {
            activityId,
            activityName,
            blockCount: total_blocks,
            blockEnd: start_block + total_blocks,
            blockStart: start_block,
            duration,
            status: submit_status,
            workerAddress,
        },
    })
}

const handleSetAsDraft = (record, recordId, btnTitle) => {
    const {
        activityId,
        activityOwnerAddress,
        approved,
        end_block,
        nr_of_breaks,
        posting_period,
        start_block,
        total_blocks,
    } = record || {}
    // allow activity owner to be able to set record as draft ONLY IF approved
    if (!approved || !identities.find(activityOwnerAddress)) return

    const reason = {
        ReasonCodeKey: 0,
        ReasonCodeTypeKey: 0
    }
    setBtnInprogress(recordId, btnTitle)
    const task = queueables.record.save(
        activityOwnerAddress,
        activityId,
        recordId,
        statuses.draft,
        reason,
        total_blocks,
        posting_period || 0,
        start_block,
        end_block,
        nr_of_breaks,
        {
            title: `${textsCap.timekeeping} - ${textsCap.setAsDraft}`,
            description: `${textsCap.recordId}: ${recordId}`,
            then: () => setBtnInprogress(recordId),
        }
    )
    addToQueue(task)
}

// add/remove buttons from the inprogress list.
// this list keeps track of which time recordId has specific action in progress 
// and disables the relevant button to prevent redundant transactions.
// MAKE SURE TO CHECK if the record ID is not already in the `rxInProgressIds`.
const setBtnInprogress = (recordId, btnTitle) => {
    const map = rxInProgressIds.value
    btnTitle
        // add entry
        ? map.set(recordId, btnTitle)
        // remove entry
        : map.delete(recordId)
    rxInProgressIds.next(new Map(map))
}