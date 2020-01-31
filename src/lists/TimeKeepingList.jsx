import React from 'react'
import PropTypes from 'prop-types'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import { Button } from 'semantic-ui-react'
import DataTable from '../components/DataTable'
import FormBuilder from '../components/FormBuilder'
import { isArr, textCapitalize, deferred, copyToClipboard, textEllipsis } from '../utils/utils'
// Forms
import PartnerForm from '../forms/Partner'
import TimeKeepingForm, { TimeKeepingUpdateForm } from '../forms/TimeKeeping'
import TimeKeepingInviteForm from '../forms/TimeKeepingInvite'
// Services
import { hashTypes } from '../services/blockchain'
import identities, { getSelected, selectedAddressBond } from '../services/identity'
import { confirm, showForm } from '../services/modal'
import partners from '../services/partners'
import { addToQueue, QUEUE_TYPES } from '../services/queue'
import { getTimeRecordsDetails, statuses, getTimeRecordsBonds } from '../services/timeKeeping'

const toBeImplemented = () => alert('To be implemented')

const words = {
    action: 'action',
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
    timer: 'timer',
    yes: 'yes',
    unarchive: 'unarchive',
    unknown: 'unknown',
    worker: 'worker',
}
const wordsCap = textCapitalize(words)
const texts = {
    addPartner: 'Add Partner',
    approveRecord: 'Approve record',
    archiveRecord: 'Archive record',
    bannedUser: 'User has been banned from this project',
    banUser: 'Ban User',
    banUsers: 'Ban Users',
    blockStart: 'Start Block',
    blockEnd: 'End Block',
    blockCount: 'Number Of Blocks',
    cannotBanOwnIdentity: 'You cannot ban your own identity',
    emptyMessage: 'No records available for this project. Start booking time yourself by cliking the timer button above',
    orInviteATeamMember: 'or invite a team member',
    notProjectOwner: 'You do not own this project',
    numberOfBreaks: 'Number Of Breaks',
    recordDetails: 'Record Details',
    recordId: 'Record ID',
    rejectRecord: 'Reject record',
    selectedIdentitiesAlreadyBanned: 'Selected identities are already banned',
    selectProjectForRecords: 'Please select a project to view time records',
    setAsDraft: 'Set as draft',
    setAsDraftDetailed: 'Set as draft and force user to submit again',
    timeKeeping: 'Time Keeping',
    timeKeepingBanWarning: 'You are about to ban the following addresses permanently from the project named',
    uhOh: 'Uh oh!',
    unarchiveRecord: 'Unarchive record',
    whatDoesThisMean: 'What does this mean?',
    whatDoesThisMeanItemOne: 'No further booking or other actions will be accepted from the user(s)',
    whatDoesThisMeanItemTwo: 'Only approved bookings will be visible to you',
}
const statusTexts = {}
statusTexts[statuses.draft] = words.draft
statusTexts[statuses.submit] = words.submitted
statusTexts[statuses.dispute] = words.disputed
statusTexts[statuses.reject] = words.rejected
statusTexts[statuses.accept] = words.approved
statusTexts[statuses.invoice] = words.invoiced
statusTexts[statuses.delete] = words.deleted

export default class ProjectTimeKeepingList extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.getRecords = deferred(this.getRecords, 150)
        this.hashList = []
        this.state = {
            inProgressHashes: [],
            columns: [
                { collapsing: true, key: 'projectName', title: wordsCap.project },
                { key: '_workerName', title: wordsCap.identity },
                { key: 'duration', textAlign: 'center', title: wordsCap.duration },
                { collapsing: true, key: '_status', textAlign: 'center', title: wordsCap.status },
                {
                    collapsing: true,
                    style: { padding: '0px 5px' },
                    content: this.getActionContent,
                    textAlign: 'center',
                    title: wordsCap.action,
                }
            ],
            data: new Map(),
            defaultSort: '_status',
            defaultSortAsc: false,
            emptyMessage: {
                content: (
                    <p>
                        {texts.emptyMessage + ' '}
                        <Button
                            positive
                            content={texts.orInviteATeamMember}
                            onClick={() => showForm(TimeKeepingInviteForm)}
                        />
                    </p>
                )
            },
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
                    key: 1,
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

    componentWillMount() {
        this._mounted = true

        // only update project & identity names
        // Bond.all([
        //     identities.bond,
        //     partners.bond,
        // ])
        this.tieIdSelected = selectedAddressBond.tie(this.setBond)
    }

    componentWillUnmount() {
        this._mounted = false
        const { bond, tieId, tieIdSelected } = this
        tieId && bond && bond.untie(tieId)
        tieIdSelected && selectedAddressBond.untie(tieIdSelected)
    }

    setBond = () => {
        const { address } = getSelected()
        const propsStr = JSON.stringify({ ...this.props, address })
        if (this.propsStr === propsStr) return

        const { archive, manage, projectHash } = this.props
        getTimeRecordsBonds(archive, manage, projectHash).then(bonds => {
            this.bond && this.bond.untie(this.tieId)
            this.propsStr = propsStr
            this.bond = Bond.all(bonds)
            this.tieId = this.bond.tie(this.getRecords)
        })
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
        const buttons = !archive ? [
            {
                icon: 'eye',
                onClick: () => this.showDetails(hash, record),
                title: texts.recordDetails,
            },
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
                            workerAddress,
                        },
                        hash,
                        projectName,
                        onSubmit: this.getRecords
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
                {
                    disabled: inProgress,
                    icon: 'reply all',
                    onClick: () => this.handleArchive(hash, false),
                    title: wordsCap.unarchive
                }
            ]

        return buttons.map((x, i) => { x.key = i + x.title; return x })
            .filter(x => !x.hidden)
            .map((props) => <Button {...props} />)
    }

    getRecords = hashList => {
        // only update list if changed
        if (hashList && JSON.stringify(hashList) === JSON.stringify(this.hashList)) return
        this.hashList = isArr(hashList) ? hashList : this.hashList
        if (this.hashList.length === 0) return this.setState({ data: new Map() })

        getTimeRecordsDetails(this.hashList).then(records => {
            Array.from(records).forEach(([_, record]) => this.processRecord(record))
            this.setState({ data: records })
        }, console.log)
    }

    // add extra details to record
    processRecord = record => {
        const { locked, submit_status, workerAddress, workerName } = record
        record.approved = submit_status === statuses.accept
        record.rejected = submit_status === statuses.reject
        record.draft = submit_status === statuses.draft
        // banned = ....
        record._workerName = workerName || (
            <Button
                content='Add Partner'
                onClick={() => showForm(PartnerForm, { values: { address: workerAddress } })}
            />
        )
        record._status = locked ? words.locked : statusTexts[submit_status]
    }

    handleApprove = (hash, approve = false) => {
        const { data, inProgressHashes } = this.state
        const { approved, projectHash, projectOwnerAddress, submit_status, workerAddress } = data.get(hash) || {}
        const targetStatus = approve ? statuses.accept : statuses.reject
        if (!workerAddress || submit_status !== statuses.submit || targetStatus === submit_status) return
        inProgressHashes.push(hash)
        this.setState({ inProgressHashes })
        // const reason = approve ? null : {.....}
        // timeKeeping.record.approve(workerAddress, projectHash, hash, approve)
        addToQueue({
            type: QUEUE_TYPES.BLOCKCHAIN,
            func: 'timeKeeping_record_approve',
            args: [projectOwnerAddress, workerAddress, projectHash, hash, approve],
            title: `${texts.timeKeeping} - ${approve ? texts.approveRecord : texts.rejectRecord}`,
            description: `${texts.recordId}: ${hash}`,
            then: success => {
                inProgressHashes.shift(hash)
                this.setState({ inProgressHashes })
                success && this.getRecords()
            },
        })
    }

    handleArchive = (hash, archive = true) => {
        const { manage } = this.props
        const { data, inProgressHashes } = this.state
        const { projectOwnerAddress, workerAddress } = data.get(hash) || {}
        const address = manage ? projectOwnerAddress : workerAddress
        if (!address) return
        inProgressHashes.push(hash)
        this.setState({ inProgressHashes })

        addToQueue({
            type: QUEUE_TYPES.BLOCKCHAIN,
            func: 'archiveRecord',
            args: [address, hashTypes.timeRecordHash, hash, archive],
            title: texts.archiveRecord,
            description: `${wordsCap.hash}: ${hash}`,
            then: () => {
                inProgressHashes.shift(hash)
                this.setState({ inProgressHashes })
            }
        })
    }

    handleBan = (selectedHashes) => {

    }

    handleSetAsDraft = hash => {
        const { data, inProgressHashes } = this.state
        const {
            approved,
            end_block,
            nr_of_breaks,
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
        addToQueue({
            address: projectOwnerAddress, // for balance check
            type: QUEUE_TYPES.BLOCKCHAIN,
            func: 'timeKeeping_record_save',
            title: `${texts.timeKeeping} - ${texts.setAsDraft}`,
            description: `${texts.recordId}: ${hash}`,
            args: [
                projectOwnerAddress,
                projectHash,
                hash,
                statuses.draft,
                reason,
                total_blocks,
                0,
                start_block,
                end_block,
                nr_of_breaks,
            ],
            then: success => {
                inProgressHashes.shift(hash)
                this.setState({ inProgressHashes })
                success && this.getRecords()
            }
        })
    }

    showDetails = (hash, record) => {
        const { _status, duration, end_block, nr_of_breaks, start_block, total_blocks, workerAddress, workerName } = record
        const inputs = [
            [texts.recordId, textEllipsis(hash, 30)],
            [wordsCap.worker, workerName || workerAddress],
            [wordsCap.status, _status],
            [wordsCap.duration, duration],
            [texts.numberOfBreaks, nr_of_breaks, 'number'],
            [texts.blockCount, total_blocks],
            [texts.blockStart, start_block],
            [texts.blockEnd, end_block],
        ].map(([label, value, type]) => ({
            action: label !== texts.recordId ? undefined : { icon: 'copy', onClick: () => copyToClipboard(hash) },
            label,
            name: label,
            type: type || 'text',
            value,
        }))

        showForm(FormBuilder, {
            closeText: wordsCap.close,
            header: texts.recordDetails,
            inputs,
            size: 'mini',
            submitText: null,
        })
    }

    render() {
        const { archive, manage } = this.props
        const { columns, topRightMenu } = this.state
        columns.find(x => x.key === '_workerName').hidden = !manage
        topRightMenu.forEach(item => {
            // un/archive action is always visible
            if (item.key !== 'actionArchive') {
                item.hidden = !manage || archive
                return
            }
            item.content = archive ? wordsCap.unarchive : wordsCap.archive
            item.icon = archive ? 'reply all' : 'file archive'
        })
        this.setBond()
        return <DataTable {...this.state} />
    }
}
ProjectTimeKeepingList.propTypes = {
    // whether to retrieve archives
    archive: PropTypes.bool,
    // manage records of projects owned by selected identity
    manage: PropTypes.bool,
    // manage single project
    projecthash: PropTypes.string,
}
ProjectTimeKeepingList.defaultProps = {
    manage: false
}