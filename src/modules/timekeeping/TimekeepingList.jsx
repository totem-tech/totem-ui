import React, { Component } from 'react'
import PropTypes from 'prop-types'
import uuid from 'uuid'
import { BehaviorSubject } from 'rxjs'
import PromisE from '../../utils/PromisE'
import { blockToDate } from '../../utils/time'
import { isArr, deferred, isFn, isBool } from '../../utils/utils'
import { Button } from '../../components/buttons'
import DataTable from '../../components/DataTable'
import {
    hashTypes,
    queueables as bcQueueables,
    getCurrentBlock,
} from '../../services/blockchain'
import { translated } from '../../services/language'
import { confirm, showForm } from '../../services/modal'
import { addToQueue } from '../../services/queue'
import { unsubscribe } from '../../services/react'
import { MOBILE, rxLayout } from '../../services/window'
import identities, {
    get as getIdentity,
    getSelected,
    rxIdentities,
    rxSelected,
} from '../identity/identity'
import AddressName from '../partner/AddressName'
import { rxPartners } from '../partner/partner'
import TimekeepingForm, { TimekeepingUpdateForm } from './TimekeepingForm'
import SumDuration from './SumDuration'
import {
    getProjects,
    statuses,
    query,
    queueables,
    blocksToDuration,
    rxDurtionPreference,
} from './timekeeping'
import TimekeepingDetailsForm from './TimekeepingDetails'
import TimekeepingInviteForm from './TimekeepingInviteForm'

const toBeImplemented = () => alert('To be implemented')

let textsCap = {
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
    unknown: 'unknown',
    worker: 'worker',
    
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
    projectName: 'activity name',
    recordDetails: 'record details',
    recordId: 'record ID',
    rejectRecord: 'reject record',
    setAsDraft: 'set as draft',
    setAsDraftDetailed: 'set as draft and force user to submit again',
    unarchiveRecord: 'restore from archive',
    workerIdentity: 'worker identity',
}
textsCap = translated(textsCap, true)[1]
const statusTexts = {}
statusTexts[statuses.draft] = textsCap.draft
statusTexts[statuses.submit] = textsCap.submitted
statusTexts[statuses.dispute] = textsCap.disputed
statusTexts[statuses.reject] = textsCap.rejected
statusTexts[statuses.accept] = textsCap.approved
statusTexts[statuses.invoice] = textsCap.invoiced
statusTexts[statuses.delete] = textsCap.deleted

// trigger refresh on not-archived records tables if multiple open at the same time 
export const rxTrigger = new BehaviorSubject()
const rxInProgressIds = new BehaviorSubject([])

class TimeKeepingList extends Component {
    constructor(props) {
        super(props)

        const { manage } = props
        this.recordIds = []
        this.rxData = new BehaviorSubject(new Map())
        this.rxSelectedIds = new BehaviorSubject([])
        this.inProgressBtns = new Map()
        const columns = [
            {
                collapsing: true,
                hidden: () => this.state.isMobile,
                key: '_end_block',
                title: textsCap.finishedAt,
            },
            {
                hidden: () => manage && this.state.isMobile,
                key: 'projectName',
                title: textsCap.activity,
                style: { minWidth: 125 }
            },
            {
                content: ({ workerAddress }) => <AddressName {...{ address: workerAddress }} />,
                draggableValueKey: 'workerAddress',
                key: 'workerAddress',
                title: textsCap.workerIdentity,
            },
            { key: 'duration', textAlign: 'center', title: textsCap.duration },
            // { key: 'start_block', title: texts.blockStart },
            // { key: 'end_block', title: texts.blockEnd },
            {
                collapsing: true,
                hidden: () => this.state.isMobile,
                key: '_status',
                textAlign: 'center',
                title: textsCap.status,
            },
            {
                collapsing: true,
                content: this.getActionButtons,
                draggable: false,
                style: { padding: '0px 5px' },
                textAlign: 'center',
                title: textsCap.action,
            }
        ]
        this.state = {
            columns,
            data: new Map(),
            defaultSort: '_end_block',
            defaultSortAsc: false,
            inProgressIds: [],
            isMobile: props.isMobile,
            loading: false,
            perPage: 10,
            onRowSelect: selectedIds => this.rxSelectedIds.next([...selectedIds]),
            rowProps: item => {
                const { approved, draft, rejected } = item
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
                    onClick: () => showForm(TimekeepingForm, {
                        projectHash: this.props.projectHash,
                    })
                },
                (
                    <SumDuration {...{
                        data: this.rxData,
                        ids: this.rxSelectedIds,
                        key: 'sum'
                    }} />
                ),
            ],
            topRightMenu: [
                {
                    content: textsCap.approve,
                    icon: { color: 'green', name: 'check' },
                    key: 'actionApprove',
                    onClick: selectedKeys => selectedKeys.forEach(hash =>
                        this.handleApprove(hash, true)
                    ),
                },
                {
                    content: textsCap.reject,
                    icon: { color: 'red', name: 'x' },
                    key: 'actionReject',
                    onClick: selectedKeys => selectedKeys.forEach(hash =>
                        this.handleApprove(hash, false)
                    ),
                },
                {
                    content: textsCap.banUser,
                    icon: { color: 'red', name: 'ban' },
                    key: 'actionBan',
                    onClick: toBeImplemented //this.handleBan
                },
                {
                    key: 'actionArchive',
                    onClick: async selectedHashes => {
                        const { data } = this.state
                        const identities = rxIdentities.value
                        const arr = selectedHashes
                            .map(hash => {
                                const { workerAddress } = data.get(hash) || {}
                                return identities.get(workerAddress)
                                    && [hash, workerAddress]
                            })
                            .filter(Boolean)
                        if (!arr.length) return // none eligible

                        confirm({
                            content: `${textsCap.selected}: ${arr.length}`,
                            header: `${this.props.archive ? textsCap.unarchiveRecord : textsCap.archiveRecord}?`,
                            onConfirm: () => arr
                                .forEach(([hash, workerAddress]) => this.handleArchive(
                                    hash,
                                    !this.props.archive,
                                    workerAddress,
                                )),
                            size: 'mini',
                        })
                    },
                }
            ],
        }

        this.originalSetState = this.setState
        this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
    }

    async componentWillMount() {
        this._mounted = true
        this.subs = this.subs || {}
        // reset everything on selected address change
        this.subs.selected = rxSelected.subscribe(this.init)
        this.subs.preference = rxDurtionPreference.subscribe(this.updateRecords)
    }

    componentWillUnmount() {
        this._mounted = false
        unsubscribe(this.subs)
    }

    init = deferred(async () => {
        this.subs = this.subs || {}
        unsubscribe(this.subs)
        const {
            archive,
            isMobile,
            manage,
            projectId,
        } = this.props
        const {
            list,
            listArchive,
            listByProject,
            listByProjectArchive,
        } = query.record
        let arg = !manage
            ? getSelected().address
            : projectId
        let multi = false
        if (manage && !arg) {
            const projects = await getProjects()
            const projectIds = Array.from(projects)
                // filter projects
                .map(([projectId, { isOwner }]) => isOwner && projectId)
                .filter(Boolean)
            arg = projectIds
            multi = true
        }
        const queryFn = archive
            ? manage
                ? listByProjectArchive
                : listArchive
            : manage
                ? listByProject
                : list
        this.loaded = false

        // subscribe to changes on the list of recordIds
        const handleResult = deferred((...args) => {
            this.loaded = true
            this.updateRecords(...args)
        }, 500)
        this.subs.recordIds = queryFn(arg, handleResult, multi)

        if (manage) {
            // auto update partner/identity names
            let idIgnrFirst = false
            this.subs.identities = rxIdentities.subscribe(() => {
                if (!idIgnrFirst) {
                    idIgnrFirst = true
                    return
                }
                this.setTableData(this.rxData.value)
            })
            let partIgnrFirst = false
            this.subs.partners = rxPartners.subscribe(() => {
                if (!partIgnrFirst) {
                    partIgnrFirst = true
                    return
                }
                this.setTableData(this.rxData.value)
            })
        }

        this.subs.inProgressIds = rxInProgressIds.subscribe(ar => {
            this.setState({ inProgressIds: ar })
            // this.updateRecords()
        })
        // update record details whenever triggered
        this.subs.trigger = rxTrigger.subscribe(() => {
            this.updateRecords()
        })
        if (isBool(isMobile)) return // externally controlled
        this.subs.isMobile = rxLayout.subscribe(l =>
            this.setState({ isMobile: l === MOBILE })
        )
    }, 500)

    getActionButtons = (record, hash, asButton = true) => {
        const { archive, manage } = this.props
        const { inProgressIds = [] } = this.state
        const {
            approved,
            locked,
            // projectOwnerAddress,
            submit_status,
            workerAddress,
        } = record
        const editableStatuses = [
            statuses.draft,
            statuses.dispute,
            statuses.reject,
        ]
        const isSubmitted = submit_status === statuses.submit
        const inProgress = inProgressIds.includes(hash)
        // const isOwner = projectOwnerAddress === getSelected().address
        const isBtnInprogress = title =>  this.inProgressBtns.get(hash) === title
        const buttons = [
            {
                icon: 'eye',
                onClick: () => this.showDetails(hash, record),
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
                onClick: () => this.handleEdit(
                    record,
                    hash,
                    textsCap.edit,
                ),
                title: textsCap.edit,
            },
            !archive && {
                disabled: inProgress || !isSubmitted,
                hidden: !manage || approved,
                icon: 'check',
                loading: isBtnInprogress(textsCap.approve),
                onClick: () => this.handleApprove(
                    hash,
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
                onClick: () => confirm({
                    content: <h3>{textsCap.setAsDraftDetailed}?</h3>,
                    onConfirm: () => this.handleSetAsDraft(
                        hash,
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
                    onConfirm: () => this.handleApprove(hash, false, textsCap.reject),
                    size: 'tiny'
                }),
                negative: true,
                title: textsCap.reject,
            },
            archive && {
                disabled: inProgress,
                icon: 'reply all',
                loading: isBtnInprogress(textsCap.unarchive),
                onClick: () => this.handleArchive(hash, false, workerAddress),
                title: textsCap.unarchive
            }
        ].filter(Boolean)

        return buttons
            .map((x, i) => {
                x.key = i + x.title
                return x
            })
            .filter(x => !x.hidden)
            .map(props => !asButton
                ? props
                : <Button {...props} />
            )
    }

    updateRecords = deferred(async (recordIds) => {
        recordIds = [
            ...isArr(recordIds)
                ? recordIds || []
                : this.recordIds || []
        ].flat()
        this.recordIds = recordIds
        if (!this.recordIds.length) return this.setTableData({ data: new Map() })

        // retrieve all record details
        let [records, projects, currentBlock] = await PromisE.all(
            query.record.get(recordIds, null, true),
            getProjects(),
            getCurrentBlock()
        )

        records = records.map((record, i) => {
            if (!record) return
            
            const {
                end_block,
                project_hash: projectHash,
                start_block,
                total_blocks,
                worker,
            } = record
            const recordId = recordIds[i]
            const { name, ownerAddress } = projects.get(projectHash) || {}
            
            return [
                recordId,
                {
                    ...record,
                    // add extra information including duration in hh:mm:ss format
                    duration: blocksToDuration(total_blocks),
                    hash: recordId, // 
                    projectHash,
                    workerAddress: worker || '',// && ss58Encode(worker) || '',
                    projectOwnerAddress: ownerAddress,
                    projectName: name,
                    _end_block: blockToDate(end_block, currentBlock),
                    _start_block: blockToDate(start_block, currentBlock),
                }
            ]
        })
        this.setTableData(new Map(records))
    }, 150)

    // add extra information to records like worker name etc and then set table data
    setTableData = deferred(records => {
        Array
            .from(records || new Map())
            .forEach(([recordId, record]) => {
                const {
                    locked,
                    projectName,
                    projectOwnerAddress,
                    submit_status,
                    workerAddress,
                } = record
                record.approved = submit_status === statuses.accept
                record.rejected = submit_status === statuses.reject
                record.draft = submit_status === statuses.draft
                record.projectName = projectName || textsCap.unknown
                record._status = locked
                    ? textsCap.locked
                    : statusTexts[submit_status]
            })
        records = new Map(Array.from(records))
        this.rxData.next(records)
        this.setState({ data: records })
    }, 200)

    handleApprove = (hash, approve = false, title) => {
        const { data } = this.state
        const {
            projectHash,
            projectOwnerAddress,
            submit_status,
            workerAddress,
        } = data.get(hash) || {}
        const targetStatus = approve
            ? statuses.accept
            : statuses.reject
        const ignore = !workerAddress
            || submit_status !== statuses.submit
            || targetStatus === submit_status
        if (ignore) return

        this.setBtnInprogress(hash, title)
        const actionTitle = approve
            ? textsCap.approveRecord
            : textsCap.rejectRecord
        const task = queueables.record.approve(
            projectOwnerAddress,
            workerAddress,
            projectHash,
            hash,
            approve,
            null,
            {
                title: `${textsCap.timekeeping} - ${actionTitle}`,
                description: `${textsCap.recordId}: ${hash}`,
                then: success => {
                    this.setBtnInprogress(hash)

                    if (!success) return
                    this.updateTrigger()
                },
            }
        )
        addToQueue(task)
    }

    handleArchive = (recordId, archive = true, workerAddress) => {
        const title = archive
            ? textsCap.archiveRecord
            : textsCap.unarchiveRecord
        this.setBtnInprogress(recordId, title)
        const queueProps = bcQueueables.archiveRecord(
            workerAddress,
            hashTypes.timeRecordHash,
            recordId,
            archive,
            {
                title,
                description: `${textsCap.hash}: ${recordId}`,
                then: () => {
                    this.setBtnInprogress(recordId)
                    this.updateTrigger()
                }
            }
        )
        addToQueue(queueProps)
    }

    handleBan = (selectedHashes) => {
        
    }

    handleEdit = (record, recordId, title) => {
        const {
            duration,
            projectHash,
            projectName,
            start_block,
            submit_status,
            total_blocks,
            workerAddress
        } = record
        this.setBtnInprogress(recordId, title)
        showForm(TimekeepingUpdateForm, {
            values: {
                blockCount: total_blocks,
                blockEnd: start_block + total_blocks,
                blockStart: start_block,
                duration,
                projectHash,
                projectName,
                status: submit_status,
                workerAddress,
            },
            hash: recordId,
            projectName,
            // if closed without submitting
            onClose: () => this.setBtnInprogress(recordId),
            onSubmit: success => {
                if (!success) return
                this.setBtnInprogress(recordId)
                this.updateTrigger()
            }
        })
    }

    handleSetAsDraft = (hash, title) => {
        const { data } = this.state
        const {
            approved,
            end_block,
            nr_of_breaks,
            posting_period,
            projectHash,
            projectOwnerAddress,
            start_block,
            total_blocks,
        } = data.get(hash) || {}
        // allow project owner to be able to procees only if approved
        if (!approved || !identities.find(projectOwnerAddress)) return

        const reason = {
            ReasonCodeKey: 0,
            ReasonCodeTypeKey: 0
        }
        this.setBtnInprogress(hash, title)
        const task = queueables.record.save(
            projectOwnerAddress,
            projectHash,
            hash,
            statuses.draft,
            reason,
            total_blocks,
            posting_period || 0,
            start_block,
            end_block,
            nr_of_breaks,
            {
                title: `${textsCap.timekeeping} - ${textsCap.setAsDraft}`,
                description: `${textsCap.recordId}: ${hash}`,
                then: success => {
                    this.setBtnInprogress(hash)
                    if (!success) return

                    this.updateTrigger()
                },
            }
        )
        addToQueue(task)
    }

    setBtnInprogress = (recordId, title) => {
        const ids = rxInProgressIds.value
        if (title) { 
            // add entry
            this.inProgressBtns.set(recordId, title)
            rxInProgressIds.next(ids.concat(recordId))
        } else {
            this.inProgressBtns.delete(recordId)
            rxInProgressIds.next(ids.filter(id => id !== recordId))
        }
    }

    showDetails = (recordId) => {
        const { manage } = this.props
        const { isMobile } = this.state
        TimekeepingDetailsForm.asModal({
            getActionButtons: this.getActionButtons,
            isMobile,
            manage,
            recordId,
            rxData: this.rxData,
            rxInProgressIds,
        })
    }
    
    updateTrigger = deferred(() => rxTrigger.next(uuid.v1()), 150)

    render() {
        const { archive, hideTimer, manage } = this.props
        const { columns, topLeftMenu, topRightMenu } = this.state
        columns.find(x => x.key === 'workerAddress').hidden = !manage
        topLeftMenu.find(x => x.key === 'timer').hidden = hideTimer
        topRightMenu.forEach(item => {
            // un/archive action is always visible
            if (item.key !== 'actionArchive') {
                item.hidden = !manage || archive
                return
            }
            item.content = archive ? textsCap.unarchive : textsCap.archive
            item.icon = archive ? 'reply all' : 'file archive'
        })
        this.state.emptyMessage = {
            content: !this.loaded
                ? textsCap.loading
                : archive
                    ? textsCap.emptyMessageArchive
                    : (
                        <p>
                            {manage ? textsCap.noTimeRecords : textsCap.emptyMessage + ' '}
                            {manage && (
                                <Button
                                    positive
                                    content={textsCap.orInviteATeamMember}
                                    onClick={() => showForm(TimekeepingInviteForm)}
                                />
                            )}
                        </p>
                    ),
            icon: !this.loaded,
            status: this.loaded
                ? undefined
                : 'loading',
        }
        return (
            <DataTable {...{
                ...this.props,
                ...this.state,
                columns: this.state.columns.map(column => ({
                    ...column,
                    hidden: isFn(column.hidden)
                        ? column.hidden()
                        : column.hidden
                })),
                style: {
                    paddingTop: 15,
                    ...this.props.style,
                    ...this.state.style,
                },
            }} />
        )
    }
}
TimeKeepingList.propTypes = {
    // whether to retrieve archives
    archive: PropTypes.bool,
    hideTimer: PropTypes.bool,
    // manage records of projects owned by selected identity
    manage: PropTypes.bool,
    // manage single project
    projecthash: PropTypes.string,
}
TimeKeepingList.defaultProps = {
    archive: false,
    hideTimer: false,
    manage: false,
}
export default React.memo(TimeKeepingList)