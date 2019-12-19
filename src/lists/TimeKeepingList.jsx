import React from 'react'
import PropTypes from 'prop-types'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import { Button } from 'semantic-ui-react'
import DataTable from '../components/DataTable'
import { arrUnique, textCapitalize, deferred } from '../utils/utils'
import TimeKeepingForm, { TimeKeepingUpdateForm } from '../forms/TimeKeeping'
import PartnerForm from '../forms/Partner'
import { confirm, showForm } from '../services/modal'
import partners from '../services/partners'
import { addToQueue, QUEUE_TYPES } from '../services/queue'
import timeKeeping, { getTimeRecords } from '../services/timeKeeping'
import identities from '../services/identity'
import TimeKeepingInviteForm from '../forms/TimeKeepingInvite'

const toBeImplemented = () => alert('To be implemented')

const words = {
    action: 'action',
    approve: 'approve',
    approved: 'approved',
    dispute: 'dispute',
    duration: 'duration',
    edit: 'edit',
    hash: 'hash',
    identity: 'identity',
    no: 'no',
    project: 'project',
    reject: 'reject',
    rejected: 'rejected',
    status: 'status',
    submitted: 'submitted',
    timer: 'timer',
    yes: 'yes',
    unknown: 'unknown',
}
const wordsCap = textCapitalize(words)
const texts = {
    addPartner: 'Add Partner',
    bannedUser: 'User has been banned from this project',
    banUser: 'Ban User',
    banUsers: 'Ban Users',
    cannotBanOwnIdentity: 'You cannot ban your own identity',
    emptyMessage: 'No records available for this project. Start booking time yourself by cliking the timer button above',
    orInviteWorkers: 'or invite workers',
    notProjectOwner: 'You do not own this project',
    selectedIdentitiesAlreadyBanned: 'Selected identities are already banned',
    selectProjectForRecords: 'Please select a project to view time records',
    timeKeeping: 'Time Keeping',
    timeKeepingBanWarning: 'You are about to ban the following addresses permanently from the project named',
    uhOh: 'Uh oh!',
    whatDoesThisMean: 'What does this mean?',
    whatDoesThisMeanItemOne: 'No further booking or other actions will be accepted from the user(s)',
    whatDoesThisMeanItemTwo: 'Only approved bookings will be visible to you',
}
const submitStatuses = {
    0: words.submitted,
}

export default class ProjectTimeKeepingList extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.getRecords = deferred(this.getRecords, 150, this)
        this.state = {
            columns: [
                // { key: '_projectName', title: wordsCap.project },
                { key: '_workerName', title: wordsCap.identity },
                { key: 'duration', textAlign: 'center', title: wordsCap.duration },
                { collapsing: true, key: '_status', textAlign: 'center', title: wordsCap.status },
                {
                    collapsing: true,
                    style: { padding: 0, width: 90 },
                    content: this.getActionContent.bind(this),
                    textAlign: 'center',
                    title: wordsCap.action,
                }
            ],
            data: new Map(),
            defaultSort: 'status',
            loading: false,
            perPage: 10,
            rowProps: (item) => {
                const { project } = this.props
                const bannedAddresses = ((project || {}).timeKeeping || {}).bannedAddresses || []
                const { address, approved } = item
                const isBanned = bannedAddresses.indexOf(address) >= 0
                if (isBanned) return { error: true, title: texts.bannedUser }
                return approved === false ? { warning: true, title: wordsCap.rejected } : (
                    approved === true ? { positive: true, title: wordsCap.approved } : {}
                )
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
                    onClick: toBeImplemented //selectedKeys => selectedKeys.forEach(hash => this.handleApprove(hash, true)),
                },
                {
                    content: wordsCap.reject,
                    icon: { color: 'red', name: 'x' },
                    key: 'actionReject',
                    onClick: toBeImplemented //selectedKeys => selectedKeys.forEach(hash => this.handleApprove(hash, false)),
                },
                {
                    content: texts.banUser,
                    icon: { color: 'red', name: 'ban' },
                    key: 'actionBan',
                    onClick: toBeImplemented //this.handleBan.bind(this)
                }
            ],
        }
    }

    componentWillMount() {
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

    getActionContent(record, hash) {
        const { isOwner, projectHash, projectName } = this.props
        const { address: selectedAddress } = identities.getSelected()
        const { approved, duration, locked, start_block, total_blocks, workerAddress } = record
        const isUser = selectedAddress === workerAddress
        return [
            {
                disabled: !!approved || !isOwner,
                hidden: isOwner && !isUser,
                icon: 'bug',
                onClick: toBeImplemented,
                title: wordsCap.dispute,
            },
            {
                disabled: approved || locked || !isUser,
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
        ].map((x, i) => { x.key = i; return x })
            .filter(x => !x.hidden)
            .map((props) => <Button {...props} />)
    }

    getRecords() {
        const { manage, ownerAddress, projectHash } = this.props
        if (!projectHash) return

        getTimeRecords(projectHash, ownerAddress).then(records => {
            const { address } = identities.getSelected()
            Array.from(records).forEach(([hash, record]) => {
                const { locked, submit_status, workerAddress, workerName } = record

                if (!manage && address !== workerAddress) return records.delete(hash)
                record._workerName = workerName || (
                    <Button
                        content='Add Partner'
                        onClick={() => showForm(PartnerForm, { values: { address: workerAddress } })}
                    />
                )
                record._status = locked ? words.locked : submitStatuses[submit_status]
            })
            this.setState({ data: records })
        }, console.log)
    }

    handleApprove(hash, approve = false) {
        // const { data } = this.state
        // const record = data.get(hash)
        // if (record.approved || record.approved === approve) return
    }

    handleBan(selectedHashes) {

    }

    handleRowSelect(selectedKeys) {
        const { isOwner, projectHash } = this.props
        const { topLeftMenu: leftMenu } = this.state
        leftMenu.forEach(x => x.hidden = selectedKeys.length === 0
            || (!isOwner && ['actionApprove', 'actionReject'].indexOf(x.key) >= 0)
            || (!projectHash && ['actionBan'].indexOf(x.key) >= 0))

        this.setState({ topLeftMenu: leftMenu })
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
            msg.content = texts.notProjectOwner
            msg.status = 'warning'
        } else if (isOwner) {
            msg.content = (
                <p>
                    {msg.content + ' '}
                    <Button
                        positive
                        content={texts.orInviteWorkers}
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