import React from 'react'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import { BLOCK_DURATION_SECONDS, secondsToDuration } from '../utils/time'
import DataTable from '../components/DataTable'
import { getSelected, selectedAddressBond } from '../services/identity'
import { translated } from '../services/language'
import timeKeeping, { getProjects } from '../services/timeKeeping'

const [words, wordsCap] = translated({
    activity: 'activity',
    percentage: 'percentage',
}, true)
const [texts] = translated({
    noTimeRecords: 'You have not yet booked time on an activity',
    totalBlocks: 'Total Time in Blocks',
    totalHours: 'Total Time in Hours',
    yourContribution: 'How Your Time is Divided',
})

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
        this.originalSetState = this.setState
        this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
    }

    componentWillMount() {
        this._mounted = true
        this.tieId = selectedAddressBond.tie(this.getSummary)
    }

    componentWillUnmount() {
        this._mounted = false
        selectedAddressBond.untie(this.tieId)
        this.bond && this.bond.untie(this.tieIdBlocks)
    }

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
            percentage: totalBlocks === 0 ? '0%' : (totalBlocks * 100 / sumTotalBlocks).toFixed(0) + '%',
        }))
        this.setState({ data })
    })

    render = () => <DataTable {...this.state} />
}