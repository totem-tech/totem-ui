import React from 'react'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import { BLOCK_DURATION_SECONDS, secondsToDuration } from '../utils/time'
import { textCapitalize } from '../utils/utils'
import DataTable from '../components/DataTable'
import client from '../services/ChatClient'
import { getSelected, selectedAddressBond } from '../services/identity'
import timeKeeping, { getProjects } from '../services/timeKeeping'

const words = {
    project: 'project',
    percentage: 'percentage',
}
const wordsCap = textCapitalize(words)        // const { address } = getSelected()

const texts = {
    noTimeRecords: 'No time records found for selected identity',
    totalBlocks: 'Total Blocks',
    totalHours: 'Total Hours',

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
                    title: wordsCap.project,
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
                    title: wordsCap.percentage,
                }
            ]
        }
    }

    componentWillMount() {
        this.tieId = selectedAddressBond.tie(() => this.getSummary())
    }

    componentWillUnmount() {
        selectedAddressBond.untie(this.tieId)
    }

    getSummary() {
        const { address } = getSelected()
        getProjects().then(projects => {
            const hashes = Array.from(projects).map(([hash]) => hash)
            const bonds = hashes.map(hash => timeKeeping.record.totalBlocksByProject(address, hash))
            Bond.promise(bonds).then(arrTotalBlocks => {
                console.log({ hashes, arrTotalBlocks })
            })
        })

        this.setState({ emptyMessage: { header: 'To be implemented' } })
    }

    render() {
        return <DataTable {...this.state} />
    }
}