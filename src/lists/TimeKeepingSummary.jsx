import React from 'react'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import { BLOCK_DURATION_SECONDS, secondsToDuration, durationToSeconds } from '../utils/time'
import { textCapitalize } from '../utils/utils'
import DataTable from '../components/DataTable'
import client from '../services/chatClient'
import { getSelected, selectedAddressBond } from '../services/identity'
import timeKeeping, { getProjects } from '../services/timeKeeping'

const words = {
    activity: 'activity',
    percentage: 'percentage',
}
const wordsCap = textCapitalize(words)        // const { address } = getSelected()

const texts = {
    noTimeRecords: 'You have not yet booked time on an activity',
    totalBlocks: 'Total Time in Blocks',
    totalHours: 'Total Time in Hours',
    yourContribution: 'Your Time Contribution versus Total Booked Time',

}

export default class TimeKeepingSummary extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.state = {
            data: [],
            emptyMessage: {
                content: texts.noTimeRecords,
                status: 'warning',
            },
            searchable: false,
            columns: [
                {
                    key: 'name',
                    title: wordsCap.activity,
                },
                {
                    key: 'totalHours',
                    textAlign: 'center',
                    title: texts.totalHours,
                },
                {
                    key: 'totalBlocks',
                    textAlign: 'center',
                    title: texts.totalBlocks,
                },
                {
                    key: 'percentage',
                    textAlign: 'center',
                    title: texts.yourContribution,
                }
            ]
        }
    }

    componentWillMount = () => this.tieId = selectedAddressBond.tie(this.getSummary)

    componentWillUnmount = () => selectedAddressBond.untie(this.tieId) | this.bond && this.bond.untie(this.tieIdBlocks)

    getSummary = arrTotalBlocks => getProjects().then(projects => {
        const { address } = getSelected()
        const hashes = Array.from(projects).map(([hash]) => hash)
        if (!arrTotalBlocks || address !== this.address) {
            this.address = address
            const bonds = hashes.map(hash => timeKeeping.worker.totalBlocksByProject(address, hash))
            this.bond = Bond.all(bonds)
            return this.tieIdBlocks = this.bond.tie(this.getSummary)
        }
        const sumTotalBlocks = arrTotalBlocks.reduce((sum, next) => sum + next, 0)
        const data = arrTotalBlocks.map((totalBlocks, i) => ({
            name: projects.get(hashes[i]).name,
            totalBlocks,
            totalHours: secondsToDuration(totalBlocks * BLOCK_DURATION_SECONDS),
            percentage: (totalBlocks * 100 / sumTotalBlocks).toFixed(0) + '%',
        }))
        this.setState({ data })
    })

    render = () => <DataTable {...this.state} />
}