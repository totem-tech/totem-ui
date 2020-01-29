import React from 'react'
import PropTypes from 'prop-types'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import { Button } from 'semantic-ui-react'
import DataTable from '../components/DataTable'
import FormBuilder from '../components/FormBuilder'
import { arrUnique, textCapitalize, deferred, copyToClipboard, textEllipsis } from '../utils/utils'
// Forms
import PartnerForm from '../forms/Partner'
import TimeKeepingForm, { TimeKeepingUpdateForm } from '../forms/TimeKeeping'
import TimeKeepingInviteForm from '../forms/TimeKeepingInvite'
// Services
import { hashTypes } from '../services/blockchain'
import identities, { getSelected } from '../services/identity'
import { confirm, showForm } from '../services/modal'
import partners from '../services/partners'
import { addToQueue, QUEUE_TYPES } from '../services/queue'
import timeKeeping, { getTimeRecordsDetails, statuses, getTimeRecordsBond } from '../services/timeKeeping'

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
    status: 'status',
    submitted: 'submitted',
    timer: 'timer',
    yes: 'yes',
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
                // { key: '_projectName', title: wordsCap.project },
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
            defaultSort: 'status',
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
            topLeftMenu: [
                {
                    active: false,
                    content: wordsCap.timer,
                    icon: 'clock outline',
                    key: 1,
                    onClick: () => showForm(TimeKeepingForm, {
                        modal: true,
                        projectHash: this.props.projectHash,
                    })
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
                    content: wordsCap.archive,
                    icon: 'file archive',
                    key: 'actionArchive',
                    onClick: selectedHashes => confirm({
                        content: `${texts.archiveRecord}?`,
                        onConfirm: () => selectedHashes.forEach(this.handleArchive),
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
        const { archive, manage, projectHash } = this.props
        if (!projectHash) return
        this.projectHash = projectHash
        this.bond = Bond.all([
            getTimeRecordsBond(projectHash, archive, !manage && getSelected().address),
            identities.bond,
            partners.bond,
        ])
        this.tieId = this.bond.tie(([list]) => this.getRecords(list))
        this.propsStr = JSON.stringify(this.props)
    }

    updateHashList = ([hashList]) => {
        this.getRecords(hashList)
    }

    componentWillUnmount() {
        this._mounted = false
        this.bond && this.bond.untie(this.tieId)
        this.recordsBond && this.recordsBond.untie(this.tieIdRecords)
    }

    componentWillUpdate() {
        const { archive, manage, projectHash } = this.props
        const propsStr = JSON.stringify(this.props)
        if (this.propsStr === propsStr || !projectHash) return

        this.bond && this.bond.untie(this.tieId)
        this.propsStr = propsStr
        // project hash hasn't changed but other props changed
        if (this.projectHash !== projectHash) return this.getRecords()
        this.projectHash = projectHash

        this.bond = Bond.all([
            getTimeRecordsBond(projectHash, archive, !manage && getSelected().address),
            identities.bond,
            partners.bond,
        ])
        this.tieId = this.bond.tie(([list]) => this.getRecords(list))
    }

    getActionContent = (record, hash) => {
        const { isOwner, manage, projectHash, projectName } = this.props
        const { inProgressHashes } = this.state
        const { approved, duration, locked, start_block, submit_status, total_blocks, workerAddress } = record
        const editableStatuses = [statuses.draft, statuses.dispute, statuses.reject]
        const isSubmitted = submit_status === statuses.submit
        const inProgress = inProgressHashes.includes(hash)
        const buttons = [
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
        ].map((x, i) => { x.key = i; return x })
            .filter(x => !x.hidden)
            .map((props) => <Button {...props} />)

        return buttons
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
        const { ownerAddress, projectHash } = this.props
        const { data, inProgressHashes } = this.state
        const { approved, submit_status, workerAddress } = data.get(hash) || {}
        const targetStatus = approve ? statuses.accept : statuses.reject
        if (!workerAddress || submit_status !== statuses.submit || targetStatus === submit_status) return
        inProgressHashes.push(hash)
        this.setState({ inProgressHashes })
        // const reason = approve ? null : {.....}
        // timeKeeping.record.approve(workerAddress, projectHash, hash, approve)
        addToQueue({
            type: QUEUE_TYPES.BLOCKCHAIN,
            func: 'timeKeeping_record_approve',
            args: [ownerAddress, workerAddress, projectHash, hash, approve],
            title: `${texts.timeKeeping} - ${approve ? texts.approveRecord : texts.rejectRecord}`,
            description: `${texts.recordId}: ${hash}`,
            then: success => {
                inProgressHashes.shift(hash)
                this.setState({ inProgressHashes })
                success && this.getRecords()
            },
        })
    }

    handleArchive = hash => {
        const { manage, ownerAddress } = this.props
        const { data, inProgressHashes } = this.state
        let address = manage ? ownerAddress : (data.get(hash) || {}).workerAddress
        if (!address) return
        inProgressHashes.push(hash)
        this.setState({ inProgressHashes })

        addToQueue({
            type: QUEUE_TYPES.BLOCKCHAIN,
            func: 'archiveRecord',
            args: [address, hashTypes.timeRecordHash, hash, true],
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

    handleRowSelect = (selectedKeys) => {
        const { isOwner, projectHash } = this.props
        const { topLeftMenu: leftMenu } = this.state
        leftMenu.forEach(x => x.hidden = selectedKeys.length === 0
            || (!isOwner && ['actionApprove', 'actionReject'].indexOf(x.key) >= 0)
            || (!projectHash && ['actionBan'].indexOf(x.key) >= 0))

        this.setState({ topLeftMenu: leftMenu })
    }

    handleSetAsDraft = hash => {
        const { ownerAddress, projectHash } = this.props
        const { data, inProgressHashes } = this.state
        const { approved, end_block, nr_of_breaks, start_block, total_blocks } = data.get(hash) || {}
        // allow project owner to be able to procees only if approved
        if (!approved || !identities.find(ownerAddress)) return

        const reason = {
            ReasonCodeKey: 0,
            ReasonCodeTypeKey: 0
        }

        inProgressHashes.push(hash)
        this.setState({ inProgressHashes })
        addToQueue({
            address: ownerAddress, // for balance check
            type: QUEUE_TYPES.BLOCKCHAIN,
            func: 'timeKeeping_record_save',
            title: `${texts.timeKeeping} - ${texts.setAsDraft}`,
            description: `${texts.recordId}: ${hash}`,
            args: [
                ownerAddress,
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
        const { isOwner, manage, projectHash } = this.props
        const listProps = this.state

        const denyManage = manage && !isOwner
        const msg = { content: texts.emptyMessage }

        if (denyManage) {
            msg.content = texts.notProjectOwner
            msg.status = 'error'
        } else if (!projectHash) {
            msg.content = texts.selectProjectForRecords
            msg.status = 'warning'
        } else if (isOwner) {
            msg.content = (
                <p>
                    {msg.content + ' '}
                    <Button
                        positive
                        content={texts.orInviteATeamMember}
                        onClick={() => showForm(TimeKeepingInviteForm, { values: { projectHash } })}
                    />
                </p>
            )
        }
        listProps.emptyMessage = msg
        listProps.selectable = true //manage && isOwner
        listProps.topRightMenu.forEach(item => {
            const isArchive = item.key === 'actionArchive'
            item.hidden = manage ? false : !isArchive
        })
        if (denyManage || !projectHash) {
            listProps.data = new Map()
        }
        return <DataTable {...listProps} />
    }
}
ProjectTimeKeepingList.propTypes = {
    isOwner: PropTypes.bool,
    manage: PropTypes.bool,
    projecthash: PropTypes.string,
    projectName: PropTypes.string,
    ownerAddress: PropTypes.string,
}
ProjectTimeKeepingList.defaultProps = {
    manage: false
}