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
import identities from '../services/identity'
import { confirm, showForm } from '../services/modal'
import partners from '../services/partners'
import { addToQueue, QUEUE_TYPES } from '../services/queue'
import timeKeeping, { getTimeRecords, statuses } from '../services/timeKeeping'

const toBeImplemented = () => alert('To be implemented')

const words = {
    action: 'action',
    approve: 'approve',
    approved: 'approved',
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
        this.state = {
            columns: [
                // { key: '_projectName', title: wordsCap.project },
                { key: '_workerName', title: wordsCap.identity },
                { key: 'duration', textAlign: 'center', title: wordsCap.duration },
                { collapsing: true, key: '_status', textAlign: 'center', title: wordsCap.status },
                {
                    collapsing: true,
                    style: { padding: 0, width: 90 },
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
                        onSubmit: this.getRecords
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
                }
            ],
        }

        this.originalSetState = this.setState
        this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
    }

    componentWillMount() {
        this._mounted = true
        const { projectHash } = this.props
        if (!projectHash) return
        this.projectHash = projectHash
        this.bond = Bond.all([
            identities.bond,
            partners.bond,
            timeKeeping.record.listByProject(projectHash)
        ])

        this.tieId = this.bond.tie(() => this.getRecords())
        this.propsStr = JSON.stringify(this.props)
    }

    componentWillUnmount() {
        this._mounted = false
        this.bond && this.bond.untie(this.tieId)
    }

    componentWillUpdate() {
        const { projectHash } = this.props
        const propsStr = JSON.stringify(this.props)
        if (this.propsStr === propsStr || !projectHash) return

        this.bond && this.bond.untie(this.tieId)
        this.propsStr = propsStr
        // project hash hasn't changed but other props changed
        if (this.projectHash !== projectHash) return this.getRecords()
        this.projectHash = projectHash

        this.bond = Bond.all([
            identities.bond,
            partners.bond,
            timeKeeping.record.listByProject(projectHash)
        ])
        this.tieId = this.bond.tie(() => this.getRecords())
    }

    getActionContent = (record, hash) => {
        const { isOwner, projectHash, projectName } = this.props
        const { address: selectedAddress } = identities.getSelected()
        const { approved, duration, locked, start_block, submit_status, total_blocks, workerAddress } = record
        const isUser = selectedAddress === workerAddress
        return [
            {
                disabled: !!approved || !isOwner,
                hidden: !isOwner,
                icon: 'bug',
                onClick: toBeImplemented,
                title: wordsCap.dispute,
            },
            {
                disabled: !isUser || submit_status !== 0 || locked || approved,
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
                icon: 'eye',
                onClick: () => this.showDetails(hash, record)
            },
        ].map((x, i) => { x.key = i; return x })
            .filter(x => !x.hidden)
            .map((props) => <Button {...props} />)
    }

    getRecords = () => {
        const { manage, ownerAddress, projectHash } = this.props
        if (!projectHash) return

        getTimeRecords(projectHash, ownerAddress).then(records => {
            const { address } = identities.getSelected()
            Array.from(records).forEach(([hash, record]) => {
                const { locked, submit_status, workerAddress, workerName } = record
                record.approved = submit_status === statuses.accept
                record.rejected = submit_status === statuses.reject
                record.draft = submit_status === statuses.draft
                // banned = ....

                if (!manage && address !== workerAddress) return records.delete(hash)
                record._workerName = workerName || (
                    <Button
                        content='Add Partner'
                        onClick={() => showForm(PartnerForm, { values: { address: workerAddress } })}
                    />
                )
                record._status = locked ? words.locked : statusTexts[submit_status]
            })
            this.setState({ data: records })
        }, console.log)
    }

    handleApprove = (hash, approve = false) => {
        const { ownerAddress, projectHash } = this.props
        const { approved, rejected, workerAddress } = this.state.data.get(hash) || {}
        if (!workerAddress || approved || rejected && !approve) return

        // const reason = approve ? null : {.....}
        // timeKeeping.record.approve(workerAddress, projectHash, hash, approve)
        addToQueue({
            type: QUEUE_TYPES.BLOCKCHAIN,
            func: 'timeKeeping_record_approve',
            args: [ownerAddress, workerAddress, projectHash, hash, approve],
            title: `${texts.timeKeeping} - ${approve ? texts.approveRecord : texts.rejectRecord}`,
            description: `${texts.recordId}: ${hash}`,
            then: this.getRecords
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
        listProps.selectable = manage && isOwner
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