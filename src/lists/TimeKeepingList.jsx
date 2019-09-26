/*
 * Lists ToDos: 
 * 1. List or table showing the total hours worked per project, total blocks, percentage of hours worked over all hours for all projects
 * 2. List for a selected project:
 *      a. display list of all booked times by ALL users, if currently selected wallet wallet is the ownerAddress
 *      b. otherwise, display only booked times by the selected wallet
 */

import React from 'react'
import PropTypes from 'prop-types'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import { secretStore } from 'oo7-substrate'
import { Button, Dropdown } from 'semantic-ui-react'
import ListFactory from '../components/ListFactory'
import { arrUnique, objCopy, randomInt, copyToClipboard, isDefined, mapFilter } from '../utils/utils'
import { calcAmount, RATE_PERIODS, secondsToDuration } from '../utils/time'
import ProjectDropdown, {getAddressName} from '../components/ProjectDropdown'
import TimeKeepingForm, { TimeKeepingUpdateForm } from '../forms/TimeKeeping'
import PartnerForm from '../forms/Partner'
import { confirm, showForm } from '../services/modal'
import addressbook from '../services/addressbook'
import client from '../services/ChatClient'
import storage from '../services/storage'
import { addToQueue, QUEUE_TYPES } from '../services/queue'

const toBeImplemented = () => alert('To be implemented')

export default class ProjectTimeKeepingList extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.state = {
            projectHash: '',
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
                        key: 'duration',
                        textAlign: 'center',
                        title: 'Duration'
                    },
                    {
                        key: '_rate',
                        textAlign: 'center',
                        title: 'Rate',
                    },
                    {
                        key: '_total',
                        textAlign: 'right',
                        title: 'Total Amount'
                    },
                    {
                        collapsing: true,
                        key: '_status',
                        textAlign: 'center',
                        title: 'Status',
                    },
                    // {
                    //     collapsing: true,
                    //     key: '_banned',
                    //     textAlign: 'center',
                    //     title: 'Banned',
                    // },
                    {
                        collapsing: true,
                        style: {padding: 0,width: 90},
                        content: this.getActionContent.bind(this),
                        textAlign: 'center',
                        title: 'Action',
                    }
                ],
                defaultSort: 'status',
                emptyMessage: {
                    content: 'No entries found!',
                    status: 'warning'
                },
                loading: false,
                perPage: 10,
                rowProps: (item) => {
                    const { project } = this.state
                    const bannedAddresses = ((project || {}).timeKeeping || {}).bannedAddresses || []
                    const {address, approved} = item
                    const isBanned = bannedAddresses.indexOf(address) >= 0
                    if (isBanned) return {error: true, title: 'User banned'}
                    return approved === false ? {warning: true, title: 'Rejected'} : (
                        approved === true ? {positive: true, title: 'Approved'} : {}
                    )
                },
                searchExtraKeys: [
                    'address',
                    'hash',
                    'approved',
                ],
                topLeftMenu: [
                    (
                        <Button.Group key="0">
                            <ProjectDropdown
                                style={{ border: '1px solid lightgrey', width: 196 }}
                                button
                                basic
                                label=""
                                placeholder="Select a project"
                                key="0"
                                onChange={(_, { options, value: projectHash }) => this.getEntries(
                                    projectHash,
                                    projectHash && options.find(o => o.value === projectHash).project
                                )}
                                noResultsMessage="Project name, hash or owner"
                                selectOnNavigation={false}
                            />
                            <Button {...{
                                active: false,
                                content: 'Timer',
                                icon: 'clock outline',
                                key: 1,
                                onClick: () => {
                                    const { projectHash } = this.state
                                    showForm(TimeKeepingForm, { modal: true, projectHash, onSubmit: ()=> {
                                        const { projectHash, project } = this.state
                                        this.getEntries(projectHash, project)
                                    }})
                                }
                            }} />
                        </Button.Group>
                    )
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

        setTimeout(()=>this.getEntries())
    }

    componentWillMount() {
        this.updateBond = Bond.all([
            storage.walletIndexBond,
            storage.timeKeepingBond,
            secretStore(),
            addressbook.getBond(),
        ])

        this.tieId = this.updateBond.notify(() => this.getEntries(this.state.projectHash, this.state.project))
    }

    componentWillUnmount() {
        this.updateBond.untie(this.tieId)
    }

    getActionContent(entry, hash) {
        const { isOwner, projectHash, project } = this.state
        const {address: selectedAddress} = secretStore()._keys[storage.walletIndex()] || {}
        const isUser = selectedAddress === entry.address
        const btnProps = isOwner && !isUser ? {
            disabled: !isOwner || entry.approved === true,
            icon: 'bug',
            onClick: toBeImplemented,
            title: 'Dispute',
        } : {
            disabled: entry.address !== selectedAddress || entry.approved === true,
            icon: 'pencil',
            onClick: ()=> showForm(
                TimeKeepingUpdateForm,
                { entry, hash, onSubmit: ()=> this.getEntries(projectHash, project) }
            ),
            title: 'Edit',
        }

        const options = [
            // {
            //     icon: 'copy outline',
            //     key: 0,
            //     text: 'Copy Address',
            //     onClick: () => copyToClipboard(entry.address)
            // },
            {
                content: 'Add Partner',
                hidden: !!addressbook.getByAddress(entry.address) || !!secretStore().find(entry.address),
                icon: 'user plus',
                key: 1,
                onClick: ()=> showForm(
                    PartnerForm,
                    {values: {address: entry.address}}
                ),
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
                onClick: ()=> this.handleApprove(hash, false),
            }
        ].filter(x => !x.hidden)

        return (
            <Button.Group>
                <Button {...btnProps} style={{marginLeft: -10}} />
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

    getEntries(projectHash = '', project = {}) {
        const { listProps} = this.state
        const address = secretStore()._keys[storage.walletIndex()].address
        const isOwner = project.ownerAddress === address
        const bannedAddresses = (project.timeKeeping || {}).bannedAddresses || []
        // // only show personal bookings if not owner
        listProps.loading = true
        listProps.selectable = isOwner
        this.setState({ isOwner, listProps, projectHash, project })
        const query = {}
        if (projectHash) {
            query.projectHash = projectHash
        }
        listProps.columns.find(x => x.key === '_projectName').hidden = !!projectHash

        if (!isOwner) {
            // only show other user's entries if select wallet is the project owner
            query.address = address
        }
        client.handleTimeKeepingEntrySearch(
            query, true, true, true,
            (err, data) => {
                // exclude any banned address
                data = mapFilter(data, entry => entry.approved || bannedAddresses.indexOf(entry.address) === -1)
                listProps.loading = false
                listProps.data = data
                const projectHashes = []
                Array.from(data).forEach(x => {
                    const item = x[1]
                    const { address, ratePeriod, rateAmount, rateUnit, approved, totalAmount } = item
                    item._banned = bannedAddresses.indexOf(address) >= 0 ? 'Yes' : 'No'
                    item._nameOrAddress = getAddressName(address)
                    item._rate = rateUnit + rateAmount + '/' + ratePeriod
                    item._status = !isDefined(approved) ? '-' : (approved ? 'Approved' : 'Rejected')
                    item._total = rateUnit + totalAmount.toFixed(2)
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
        const { listProps: {data}, project, projectHash } = this.state
        const entry = data.get(hash)
        if (entry.approved === approve) return
        const queueProps = {
            type: QUEUE_TYPES.CHATCLIENT,
            func: 'timeKeepingEntryApproval',
            args: [hash, approve, ()=> this.getEntries(projectHash, project)],
            title: 'Time Keeping - Approve',
            description: `Hash: ${hash} | Duration: ${entry.duration}`
        }
        addToQueue(queueProps)
    }

    handleBan(selectedKeys) {
        const { listProps: { data }, project, projectHash } = this.state
        const {timeKeeping} = project
        const {bannedAddresses} = timeKeeping || {}
        let addresses = arrUnique(selectedKeys.map(key => data.get(key).address))
            // filter out user wallets
            .filter(address => !secretStore().find(address))
        // prevents accidental self-banning
        if(addresses.length === 0) return confirm({
            cancelButton: null,
            content: 'You cannot ban your own wallet(s)',
            header: 'Uh oh!',
            size: 'tiny',
        })

        addresses = addresses.filter(address => (bannedAddresses || []).indexOf(address) === -1)
        const s = addresses.length <= 1 ? '' : 's'
        const es = s ? 'es' : ''
        if(addresses.length === 0) return confirm({
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
                args: [projectHash, null, null, (err, project) => !err && this.getEntries(projectHash, project)],
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
            onConfirm: ()=> addToQueue(queueProps)
        })
    }

    handleRowSelect(selectedKeys) {
        const {isOwner, listProps, projectHash} = this.state
        const { topLeftMenu: leftMenu } = listProps
        leftMenu.forEach( x => x.hidden = selectedKeys.length === 0
            || (!isOwner && ['Approve', 'Reject'].indexOf(x.key ) >= 0)
            || (!projectHash && ['Ban'].indexOf(x.key) >= 0))
        
        this.setState({listProps})
    }

    render() {
        return <ListFactory {...this.state.listProps} />
    }
}

ProjectTimeKeepingList.propTypes = {
    project: PropTypes.shape({
        hash: PropTypes.string,
        name: PropTypes.name,
        ownerAddress: PropTypes.string
    })//.isRequired
}

// for test only
ProjectTimeKeepingList.defaultProps = {
    project: {
        hash: '0x5652e822f39f2ac58517017aaf8ec000e3bce24bd0e0f08d916df67c76641df8',
        name: 'Alice\'s Project 01',
        ownerAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
    }
}

const sampleOwners = [
    '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    '5Fk6Ek9BuoyqPrDA54P54PpXdGmWFpMRSd8Ghsz7FsF8XHcH',
    '5EqAJNwzZ7VozoBHYPxN7aKKR21qZQfsDSnatQtc2miiEwuG',
    '5HCAZvwcvF9ZokEDHEJYUcTaMiBi44yuaBDRixWpY9tNMmnm'
]

// generate sample time bookings for test only
const sampleBookingsByProject = new Array(10).fill({}).map((x, i) => {
    const blockStart = randomInt(1, 320000)
    const blockEnd = blockStart + randomInt(100, 100000)
    const blockCount = blockEnd - blockStart
    const ratePeriod = RATE_PERIODS[i % RATE_PERIODS.length]
    const rateAmount = randomInt(1, 10)
    return {
        hash: '0x' + (i + '').padStart(10, '0'), // tx hash?
        address: sampleOwners[i % sampleOwners.length],
        approved: false,
        blockStart: blockStart,
        blockEnd: blockEnd,
        blockCount,
        duration: secondsToDuration(blockCount * 5),
        projectHash: '0x67199a17ff2a829703b308bb507ad6c66359587851f0634d2868de43ea3d63a8',
        rateAmount,
        rateUnit: '$', // network currency only or any currency including fiat and crypto?
        ratePeriod: ratePeriod, // block (default), hour or day,
        totalAmount: calcAmount(blockCount, rateAmount, ratePeriod), // total chargeable/payable amount
        tsCreated: new Date(),
        tsUpdated: new Date()
    }
})