import React, { Component } from 'react'
import { BLOCK_DURATION_SECONDS, secondsToDuration } from '../../utils/time'
import { isFn } from '../../utils/utils'
import DataTable from '../../components/DataTable'
import { getSelected, rxSelected } from '../../services/identity'
import { translated } from '../../services/language'
import { unsubscribe } from '../../services/react'
import { getProjects, query } from './timekeeping'

const textsCap = translated({
    activity: 'activity',
    percentage: 'percentage',
    noTimeRecords: 'you have not yet booked time on an activity',
    totalBlocks: 'total time in blocks',
    totalHours: 'total time in hours',
    yourContribution: 'how your time is divided',
}, true)[1]

export default class TimekeepingSummaryList extends Component {
    constructor(props) {
        super(props)

        this.state = {
            data: [],
            emptyMessage: {
                content: textsCap.noTimeRecords,
                status: 'warning',
            },
            searchable: false,
            columns: [
                {
                    key: 'name',
                    title: textsCap.activity,
                },
                {
                    key: 'totalHours',
                    textAlign: 'center',
                    title: textsCap.totalHours,
                },
                {
                    key: 'totalBlocks',
                    textAlign: 'center',
                    title: textsCap.totalBlocks,
                },
                {
                    key: 'percentage',
                    textAlign: 'center',
                    title: textsCap.yourContribution,
                }
            ]
        }
        this.originalSetState = this.setState
        this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
    }

    componentWillMount() {
        this._mounted = true
        this.subscriptions = {
            selected: rxSelected.subscribe(() => this._mounted && this.getSummary())
        }
    }

    componentWillUnmount() {
        this._mounted = false
        unsubscribe(this.subscriptions)
    }

    getSummary = async (arrTotalBlocks) => {
        const projects = await getProjects()
        const { address } = getSelected()
        const recordIds = Array.from(projects).map(([hash]) => hash)
        if (!arrTotalBlocks || address !== this.address) {
            this.address = address
            const { totalBlocks } = this.subscriptions
            // unsubscribe from existing subscription
            isFn(totalBlocks) && totalBlocks()
            this.subscriptions.totalBlocks = query.worker.totalBlocksByProject(
                recordIds.map(() => address),
                recordIds, // for multi query needs to be a 2D array of arguments
                this.getSummary,
                true,
            )
            return
            // const bonds = recordIds.map(hash => query.worker.totalBlocksByProject(address, hash))
            // this.bond = Bond.all(bonds)
            // return this.tieIdBlocks = this.bond.tie(this.getSummary)
        }
        const sumTotalBlocks = arrTotalBlocks.reduce((sum, next) => sum + next, 0)
        const data = arrTotalBlocks.map((totalBlocks, i) => ({
            name: projects.get(recordIds[i]).name,
            totalBlocks,
            totalHours: secondsToDuration(totalBlocks * BLOCK_DURATION_SECONDS),
            percentage: totalBlocks === 0 ? '0%' : (totalBlocks * 100 / sumTotalBlocks).toFixed(0) + '%',
        }))
        this.setState({ data })
    }

    render = () => <DataTable {...this.state} />
}