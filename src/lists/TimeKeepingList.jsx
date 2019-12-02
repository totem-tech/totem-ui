import React from 'react'
import PropTypes from 'prop-types'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import { Button } from 'semantic-ui-react'
import ListFactory from '../components/ListFactory'
import { arrUnique, textCapitalize } from '../utils/utils'
import { getAddressName } from '../components/ProjectDropdown'
import TimeKeepingForm, { TimeKeepingUpdateForm } from '../forms/TimeKeeping'
import PartnerForm from '../forms/Partner'
import { confirm, showForm } from '../services/modal'
import addressbook from '../services/partners'
import client from '../services/ChatClient'
import { addToQueue, QUEUE_TYPES } from '../services/queue'
import timeKeeping from '../services/timeKeeping'
import identityService from '../services/identity'
import { secondsToDuration, BLOCK_DURATION_SECONDS } from '../utils/time'
import { bytesToHex } from '../utils/convert'

const toBeImplemented = () => alert('To be implemented')

const words = {
    action: 'action',
    approve: 'approve',
    approved: 'approved',
    address: 'address',
    dispute: 'dispute',
    duration: 'duration',
    edit: 'edit',
    hash: 'hash',
    no: 'no',
    project: 'project',
    reject: 'reject',
    rejected: 'rejected',
    status: 'status',
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
    noRecordsFound: 'No records found',
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

export default class ProjectTimeKeepingList extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.getRecords = this.getRecords.bind(this)
        this.state = {
            forceReloadHashes: false,
            listProps: {
                columns: [
                    { key: '_projectName', title: wordsCap.project },
                    { key: '_nameOrAddress', title: wordsCap.address },
                    { key: '_duration', textAlign: 'center', title: wordsCap.duration },
                    { collapsing: true, key: '_status', textAlign: 'center', title: wordsCap.status },
                    {
                        collapsing: true,
                        style: { padding: 0, width: 90 },
                        content: this.getActionContent.bind(this),
                        textAlign: 'center',
                        title: wordsCap.action,
                    }
                ],
                defaultSort: 'status',
                loading: false,
                perPage: 10,
                rowProps: (item) => {
                    const { project } = this.state
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
                type: 'datatable',
            }
        }
    }

    componentWillMount() {
        this.updateBond = Bond.all([
            identityService.bond,
            addressbook.bond,
        ])

        this.tieId = this.updateBond.notify(this.getRecords)
    }

    componentWillUnmount() {
        this.updateBond.untie(this.tieId)
    }

    getActionContent(record, hash) {
        const { isOwner } = this.state
        const { address: selectedAddress } = identityService.getSelected()
        const isUser = selectedAddress === record.address
        return [
            {
                disabled: !isOwner || record.approved === true,
                hidden: isOwner && !isUser,
                icon: 'bug',
                onClick: toBeImplemented,
                title: wordsCap.dispute,
            },
            {
                disabled: record.address !== selectedAddress || record.approved === true,
                hidden: !(isOwner & !isUser),
                icon: 'pencil',
                onClick: () => showForm(TimeKeepingUpdateForm, { entry: record, hash, onSubmit: this.getRecords }),
                title: wordsCap.edit,
            },
            {
                hidden: !record._nameOrAddress.includes('...'),
                icon: 'user plus',
                onClick: () => showForm(PartnerForm, { values: { address: record.address } }),
                title: texts.addPartner,
            },
        ].map((x, i) => { x.key = i; return x })
            .filter(x => !x.hidden)
            .map((props) => <Button {...props} />)
    }

    getRecords() {
        const { manage, projectHash, project } = this.props
        const { listProps } = this.state
        const { address: workerAddress } = identityService.getSelected()
        const isOwner = manage && project && project.ownerAddress === workerAddress
        const bannedAddresses = project && (project.timeKeeping || {}).bannedAddresses || []
        listProps.selectable = manage && isOwner
        listProps.columns.find(x => x.key === '_projectName').hidden = !!projectHash
        const denyManage = manage && project && !isOwner
        listProps.emptyMessage = {
            content: denyManage ? texts.notProjectOwner : (
                !projectHash ? texts.selectProjectForRecords : texts.noRecordsFound
            ),
            status: denyManage ? 'error' : 'warning'
        }
        listProps.data = denyManage ? new Map() : listProps.data

        this.setState({ isOwner, listProps, projectHash, project })
        if (denyManage || !projectHash) return

        client.project(projectHash, null, null, (_, project) => {
            // ToDo: pagination required to improve performance also move to timeKeeping service?
            timeKeeping.record.listByProject(projectHash).then(hashes => {
                Bond.all(hashes.map(timeHash => timeKeeping.record.get(timeHash))).then(records => {
                    console.log({ hashes: hashes.map(h => '0x' + bytesToHex(h)), records })
                    listProps.data = records.filter(r => !!r).map((record, i) => {
                        const address = record.worker && ss58Encode(record.worker)
                        return {
                            workerAddress: address,
                            _hash: bytesToHex(hashes[i]),
                            // _banned: bannedAddresses.indexOf(workerAddress) >= 0 ? wordsCap.yes : wordsCap.no, // use blockchain
                            _duration: secondsToDuration(record.total_blocks * BLOCK_DURATION_SECONDS),
                            _nameOrAddress: getAddressName(address),
                            _projectName: (project || {}).name || wordsCap.unknown,
                            _status: record.locked_status ? wordsCap.locked : 'submit_status:' + record.submit_status,
                        }
                    }).filter(record => isOwner || record.workerAddress === workerAddress)
                    this.setState({ listProps })
                    /*
                    exampleRecord: {
                        locked_status: false
                        posting_period: 0
                        project_hash: ....
                        reason_code: {ReasonCodeKey: 0, ReasonCodeTypeKey: 0, _type: "ReasonCodeStruct"}
                        start_block: 1851599056011264
                        submit_status: 0
                        total_blocks: 3600
                        worker: ....
                    }
                    */
                })
            })
        })
    }

    handleApprove(hash, approve = false) {
        const { listProps: { data } } = this.state
        const record = data.get(hash)
        if (record.approved || record.approved === approve) return
        //use blockhain only
        // const queueProps = {
        //     type: QUEUE_TYPES.CHATCLIENT,
        //     func: 'timeKeepingEntryApproval',
        //     args: [hash, approve, (err) => !err && this.getRecords()],
        //     title: `${texts.timeKeeping} - ${wordsCap.approve}`,
        // }
        // addToQueue(queueProps)
    }

    handleBan(selectedKeys) {
        const { listProps: { data }, project, projectHash } = this.state
        const { timeKeeping } = project
        const { bannedAddresses } = timeKeeping || {}
        let addresses = arrUnique(selectedKeys.map(key => data.get(key).address))
            // filter out user wallets
            .filter(address => !identityService.find(address))
        // prevents accidental self-banning
        if (addresses.length === 0) return confirm({
            cancelButton: null,
            content: texts.cannotBanOwnIdentity,
            header: texts.uhOh,
            size: 'tiny',
        })

        addresses = addresses.filter(address => (bannedAddresses || []).indexOf(address) === -1)
        if (addresses.length === 0) return confirm({
            cancelButton: null,
            content: texts.selectedIdentitiesAlreadyBanned,
            header: texts.uhOh,
            size: 'tiny',
        })

        // use blockchain
        // const queueProps = {
        //     type: QUEUE_TYPES.CHATCLIENT,
        //     func: 'projectTimeKeepingBan',
        //     args: [projectHash, addresses, true],
        //     title: `${wordsCap.project} - ${texts.banUser}`,
        //     description: `${texts.banUsers}: ${addresses.length}`,
        //     // When successfull retrieve the updated project with banned addresses and update record list
        //     next: {
        //         type: QUEUE_TYPES.CHATCLIENT,
        //         func: 'project',
        //         args: [projectHash, null, null, (err, project) => {
        //             if (err) return
        //             this.setState({ project })
        //             setTimeout(this.getRecords)
        //         }],
        //         // No toast required for this child-task
        //         silent: true
        //     }
        // }

        // confirm({
        //     header: texts.banUsers,
        //     onConfirm: () => addToQueue(queueProps),
        //     content: (
        //         <div>
        //             {texts.timeKeepingBanWarning} - "{project.name} :"
        //             <pre style={{ backgroundColor: 'gray', color: 'blue', padding: 15 }}>
        //                 {addresses.join('\n')}
        //             </pre>

        //             {texts.whatDoesThisMean}
        //             <ul>
        //                 <li>{texts.whatDoesThisMeanItemOne}</li>
        //                 <li>{texts.whatDoesThisMeanItemTwo}</li>
        //             </ul>
        //         </div>
        //     ),
        // })
    }

    handleRowSelect(selectedKeys) {
        const { isOwner, listProps, projectHash } = this.state
        const { topLeftMenu: leftMenu } = listProps
        leftMenu.forEach(x => x.hidden = selectedKeys.length === 0
            || (!isOwner && ['actionApprove', 'actionReject'].indexOf(x.key) >= 0)
            || (!projectHash && ['actionBan'].indexOf(x.key) >= 0))

        this.setState({ listProps })
    }

    render() {
        const propsStr = JSON.stringify(this.props)
        if (this.propsStr !== propsStr) {
            // update entries list
            this.propsStr = propsStr
            setTimeout(this.getRecords)
        }
        return <ListFactory {...this.state.listProps} />
    }
}
ProjectTimeKeepingList.propTypes = {
    manage: PropTypes.bool,
    projecthash: PropTypes.string,
    project: PropTypes.shape({
        hash: PropTypes.string,
        name: PropTypes.name,
        ownerAddress: PropTypes.string
    })
}
ProjectTimeKeepingList.defaultProps = {
    manage: false
}