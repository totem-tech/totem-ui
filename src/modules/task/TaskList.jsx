import React, { Component } from 'react'
import { Tab } from 'semantic-ui-react'
import PropTypes from 'prop-types'
// components
import DataTable from '../../components/DataTable'
// forms
import TaskForm from './TaskForm'
// services
import { query } from '../../services/blockchain'
import { translated } from '../../services/language'
import { showForm } from '../../services/modal'
import { selectedAddressBond, getSelected } from '../../services/identity'
import { isFn, textEllipsis } from '../../utils/utils'
import { getAddressName } from '../../services/partner'
import Currency from '../../components/Currency'

const textsCap = translated({
    actions: 'actions',
    assignee: 'assignee',
    bounty: 'bounty',
    create: 'create',
    description: 'description',
    loading: 'loading',
    tags: 'tags',
    taskOwner: 'task owner',
    title: 'title',
}, true)[1]
const listTypes = Object.freeze({
    owner: 'owner',
    approver: 'approver',
    assigned: 'beneficiary',
})
// cache data so that 
const cachedData = new Map()

class TaskList extends Component {
    constructor(props) {
        super(props)

        this.listType = listTypes[props.type] || listTypes.owner
        this.isOwner = this.listType === listTypes.owner
        this.isFulfiller = this.listType === listTypes.assigned
        this.state = {
            columns: [
                { key: 'title', title: textsCap.title },
                { collapsing: true, key: '_amountXTX', title: textsCap.bounty },
                {
                    hidden: this.isOwner,
                    key: '_owner',
                    title: textsCap.taskOwner,
                },
                {
                    hidden: !this.isFulfiller,
                    key: '_fulfiller',
                    title: textsCap.assignee,
                },
                { key: 'tags', title: textsCap.tags },
                { key: 'description', title: textsCap.description },
                { title: textsCap.actions }
            ],
            topLeftMenu: [
                this.isOwner && {
                    content: textsCap.create,
                    icon: 'plus',
                    onClick: () => showForm(TaskForm, { size: 'tiny' }),
                }
            ].filter(Boolean)
        }

        this.originalSetState = this.setState
        this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
    }

    componentWillMount() {
        this._mounted = true
        this.unsubscribers = {}
        this.tieIdAddress = selectedAddressBond.tie(this.handleSelectedAddressChange)
    }

    componentWillUnmount() {
        this._mounted = false
        selectedAddressBond.untie(this.tieIdAddress)
        this.unsubscribe()
    }

    handleSelectedAddressChange = async (address) => {
        if (!this.listType) return
        // unsubscribe to any existing subscriptions
        this.unsubscribe()
        const key = getSelected().address + this.listType
        const data = cachedData.get(key) || undefined
        this.setState({ data, loading: !data })

        // subscribe to hash list changes
        this.unsubscribers.recordList = await query(
            `api.query.orders.${this.listType}`,
            [
                address,
                async (recordIds) => {
                    this.unsubscribers.orders = await query(
                        'api.query.orders.order',
                        [recordIds, this.updateOrdersCb(key, recordIds)],
                        true,
                    )
                }
            ]
        )
    }

    unsubscribe = () => Object.values(this.unsubscribers).forEach(fn => isFn(fn) && fn())

    updateOrdersCb = (key, recordIds) => orders => {
        const { data = new Map() } = this.state
        orders.filter(Boolean).forEach((order, i) => {
            const [
                owner,
                approver,
                fullfiller,
                isSell,
                amountXTX,
                isClosed,
                orderType,
                deadline,
                dueDate,
            ] = order
            const existing = data.get(recordIds[i])
            data.set(recordIds[i], {
                ...existing,
                owner,
                approver,
                fullfiller,
                isSell,
                amountXTX: eval(amountXTX),
                isClosed,
                orderType,
                deadline,
                dueDate,
                _amountXTX: <Currency value={eval(amountXTX)} />,
                _owner: getAddressName(owner) || textEllipsis(owner, 15),
                _fulfiller: getAddressName(fullfiller) || textEllipsis(fullfiller, 15),
            })
        })
        this.setState({ data, loading: undefined })
        cachedData.set(key, data)
    }

    render = () => {
        const { asTabPane } = this.props
        const { loading } = this.state
        const el = <DataTable {...{ ...this.props, ...this.state }} />
        return !asTabPane ? el : <Tab.Pane loading={loading}>{el}</Tab.Pane>
    }
}
TaskList.propTypes = {
    asTabPane: PropTypes.bool,
    // valid options: owner, approver, fullfiller
    listType: PropTypes.string,
}
TaskList.defaultProps = {
    asTabPane: false,
    listType: listTypes.owner,
}
export default React.memo(TaskList)