import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import { secretStore } from 'oo7-substrate'
import ListFactory from '../components/ListFactory'
import storage from '../services/storage'
import client from '../services/ChatClient'
import { BLOCK_DURATION_SECONDS, secondsToDuration } from '../utils/time'

export default class TimeKeepingSummary extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.state = {
            data: [],
            emptyMessage: {
                content: 'You have no record of any time bookings',
                status: 'warning',
            },
            searchable: false,
            type: 'DataTable',
            columns: [
                {
                    key: 'name',
                    title: 'Project'
                },
                {
                    key: 'totalHours',
                    textAlign: 'center',
                    title: 'Total Hours',
                },
                {
                    key: 'totalBlocks',
                    textAlign: 'center',
                    title: 'Total Blocks',
                },
                {
                    key: 'percentage',
                    textAlign: 'center',
                    title: 'Percentage',
                }
            ]
        }
        setTimeout(()=>this.getSummary())
    }
    
    componentWillMount() {
        this.tieId = storage.walletIndexBond.tie(() => this.getSummary())
    }

    componentWillUnmount() {
        storage.walletIndexBond.untie(this.tieId)
    }

    getSummary() {
        const address = (secretStore()._keys[storage.walletIndex()] || {}).address
        client.handleTimeKeepingEntrySearch({address}, true, true, false, (err, entries) => {
            const entriesArr = Array.from(entries)
            const userTotalBlocks = entriesArr.reduce((sum, [_, entry]) => sum + entry.blockCount, 0)
            const projectHashes = Object.keys(entriesArr.reduce((hashes, [_, entry]) => {
                hashes[entry.projectHash] = 0
                return hashes
            }, {}))
            const data = projectHashes.map(hash => {
                const totalBlocks = entriesArr.filter(([_, x]) => x.projectHash === hash)
                    .reduce((totalBlocks, [_, entry]) => totalBlocks + entry.blockCount, 0)
                return {
                    hash,
                    name: '',
                    totalHours: secondsToDuration(totalBlocks * BLOCK_DURATION_SECONDS),
                    totalBlocks,
                    percentage: ((totalBlocks / userTotalBlocks) * 100).toFixed(2) + '%'
                }
            }) || []
            this.setState({data})
            setTimeout(()=> this.getProjectNames())
        })
    }
    
    getProjectNames() {
        const {data} = this.state
        data.forEach(row => {
            client.project(row.hash, null, null, (err, { name }) => {
                row.name = name
                this.setState({data})
            })
        })
    }

    render() {
        return <ListFactory {...this.state} />
    }
}