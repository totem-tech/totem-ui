import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject, Subject } from 'rxjs'
import { Button } from 'semantic-ui-react'
import PromisE from '../../utils/PromisE'
import { BLOCK_DURATION_SECONDS, secondsToDuration, blockNumberToTS } from '../../utils/time'
import { isArr, deferred, copyToClipboard, textEllipsis } from '../../utils/utils'
import DataTable from '../../components/DataTable'
import FormBuilder from '../../components/FormBuilder'
import { hashTypes, queueables as bcQueueables, getCurrentBlock } from '../../services/blockchain'
import { translated } from '../../services/language'
import { confirm, showForm } from '../../services/modal'
import { addToQueue } from '../../services/queue'
import { unsubscribe } from '../../services/react'
import { MOBILE, rxLayout } from '../../services/window'
import identities, { getSelected, rxIdentities, rxSelected } from '../identity/identity'
import { getAddressName, rxPartners } from '../partner/partner'
import PartnerForm from '../partner/PartnerForm'
import { getProjects, statuses, query, queueables } from './timekeeping'
import TimekeepingForm, { TimekeepingUpdateForm } from './TimekeeepingForm'
import TimekeeepingInviteForm from './TimekeeepingInviteForm'

const toBeImplemented = () => alert('To be implemented')

const textsCap = translated({
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
}, true)[1]
const statusTexts = {}
statusTexts[statuses.draft] = textsCap.draft
statusTexts[statuses.submit] = textsCap.submitted
statusTexts[statuses.dispute] = textsCap.disputed
statusTexts[statuses.reject] = textsCap.rejected
statusTexts[statuses.accept] = textsCap.approved
statusTexts[statuses.invoice] = textsCap.invoiced
statusTexts[statuses.delete] = textsCap.deleted

// trigger refresh on not-archived records tables if multiple open at the same time 
const rxTrigger = new BehaviorSubject()
const rxInProgressIds = new BehaviorSubject([])

export default class ProjectTimeKeepingList extends Component {
    constructor(props) {
        super(props)

        this.recordIds = []
        this.state = {
            inProgressHashes: [],
            columns: [
                { collapsing: true, key: '_end_block', title: textsCap.finishedAt },
                { key: 'projectName', title: textsCap.activity },
                { key: '_workerName', title: textsCap.identity },
                { key: 'duration', textAlign: 'center', title: textsCap.duration },
                // { key: 'start_block', title: texts.blockStart },
                // { key: 'end_block', title: texts.blockEnd },
                { collapsing: true, key: '_status', textAlign: 'center', title: textsCap.status },
                {
                    collapsing: true,
                    content: this.getActionContent,
                    draggable: false,
                    style: { padding: '0px 5px' },
                    textAlign: 'center',
                    title: textsCap.action,
                }
            ],
            data: new Map(),
            defaultSort: '_status',
            defaultSortAsc: false,
            loading: false,
            perPage: 10,
            rowProps: item => {
                const { approved, draft, rejected } = item
                return !rejected && draft ? {} : {
                    warning: rejected,
                    positive: approved,
                    title: approved ? textsCap.approved : (rejected ? textsCap.rejected : '')
                }
            },
            searchExtraKeys: ['address', 'hash', 'approved'],
            selectable: true,
            topLeftMenu: [
                {
                    active: false,
                    content: textsCap.timer,
                    icon: 'clock outline',
                    key: 'timer',
                    onClick: () => showForm(TimekeepingForm, { projectHash: this.props.projectHash })
                },
            ],
            topRightMenu: [
                {
                    content: textsCap.approve,
                    icon: { color: 'green', name: 'check' },
                    key: 'actionApprove',
                    onClick: selectedKeys => selectedKeys.forEach(hash => this.handleApprove(hash, true)),
                },
                {
                    content: textsCap.reject,
                    icon: { color: 'red', name: 'x' },
                    key: 'actionReject',
                    onClick: selectedKeys => selectedKeys.forEach(hash => this.handleApprove(hash, false)),
                },
                {
                    content: textsCap.banUser,
                    icon: { color: 'red', name: 'ban' },
                    key: 'actionBan',
                    onClick: toBeImplemented //this.handleBan
                },
                {
                    key: 'actionArchive',
                    onClick: selectedHashes => confirm({
                        content: `${textsCap.selected}: ${selectedHashes.length}`,
                        header: `${this.props.archive ? textsCap.unarchiveRecord : textsCap.archiveRecord}?`,
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
        this.subscriptions = {}
        this.ignoredFirst = false
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
        const queryFn = archive
            ? (manage ? listByProjectArchive : listArchive)
            : (manage ? listByProject : list)
        // subscribe to changes on the list of recordIds
        this.subscriptions.recordIds = queryFn.call(null, arg, this.getRecords, multi)

        if (manage) {
            // auto update partner/identity names
            this.subscriptions.identities = rxIdentities.subscribe(() =>
                this._mounted && this.processRecords(this.state.data)
            )
            this.subscriptions.partners = rxPartners.subscribe(() =>
                this._mounted && this.processRecords(this.state.data)
            )
        }

        // reset everything on selected address change
        this.subscriptions.selected = rxSelected.subscribe(() => {
            if (!this._mounted) return
            if (!this.ignoredFirst) {
                this.ignoredFirst = true
                return
            }
            this.componentWillUnmount()
            this.componentWillMount()
        })

        this.subscriptions.inProgressIds = rxInProgressIds.subscribe(ar =>
            this._mounted && this.setState({ inProgressHashes: ar })
        )
        // update record details whenever triggered
        this.subscriptions.trigger = archive && rxTrigger.subscribe(() =>
            this._mounted && this.getRecords()
        )
    }

    componentWillUnmount() {
        this._mounted = false
        unsubscribe(this.subscriptions)
    }

    getActionContent = (record, hash) => {
        const { archive, manage } = this.props
        const { inProgressHashes = [] } = this.state
        const {
            approved, duration, locked,
            projectHash, projectName, projectOwnerAddress,
            start_block, submit_status, total_blocks,
            workerAddress
        } = record
        // const editableStatuses = [statuses.draft, statuses.dispute, statuses.reject]
        const isSubmitted = submit_status === statuses.submit
        const inProgress = inProgressHashes.includes(hash)
        const isOwner = projectOwnerAddress === getSelected().address
        const detailsBtn = {
            icon: 'eye',
            onClick: () => this.showDetails(hash, record),
            title: textsCap.recordDetails,
        }
        const buttons = !archive ? [
            detailsBtn,
            // {
            //     disabled: inProgress || !editableStatuses.includes(submit_status) || locked || approved,
            //     hidden: manage,
            //     icon: 'pencil',
            //     onClick: () => showForm(
            //         TimekeepingUpdateForm,
            //         {
            //             values: {
            //                 blockCount: total_blocks,
            //                 blockEnd: start_block + total_blocks,
            //                 blockStart: start_block,
            //                 duration,
            //                 projectHash,
            //                 projectName,
            //                 status: submit_status,
            //                 workerAddress,
            //             },
            //             hash,
            //             projectName,
            //             onSubmit: ok => ok && this.updateTrigger()
            //         }),
            //     title: wordsCap.edit,
            // },
            {
                disabled: inProgress || !isSubmitted,
                hidden: !manage || approved,
                icon: 'check',
                onClick: () => this.handleApprove(hash, true),
                positive: true,
                title: textsCap.approve,
            },
            {
                // set as draft button
                disabled: inProgress,
                hidden: !manage || !approved,
                icon: 'reply',
                onClick: () => confirm({
                    content: <h3>{textsCap.setAsDraftDetailed}?</h3>,
                    onConfirm: () => this.handleSetAsDraft(hash),
                    size: 'tiny',
                }),
                title: textsCap.setAsDraft,
            },
            {
                // dispute button
                disabled: inProgress || !isSubmitted || approved || !isOwner,
                hidden: !manage,
                icon: 'bug',
                onClick: toBeImplemented,
                title: textsCap.dispute,
            },
            {
                // reject button
                disabled: inProgress || !isSubmitted,
                hidden: !manage,
                icon: 'close',
                onClick: () => confirm({
                    confirmButton: <Button negative content={textsCap.reject} />,
                    onConfirm: () => this.handleApprove(hash, false),
                    size: 'tiny'
                }),
                negative: true,
                title: textsCap.reject,
            },
        ] : [
                detailsBtn,
                {
                    disabled: inProgress,
                    icon: 'reply all',
                    onClick: () => this.handleArchive(hash, false),
                    title: textsCap.unarchive
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
        record.workerName = getAddressName(workerAddress)
        record.projectName = projectName || textsCap.unknown
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
        record._status = locked ? textsCap.locked : statusTexts[submit_status]
    }) | this.setState({ data: records })

    handleApprove = (hash, approve = false) => {
        const { data, inProgressHashes = [] } = this.state
        const { projectHash, projectOwnerAddress, submit_status, workerAddress } = data.get(hash) || {}
        const targetStatus = approve ? statuses.accept : statuses.reject
        if (!workerAddress || submit_status !== statuses.submit || targetStatus === submit_status) return
        rxInProgressIds.next(inProgressHashes.concat(hash))
        const task = queueables.record.approve(projectOwnerAddress, workerAddress, projectHash, hash, approve, null, {
            title: `${textsCap.timekeeping} - ${approve ? textsCap.approveRecord : textsCap.rejectRecord}`,
            description: `${textsCap.recordId}: ${hash}`,
            then: success => {
                rxInProgressIds.next(inProgressHashes.filter(h => h !== hash))
                success && this.updateTrigger()
            },
        })
        addToQueue(task)
    }

    handleArchive = (hash, archive = true) => {
        const { manage } = this.props
        const { data, inProgressHashes = [] } = this.state
        const { projectOwnerAddress, workerAddress } = data.get(hash) || {}
        const address = manage ? projectOwnerAddress : workerAddress
        if (!address) return
        inProgressHashes.push(hash)
        this.setState({ inProgressHashes })

        addToQueue(bcQueueables.archiveRecord(address, hashTypes.timeRecordHash, hash, archive, {
            title: textsCap.archiveRecord,
            description: `${textsCap.hash}: ${hash}`,
            then: () => {
                inProgressHashes.shift(hash)
                this.setState({ inProgressHashes })
            }
        }))
    }

    handleBan = (selectedHashes) => {

    }

    handleSetAsDraft = hash => {
        const { data, inProgressHashes = [] } = this.state
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
                title: `${textsCap.timekeeping} - ${textsCap.setAsDraft}`,
                description: `${textsCap.recordId}: ${hash}`,
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
        const { inProgressHashes } = this.state
        const isMobile = rxLayout.value === MOBILE
        const editableStatuses = [statuses.draft, statuses.dispute, statuses.reject]
        const inProgress = inProgressHashes.includes(hash)
        const {
            approved,
            duration,
            end_block,
            locked,
            nr_of_breaks,
            projectHash,
            projectName,
            start_block,
            submit_status,
            total_blocks,
            workerAddress,
            workerName,
            _end_block,
            _status,
        } = record
        const inputs = [
            manage && [textsCap.projectName, projectName || projectHash],
            [textsCap.recordId, textEllipsis(hash, 30)],
            [textsCap.worker, workerName || workerAddress],
            [textsCap.status, _status],
            [textsCap.duration, duration],
            [textsCap.numberOfBreaks, nr_of_breaks, 'number'],
            [textsCap.finishedAt, _end_block],
            [textsCap.blockCount, total_blocks],
            [textsCap.blockStart, start_block],
            [textsCap.blockEnd, end_block],
        ].filter(Boolean).map(([label, value, type]) => ({
            action: label !== textsCap.recordId ? undefined : { icon: 'copy', onClick: () => copyToClipboard(hash) },
            label,
            name: label,
            readOnly: true,
            type: type || 'text',
            value,
        })).concat({
            type: 'html',
            name: 'update-button',
            content: (
                <Button {...{
                    disabled: inProgress || !editableStatuses.includes(submit_status) || locked || approved,
                    hidden: manage,
                    icon: 'pencil',
                    onClick: () => showForm(
                        TimekeepingUpdateForm,
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
                    title: textsCap.edit,
                }} />
            ),
        })

        const excludeActionTitles = [
            textsCap.recordDetails,
            textsCap.edit,
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
            closeText: textsCap.close,
            header: textsCap.recordDetails,
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
            item.content = archive ? textsCap.unarchive : textsCap.archive
            item.icon = archive ? 'reply all' : 'file archive'
        })
        this.state.emptyMessage = {
            content: archive ? textsCap.emptyMessageArchive : (
                <p>
                    {manage ? textsCap.noTimeRecords : textsCap.emptyMessage + ' '}
                    {manage && (
                        <Button
                            positive
                            content={textsCap.orInviteATeamMember}
                            onClick={() => showForm(TimekeeepingInviteForm)}
                        />
                    )}
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