import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import uuid from 'uuid'
import { Bond } from 'oo7'
import { Button } from 'semantic-ui-react'
import DataTable from '../components/DataTable'
import FormBuilder from '../components/FormBuilder'
import { isArr, deferred, copyToClipboard, textEllipsis, isFn } from '../utils/utils'
import { BLOCK_DURATION_SECONDS, secondsToDuration, blockNumberToTS } from '../utils/time'
// Forms
import PartnerForm from '../forms/Partner'
import TimeKeepingForm, { TimeKeepingUpdateForm } from '../forms/TimeKeeping'
import TimeKeepingInviteForm from '../forms/TimeKeepingInvite'
// Services
import { hashTypes, queueables as bcQueueables, getCurrentBlock } from '../services/blockchain'
import identities, { getSelected, rxIdentities, rxSelected } from '../services/identity'
import { translated } from '../services/language'
import { confirm, showForm } from '../services/modal'
import partners, { rxPartners } from '../services/partner'
import { getProjects, statuses, query, queueables } from '../services/timeKeeping'
import { addToQueue } from '../services/queue'
import { getLayout } from '../services/window'
import PromisE from '../utils/PromisE'

const toBeImplemented = () => alert('To be implemented')

const [words, wordsCap] = translated({
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
    identity: 'identity',
    invoiced: 'invoiced',
    no: 'no',
    project: 'project',
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
}, true)
const [texts] = translated({
    addPartner: 'Add Partner',
    approveRecord: 'Approve record',
    archiveRecord: 'Archive record',
    bannedUser: 'User has been banned from this activity',
    banUser: 'Ban User',
    banUsers: 'Ban Users',
    blockStart: 'Start Block',
    blockEnd: 'End Block',
    blockCount: 'Number Of Blocks',
    cannotBanOwnIdentity: 'You cannot ban your own identity!',
    emptyMessage: 'No time records available.',
    emptyMessageArchive: 'No records have been archived yet',
    finishedAt: 'Finished at',
    orInviteATeamMember: 'invite someone to an activity?',
    noTimeRecords: 'Your team have not yet booked time. Maybe ',
    notProjectOwner: 'You do not own this activity',
    numberOfBreaks: 'Number Of Breaks',
    projectName: 'Activity Name',
    recordDetails: 'Record Details',
    recordId: 'Record ID',
    rejectRecord: 'Reject record',
    selectedIdentitiesAlreadyBanned: 'Selected identities are already banned',
    selectProjectForRecords: 'Please select an Activity to view the time records',
    setAsDraft: 'Set as draft',
    setAsDraftDetailed: 'Set as draft and force user to submit again',
    timeKeepingBanWarning: 'Warning: You are about to ban the following addresses permanently from the Activity named',
    uhOh: 'Uh oh!',
    unarchiveRecord: 'Restore from Archive',
    whatDoesThisMean: 'What does this mean?',
    whatDoesThisMeanItemOne: 'No further booking or other actions will be accepted from the Team',
    whatDoesThisMeanItemTwo: 'Only approved bookings will be visible to you',
})
const statusTexts = {}
statusTexts[statuses.draft] = words.draft
statusTexts[statuses.submit] = words.submitted
statusTexts[statuses.dispute] = words.disputed
statusTexts[statuses.reject] = words.rejected
statusTexts[statuses.accept] = words.approved
statusTexts[statuses.invoice] = words.invoiced
statusTexts[statuses.delete] = words.deleted

// trigger refresh on not-archived records tables if multiple open at the same time 
const rxTrigger = new BehaviorSubject()
const rxInProgressIds = new BehaviorSubject()

export default class ProjectTimeKeepingList extends Component {
    constructor(props) {
        super(props)

        this.recordIds = []
        this.state = {
            inProgressHashes: [],
            columns: [
                { collapsing: true, key: '_end_block', title: texts.finishedAt },
                { collapsing: true, key: 'projectName', title: wordsCap.activity },
                { key: '_workerName', title: wordsCap.identity },
                { key: 'duration', textAlign: 'center', title: wordsCap.duration },
                // { key: 'start_block', title: texts.blockStart },
                // { key: 'end_block', title: texts.blockEnd },
                { collapsing: true, key: '_status', textAlign: 'center', title: wordsCap.status },
                {
                    collapsing: true,
                    content: this.getActionContent,
                    draggable: false,
                    style: { padding: '0px 5px' },
                    textAlign: 'center',
                    title: wordsCap.action,
                }
            ],
            data: new Map(),
            defaultSort: '_status',
            defaultSortAsc: false,
            loading: false,
            perPage: 10,
            rowProps: item => {
                const { address, approved, draft, rejected } = item
                // if (isBanned) return { error: true, title: texts.bannedUser }
                return !rejected && draft ? {} : {
                    warning: rejected,
                    positive: approved,
                    title: approved ? wordsCap.approved : (rejected ? wordsCap.rejected : '')
                }
            },
            searchExtraKeys: ['address', 'hash', 'approved'],
            selectable: true,
            topLeftMenu: [
                {
                    active: false,
                    content: wordsCap.timer,
                    icon: 'clock outline',
                    key: 'timer',
                    onClick: () => showForm(TimeKeepingForm, { projectHash: this.props.projectHash })
                },
            ],
            topRightMenu: [
                {
                    content: wordsCap.approve,
                    icon: { color: 'green', name: 'check' },
                    key: 'actionApprove',
                    onClick: selectedKeys => selectedKeys.forEach(hash => this.handleApprove(hash, true)),
                },
                {
                    content: wordsCap.reject,
                    icon: { color: 'red', name: 'x' },
                    key: 'actionReject',
                    onClick: selectedKeys => selectedKeys.forEach(hash => this.handleApprove(hash, false)),
                },
                {
                    content: texts.banUser,
                    icon: { color: 'red', name: 'ban' },
                    key: 'actionBan',
                    onClick: toBeImplemented //this.handleBan
                },
                {
                    key: 'actionArchive',
                    onClick: selectedHashes => confirm({
                        content: `${wordsCap.selected}: ${selectedHashes.length}`,
                        header: `${this.props.archive ? texts.unarchiveRecord : texts.archiveRecord}?`,
                        onConfirm: () => selectedHashes.forEach(h => this.handleArchive(h, !this.props.archive)),
                        size: 'mini',
                    }),
                }
            ],
        }

        this.originalSetState = this.setState
        this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
    }

    async componentWillMount() {
        this._mounted = true
        this.unsubscribers = {}
        const { archive, manage, projectId } = this.props
        const { list, listArchive, listByProject, listByProjectArchive } = query.record
        let arg = !manage ? getSelected().address : projectId
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
        const queryFn = archive ?
            (manage ? listByProjectArchive : listArchive)
            : (manage ? listByProject : list)
        // subscribe to changes on the list of recordIds
        this.unsubscribers.recordIds = queryFn.call(null, arg, this.getRecords, multi)

        if (manage) {
            // auto update partner/identity names
            this.unsubscribers.identities = rxIdentities.subscribe(() =>
                this._mounted && this.processRecords(this.state.data)
            ).unsubscribe
            this.unsubscribers.partners = rxPartners.subscribe(() =>
                this._mounted && this.processRecords(this.state.data)
            ).unsubscribe
        }

        // reset everything on selected address change
        this.unsubscribers.selected = rxSelected.subscribe(() => {
            if (!this._mounted) return
            if (!this.ignoredFirst) {
                this.ignoredFirst = true
                return
            }
            this.componentWillUnmount()
            this.componentWillMount()
        })

        this.unsubscribers.inProgressIds = rxInProgressIds.subscribe(ar =>
            this._mounted && this.setState({ inProgressHashes: ar })
        ).unsubscribe
        // update record details whenever triggered
        this.unsubscribers.trigger = archive && rxTrigger.subscribe(() =>
            this._mounted && this.getRecords()
        ).unsubscribe
    }

    componentWillUnmount() {
        this._mounted = false
        Object.values(this.unsubscribers).forEach(fn => isFn(fn) && fn())
    }

    getActionContent = (record, hash) => {
        const { archive, manage } = this.props
        const { inProgressHashes } = this.state
        const {
            approved, duration, locked,
            projectHash, projectName, projectOwnerAddress,
            start_block, submit_status, total_blocks,
            workerAddress
        } = record
        const editableStatuses = [statuses.draft, statuses.dispute, statuses.reject]
        const isSubmitted = submit_status === statuses.submit
        const inProgress = inProgressHashes.includes(hash)
        const isOwner = projectOwnerAddress === getSelected().address
        const detailsBtn = {
            icon: 'eye',
            onClick: () => this.showDetails(hash, record),
            title: texts.recordDetails,
        }
        const buttons = !archive ? [
            detailsBtn,
            {
                disabled: inProgress || !editableStatuses.includes(submit_status) || locked || approved,
                hidden: manage,
                icon: 'pencil',
                onClick: () => showForm(
                    TimeKeepingUpdateForm,
                    {
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
                        hash,
                        projectName,
                        onSubmit: ok => ok && this.updateTrigger()
                    }),
                title: wordsCap.edit,
            },
            {
                disabled: inProgress || !isSubmitted,
                hidden: !manage || approved,
                icon: 'check',
                onClick: () => this.handleApprove(hash, true),
                positive: true,
                title: wordsCap.approve,
            },
            {
                // set as draft button
                disabled: inProgress,
                hidden: !manage || !approved,
                icon: 'reply',
                onClick: () => confirm({
                    content: <h3>{texts.setAsDraftDetailed}?</h3>,
                    onConfirm: () => this.handleSetAsDraft(hash),
                    size: 'tiny',
                }),
                title: texts.setAsDraft,
            },
            {
                // dispute button
                disabled: inProgress || !isSubmitted || approved || !isOwner,
                hidden: !manage,
                icon: 'bug',
                onClick: toBeImplemented,
                title: wordsCap.dispute,
            },
            {
                // reject button
                disabled: inProgress || !isSubmitted,
                hidden: !manage,
                icon: 'close',
                onClick: () => confirm({
                    confirmButton: <Button negative content={wordsCap.reject} />,
                    onConfirm: () => this.handleApprove(hash, false),
                    size: 'tiny'
                }),
                negative: true,
                title: wordsCap.reject,
            },
        ] : [
                detailsBtn,
                {
                    disabled: inProgress,
                    icon: 'reply all',
                    onClick: () => this.handleArchive(hash, false),
                    title: wordsCap.unarchive
                }
            ]

        return buttons.map((x, i) => { x.key = i + x.title; return x })
            .filter(x => !x.hidden)
            .map(props => <Button {...props} />)
    }

    getRecords = deferred(async (recordIds) => {
        recordIds = (isArr(recordIds) ? recordIds : this.recordIds).flat()
        this.recordIds = recordIds
        if (!this.recordIds.length) return this.setState({ data: new Map() })

        // retrieve all record details
        let [records, projects, currentBlock] = await PromisE.all(
            query.record.get(recordIds, null, true),
            getProjects(),
            getCurrentBlock()
        )

        records = records.map((record, i) => {
            if (!record) return
            const { end_block, project_hash: projectHash, total_blocks, worker } = record
            const recordId = recordIds[i]
            const { name, ownerAddress } = projects.get(projectHash) || {}
            return [
                recordId,
                {
                    ...record,
                    // add extra information including duration in hh:mm:ss format
                    duration: secondsToDuration(total_blocks * BLOCK_DURATION_SECONDS),
                    hash: recordId, // 
                    projectHash,
                    workerAddress: worker || '',// && ss58Encode(worker) || '',
                    projectOwnerAddress: ownerAddress,
                    projectName: name,
                    _end_block: blockNumberToTS(end_block, currentBlock),
                }
            ]
        })

        this.processRecords(new Map(records))
    }, 150)

    // process record details and add extra information like worker name etc
    processRecords = records => Array.from(records || new Map()).forEach(([recordId, record]) => {
        const { locked, projectName, projectOwnerAddress, submit_status, workerAddress } = record
        record.approved = submit_status === statuses.accept
        record.rejected = submit_status === statuses.reject
        record.draft = submit_status === statuses.draft
        record.workerName = partners.getAddressName(workerAddress)
        record.projectName = projectName || wordsCap.unknown
        // banned = ....
        // if worker is not in the partner or identity lists, show button to add as partner
        record._workerName = record.workerName || (
            <Button
                content='Add Partner'
                onClick={() => showForm(PartnerForm, {
                    values: {
                        address: workerAddress,
                        associatedIdentity: projectOwnerAddress,
                    }
                })}
            />
        )
        record._status = locked ? words.locked : statusTexts[submit_status]
    }) | this.setState({ data: records })

    handleApprove = (hash, approve = false) => {
        const { data, inProgressHashes } = this.state
        const { projectHash, projectOwnerAddress, submit_status, workerAddress } = data.get(hash) || {}
        const targetStatus = approve ? statuses.accept : statuses.reject
        if (!workerAddress || submit_status !== statuses.submit || targetStatus === submit_status) return
        rxInProgressIds.next(inProgressHashes.concat(hash))
        const task = queueables.record.approve(projectOwnerAddress, workerAddress, projectHash, hash, approve, null, {
            title: `${wordsCap.timekeeping} - ${approve ? texts.approveRecord : texts.rejectRecord}`,
            description: `${texts.recordId}: ${hash}`,
            then: success => {
                rxInProgressIds.next(inProgressHashes.filter(h => h !== hash))
                success && this.updateTrigger()
            },
        })
        addToQueue(task)
    }

    handleArchive = (hash, archive = true) => {
        const { manage } = this.props
        const { data, inProgressHashes } = this.state
        const { projectOwnerAddress, workerAddress } = data.get(hash) || {}
        const address = manage ? projectOwnerAddress : workerAddress
        if (!address) return
        inProgressHashes.push(hash)
        this.setState({ inProgressHashes })

        addToQueue(bcQueueables.archiveRecord(address, hashTypes.timeRecordHash, hash, archive, {
            title: texts.archiveRecord,
            description: `${wordsCap.hash}: ${hash}`,
            then: () => {
                inProgressHashes.shift(hash)
                this.setState({ inProgressHashes })
            }
        }))
    }

    handleBan = (selectedHashes) => {

    }

    handleSetAsDraft = hash => {
        const { data, inProgressHashes } = this.state
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

        inProgressHashes.push(hash)
        this.setState({ inProgressHashes })
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
                title: `${wordsCap.timekeeping} - ${texts.setAsDraft}`,
                description: `${texts.recordId}: ${hash}`,
                then: success => {
                    inProgressHashes.shift(hash)
                    this.setState({ inProgressHashes })
                    success && this.updateTrigger()
                },
            }
        )
        addToQueue(task)
    }

    showDetails = (hash, record) => {
        const { manage } = this.props
        const isMobile = getLayout() === 'mobile'
        const {
            duration, end_block, nr_of_breaks, projectHash, projectName,
            start_block, total_blocks, workerAddress, workerName,
            _end_block, _status,
        } = record
        const inputs = [
            manage && [texts.projectName, projectName || projectHash],
            [texts.recordId, textEllipsis(hash, 30)],
            [wordsCap.worker, workerName || workerAddress],
            [wordsCap.status, _status],
            [wordsCap.duration, duration],
            [texts.numberOfBreaks, nr_of_breaks, 'number'],
            [texts.finishedAt, _end_block],
            [texts.blockCount, total_blocks],
            [texts.blockStart, start_block],
            [texts.blockEnd, end_block],
        ].filter(Boolean).map(([label, value, type]) => ({
            action: label !== texts.recordId ? undefined : { icon: 'copy', onClick: () => copyToClipboard(hash) },
            label,
            name: label,
            readOnly: true,
            type: type || 'text',
            value,
        }))

        const excludeActionTitles = [
            texts.recordDetails,
            wordsCap.edit,
        ]
        const actions = this.getActionContent(record, hash)
            .filter(button => !excludeActionTitles.includes(button.props.title))
            .map(button => ({
                ...button,
                props: {
                    ...button.props,
                    content: button.props.title,
                    fluid: isMobile,
                    style: { ...button.props.style, margin: 5, }
                }
            }))

        actions.length > 0 && inputs.push({
            content: <div style={{ textAlign: 'center' }}>{actions}</div>,
            name: 'actions',
            type: 'html'
        })

        showForm(FormBuilder, {
            closeText: wordsCap.close,
            header: texts.recordDetails,
            inputs,
            size: 'tiny',
            submitText: null,
        })
    }

    updateTrigger = () => this.props.archive ? this.getRecords() : rxTrigger.next()

    render() {
        const { archive, hideTimer, manage } = this.props
        const { columns, topLeftMenu, topRightMenu } = this.state
        columns.find(x => x.key === '_workerName').hidden = !manage
        topLeftMenu.find(x => x.key === 'timer').hidden = hideTimer
        topRightMenu.forEach(item => {
            // un/archive action is always visible
            if (item.key !== 'actionArchive') {
                item.hidden = !manage || archive
                return
            }
            item.content = archive ? wordsCap.unarchive : wordsCap.archive
            item.icon = archive ? 'reply all' : 'file archive'
        })
        this.state.emptyMessage = {
            content: archive ? texts.emptyMessageArchive : (
                <p>
                    {manage ? texts.noTimeRecords : texts.emptyMessage + ' '}
                    {manage && <Button
                        positive
                        content={texts.orInviteATeamMember}
                        onClick={() => showForm(TimeKeepingInviteForm)}
                    />}
                </p>
            )
        }
        return <DataTable {...this.state} />
    }
}
ProjectTimeKeepingList.propTypes = {
    // whether to retrieve archives
    archive: PropTypes.bool,
    hideTimer: PropTypes.bool,
    // manage records of projects owned by selected identity
    manage: PropTypes.bool,
    // manage single project
    projecthash: PropTypes.string,
}
ProjectTimeKeepingList.defaultProps = {
    archive: false,
    hideTimer: false,
    manage: false,
}