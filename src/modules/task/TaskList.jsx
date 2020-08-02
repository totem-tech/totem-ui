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
    approver: 'approver',
    beneficiary: 'beneficiary',
    owner: 'owner',
})
// cache data so that 
const cachedData = new Map()

class TaskList extends Component {
    constructor(props) {
        super(props)

        this.listType = listTypes[props.type] || listTypes.owner
        this.isOwner = this.listType === listTypes.owner
        this.isFulfiller = this.listType === listTypes.beneficiary
        const keywordsKey = 'keywords' + this.listType
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
            // preserve search keywords
            keywords: cachedData.get(keywordsKey),
            searchOnChange: keywords => cachedData.set(keywordsKey, keywords),
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
    }

    componentWillUnmount() {
        this._mounted = false
    }

    render = () => {
        let { asTabPane, loading } = this.props
        loading = this.state.loading || loading
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