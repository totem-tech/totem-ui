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
import { Button, Dropdown, Header, Icon } from 'semantic-ui-react'
import ListFactory from '../components/ListFactory'
import { randomInt } from '../utils/utils'
import {
    BLOCK_DURATION_SECONDS,
    BLOCK_DURATION_REGEX,
    calcAmount,
    durationToSeconds,
    RATE_PERIODS,
    secondsToDuration,
} from '../utils/time'
import TimeKeepingForm from '../forms/TimeKeeping'
import { showForm } from '../services/modal'
import storageService from '../services/storage'
import addressbook from '../services/addressbook'
import ProjectDropdown from '../components/ProjectDropdown'

const toBeImplemented = () => alert('To be implemented')
const getName = addr => (secretStore().find(addr) || {}).name || (addressbook.getByAddress(addr) || {}).name || addr

export default class ProjectTimeKeepingList extends ReactiveComponent {
    constructor(props) {
        super(props, {
            // _0: storageService.walletIndexBond,
            _1: storageService.timeKeepingBond
        })

        this.state = {
            projectHash: '',
            columns: [
                {
                    // collapsing: true,
                    key: '_nameOrAddress',
                    title: 'Address'
                },
                {
                    // collapsing: true,
                    key: 'duration',
                    textAlign: 'center',
                    title: 'Duration'
                },
                {
                    // collapsing: true,
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
                    key: '_approved',
                    textAlign: 'center',
                    title: 'Approved',
                },
                {
                    collapsing: true,
                    content: (item) => {
                        const index = storageService.walletIndex()
                        const selectedAddress = secretStore()._value.keys[index].address
                        const isUser = item.address === selectedAddress
                        return isUser && <Button icon="pencil" onClick={toBeImplemented} />
                    },
                    textAlign: 'center',
                    title: 'Action',
                }
            ],
            defaultSort: 'status',
            perPage: 10,
            // searchable: false,
            searchExtraKeys: [
                'address',
                'hash',
                'approved',
            ],
            topLeftMenu: [
                <Button.Group key="0">
                    <ProjectDropdown
                        style={{ border: '1px solid lightgrey', width: 196 }}
                        button
                        basic
                        label=""
                        placeholder="Select a project"
                        key="0"
                        onChange={(_, { value: projectHash }) => this.setState({ projectHash })}
                        noResultsMessage="Project name, hash or owner"
                    />
                    <Button {...{
                        active: false,
                        content: 'Timer',
                        icon: 'clock',
                        key: 1,
                        onClick: () => {
                            const { projectHash } = this.state
                            showForm(TimeKeepingForm, { modal: true, projectHash })
                        }
                    }} />
                </Button.Group>
            ],
            type: 'datatable',
        }
    }

    componentDidMount() {
        this.tieId = storageService.walletIndexBond.tie(() => this.setData((this.props.project || {}).hash))
    }

    componentWillUnmount() {
        storageService.walletIndexBond.untie(this.tieId)
    }

    setData(projectHash) {
        const data = sampleBookingsByProject.map(item => {
            const { address, ratePeriod, rateAmount, rateUnit, approved, totalAmount } = item
            item._nameOrAddress = getName(address)
            item._rate = rateUnit + rateAmount + '/' + ratePeriod
            item._approved = approved ? 'Yes' : 'No'
            item._total = rateUnit + totalAmount.toFixed(2)
            return item
        })
        this.setState({ data })
    }

    render() {
        const { project } = this.props
        const { state: listProps } = this
        const index = storageService.walletIndex()
        const selectedAddress = secretStore()._value.keys[index].address
        const isOwner = project.ownerAddress === selectedAddress
        // only show personal bookings if not owner
        listProps.data = isOwner ? listProps.data : (listProps.data || []).filter(x => x.address === selectedAddress)
        listProps.selectable = isOwner
        listProps.topRightMenu = !isOwner ? [] : [
            {
                icon: { name: 'check', color: 'green' },
                key: 'Approve',
                onClick: toBeImplemented,
                content: 'Approve',
            },
            {
                icon: { name: 'x', color: 'red' },
                key: 'Reject',
                onClick: toBeImplemented,
                content: 'Reject',
            }
        ]

        return <ListFactory {...listProps} />
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