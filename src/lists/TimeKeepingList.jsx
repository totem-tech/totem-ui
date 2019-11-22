import React from 'react'
import PropTypes from 'prop-types'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import { Button, Dropdown } from 'semantic-ui-react'
import ListFactory from '../components/ListFactory'
import { arrUnique, isDefined, mapFilter } from '../utils/utils'
import { getAddressName } from '../components/ProjectDropdown'
import TimeKeepingForm, { TimeKeepingUpdateForm } from '../forms/TimeKeeping'
import PartnerForm from '../forms/Partner'
import { confirm, showForm } from '../services/modal'
import addressbook from '../services/partners'
import client from '../services/ChatClient'
import { addToQueue, QUEUE_TYPES } from '../services/queue'
import { timeKeeping } from '../services/blockchain'
import identityService from '../services/identity'
import { secondsToDuration, BLOCK_DURATION_SECONDS } from '../utils/time'
import { bytesToHex } from '../utils/convert'

const toBeImplemented = () => alert('To be implemented')

const hashListCache = new Map() // key: address, value: []

export default class ProjectTimeKeepingList extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.getEntries = this.getEntries.bind(this)
        this.state = {
            forceReloadHashes: false,
            listProps: {
                columns: [
                    {
                        key: '_projectName',
                        title: 'Project',
                    },
                    {
                        key: '_nameOrAddress',
                        title: 'Address'
                    },
                    {
                        key: '_duration',
                        textAlign: 'center',
                        title: 'Duration'
                    },
                    {
                        collapsing: true,
                        key: '_status',
                        textAlign: 'center',
                        title: 'Status',
                    },
                    {
                        collapsing: true,
                        style: { padding: 0, width: 90 },
                        content: this.getActionContent.bind(this),
                        textAlign: 'center',
                        title: 'Action',
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
                    if (isBanned) return { error: true, title: 'User banned' }
                    return approved === false ? { warning: true, title: 'Rejected' } : (
                        approved === true ? { positive: true, title: 'Approved' } : {}
                    )
                },
                searchExtraKeys: [
                    'address',
                    'hash',
                    'approved',
                ],
                topLeftMenu: [
                    {
                        active: false,
                        content: 'Timer',
                        icon: 'clock outline',
                        key: 1,
                        onClick: () => {
                            showForm(TimeKeepingForm, {
                                modal: true,
                                projectHash: this.props.projectHash,
                                onSubmit: this.getEntries
                            })
                        }
                    },
                ],
                topRightMenu: [
                    {
                        content: 'Approve',
                        icon: {
                            color: 'green',
                            name: 'check',
                        },
                        key: 'Approve',
                        onClick: selectedKeys => selectedKeys.forEach(hash => this.handleApprove(hash, true)),
                    },
                    {
                        content: 'Reject',
                        icon: {
                            color: 'red',
                            name: 'x',
                        },
                        key: 'Reject',
                        onClick: selectedKeys => selectedKeys.forEach(hash => this.handleApprove(hash, false)),
                    },
                    {
                        content: 'Ban User',
                        icon: {
                            color: 'red',
                            name: 'ban',
                        },
                        key: 'Ban',
                        onClick: this.handleBan.bind(this)
                    }
                ],
                type: 'datatable',
            }
        }

        setTimeout(this.getEntries)
    }

    componentWillMount() {
        this.updateBond = Bond.all([
            identityService.bond,
            addressbook.getBond(),
        ])

        this.tieId = this.updateBond.notify(this.getEntries)
    }

    componentWillUnmount() {
        this.updateBond.untie(this.tieId)
    }

    getActionContent(entry, hash) {
        const { isOwner } = this.state
        const { address: selectedAddress } = identityService.getSelected()
        const isUser = selectedAddress === entry.address
        const btnProps = isOwner && !isUser ? {
            disabled: !isOwner || entry.approved === true,
            icon: 'bug',
            onClick: toBeImplemented,
            title: 'Dispute',
        } : {
                disabled: entry.address !== selectedAddress || entry.approved === true,
                icon: 'pencil',
                onClick: () => showForm(
                    TimeKeepingUpdateForm,
                    { entry, hash, onSubmit: this.getEntries }
                ),
                title: 'Edit',
            }

        const options = [
            {
                content: 'Add Partner',
                hidden: !!addressbook.get(entry.address) || !!identityService.find(entry.address),
                icon: 'user plus',
                key: 1,
                onClick: () => showForm(PartnerForm, { values: { address: entry.address } }),
            },
            {
                content: 'Approve',
                hidden: !isOwner || entry.approved === true,
                icon: {
                    color: 'green',
                    name: 'check',
                },
                key: 2,
                onClick: () => this.handleApprove(hash, true),
            },
            {
                content: 'Reject',
                hidden: !isOwner || entry.approved === true || entry.approved === false,
                icon: {
                    color: 'red',
                    name: 'x',
                },
                key: 3,
                onClick: () => this.handleApprove(hash, false),
            }
        ].filter(x => !x.hidden)

        return (
            <Button.Group>
                <Button {...btnProps} style={{ marginLeft: -10 }} />
                {options.length > 0 && (
                    <Dropdown
                        className='button icon'
                        floating
                        options={options}
                        trigger={<React.Fragment />}
                    />
                )}
            </Button.Group>
        )
    }

    getEntries() {
        const { manage, projectHash, project } = this.props
        const { listProps } = this.state
        const { address: workerAddress } = identityService.getSelected()
        const isOwner = manage && (project ? project.ownerAddress === workerAddress : true)
        const bannedAddresses = project && (project.timeKeeping || {}).bannedAddresses || []
        listProps.selectable = manage && isOwner
        listProps.columns.find(x => x.key === '_projectName').hidden = !!projectHash
        const denyManage = manage && project && !isOwner
        listProps.emptyMessage = {
            content: denyManage ? 'You do not own this project' : (
                !projectHash ? 'Please select a project to view time records' : 'No entries found'
            ),
            status: denyManage ? 'error' : 'warning'
        }
        listProps.data = denyManage ? new Map() : listProps.data

        this.setState({ isOwner, listProps, projectHash, project })
        if (denyManage || !projectHash) return

        const processHashes = hashes => {
            client.project(projectHash, null, null, (err, project) => {
                Bond.all(hashes.map(timeHash => runtime.timekeeping.timeRecord([
                    ss58Decode(workerAddress),
                    hexToBytes(projectHash),
                    timeHash
                ]))).then(records => { // record === null means not found or does not belong to user or project
                    listProps.data = records.map((record, i) => !record ? null : ({
                        ...record,
                        _hash: bytesToHex(hashes[i]),
                        _banned: bannedAddresses.indexOf(workerAddress) >= 0 ? 'Yes' : 'No',
                        _duration: secondsToDuration((record.end_block - record.start_block) * BLOCK_DURATION_SECONDS),
                        _nameOrAddress: getAddressName(workerAddress),
                        _projectName: project.name,
                        _status: record.locked_status ? 'locked' : '??'
                    })).filter(x => !!x) // get rid of empty values

                    this.setState({ listProps })
                    /*
                    end_block: 216557
                    locked_reason: {ReasonCodeKey: 0, ReasonCodeTypeKey: 0, _type: "ReasonCodeStruct"}
                    locked_status: false
                    posting_period: 0
                    reason_code: {ReasonCodeKey: 0, ReasonCodeTypeKey: 0, _type: "ReasonCodeStruct"}
                    start_block: 210797
                    submit_status: 0
                    total_blocks: 5760
                    */
                })
            })
        }

        timeKeeping.record.list(workerAddress).then(processHashes)

        return

        // legacy
        const query = {}
        if (projectHash) {
            query.projectHash = projectHash
        }
        if (!isOwner || !project) {
            // only show other user's entries if select wallet is the project owner
            query.address = workerAddress
        }
        client.timeKeepingEntrySearch(
            query, true, true, true,
            (err, data) => {
                // exclude any banned address
                data = mapFilter(data, entry => entry.approved || bannedAddresses.indexOf(entry.address) === -1)
                listProps.data = data
                const projectHashes = []
                Array.from(data).forEach(x => {
                    const item = x[1]
                    const { address, approved, totalAmount } = item
                    item._banned = bannedAddresses.indexOf(address) >= 0 ? 'Yes' : 'No'
                    item._nameOrAddress = getAddressName(address)
                    item._status = !isDefined(approved) ? '-' : (approved ? 'Approved' : 'Rejected')
                    if (projectHashes.indexOf(item.projectHash) === -1) projectHashes.push(item.projectHash)
                    return x
                })
                this.setState({ listProps })

                if (projectHashes.length === 0) return

                // retrieve projects to display respective names                
                setTimeout(() => client.projectsByHashes(projectHashes, (err, projects) => {
                    if (err) return
                    Array.from(data).forEach(x => x[1]._projectName = (projects.get(x[1].projectHash) || {}).name)
                    this.setState({ listProps })
                }))
            }
        )

    }

    handleApprove(hash, approve = false) {
        const { listProps: { data } } = this.state
        const entry = data.get(hash)
        if (entry.approved || entry.approved === approve) return
        const queueProps = {
            type: QUEUE_TYPES.CHATCLIENT,
            func: 'timeKeepingEntryApproval',
            args: [hash, approve, (err) => !err && this.getEntries()],
            title: 'Time Keeping - Approve',
            description: `Hash: ${hash} | Duration: ${entry.duration}`
        }
        addToQueue(queueProps)
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
            content: 'You cannot ban your own wallet(s)',
            header: 'Uh oh!',
            size: 'tiny',
        })

        addresses = addresses.filter(address => (bannedAddresses || []).indexOf(address) === -1)
        const s = addresses.length <= 1 ? '' : 's'
        const es = s ? 'es' : ''
        if (addresses.length === 0) return confirm({
            cancelButton: null,
            content: `Selected addresses are already banned`,
            header: 'Uh oh!',
            size: 'tiny',
        })

        const queueProps = {
            type: QUEUE_TYPES.CHATCLIENT,
            func: 'projectTimeKeepingBan',
            args: [projectHash, addresses, true],
            title: 'Project - ban user',
            description: `Ban ${addresses.length} user${s}`,
            // When successfull retrieve the updated project with banned addresses and update entry list
            next: {
                type: QUEUE_TYPES.CHATCLIENT,
                func: 'project',
                args: [projectHash, null, null, (err, project) => {
                    if (err) return
                    this.setState({ project })
                    setTimeout(this.getEntries)
                }],
                // No toast required for this child-task
                silent: true
            }
        }

        confirm({
            content: (
                <div>
                    You are about to ban the following address{es} permanently
                    from the project named "{project.name}":
                    <pre style={{ backgroundColor: 'gray', color: 'blue', padding: 15 }}>
                        {addresses.join('\n')}
                    </pre>

                    What does this mean?
                    <ul>
                        <li>No further booking or other actions will be accepted from the user{s}</li>
                        <li>Only approved bookings will be visible to you</li>
                    </ul>
                </div>
            ),
            header: `Ban user${s}?`,
            onConfirm: () => addToQueue(queueProps)
        })
    }

    handleRowSelect(selectedKeys) {
        const { isOwner, listProps, projectHash } = this.state
        const { topLeftMenu: leftMenu } = listProps
        leftMenu.forEach(x => x.hidden = selectedKeys.length === 0
            || (!isOwner && ['Approve', 'Reject'].indexOf(x.key) >= 0)
            || (!projectHash && ['Ban'].indexOf(x.key) >= 0))

        this.setState({ listProps })
    }

    render() {
        const propsStr = JSON.stringify(this.props)
        if (this.propsStr !== propsStr) {
            // update entries list
            this.propsStr = propsStr
            setTimeout(this.getEntries)
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