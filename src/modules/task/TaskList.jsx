import React, { Component } from 'react'
import { Button } from 'semantic-ui-react'
import PropTypes from 'prop-types'
// components
import Currency from '../../components/Currency'
import DataTable from '../../components/DataTable'
// forms
import TaskForm from './TaskForm'
// services
import { translated } from '../../services/language'
import { showForm } from '../../services/modal'
import { isFn } from '../../utils/utils'

const textsCap = translated({
    action: 'action',
    assignee: 'assignee',
    bounty: 'bounty',
    create: 'create',
    description: 'description',
    loading: 'loading',
    status: 'status',
    tags: 'tags',
    taskOwner: 'task owner',
    title: 'title',
    update: 'update',
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
                {
                    collapsing: true,
                    content: ({ amountXTX }) => <Currency value={amountXTX} emptyMessage={textsCap.loading} />,
                    key: 'amountXTX',
                    title: textsCap.bounty,
                },
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
                {
                    collapsing: true,
                    key: '_status',
                    title: textsCap.status,
                },
                { key: 'tags', title: textsCap.tags },
                { key: 'description', title: textsCap.description },
                {
                    collapsing: true,
                    content: this.getActions,
                    textAlign: 'center',
                    title: textsCap.action
                },
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

    getActions = (task, taskId) => {
        return [
            this.isOwner && {
                icon: 'pencil',
                onClick: () => showForm(TaskForm, {
                    onSubmit: success => {
                        const { updater } = this.props
                        if (!success || !isFn(updater)) return
                        updater([taskId])
                    },
                    taskId,
                    values: task,
                }),
                title: textsCap.update,
            },
            {
                icon: 'eye',
                onClick: () => this.showDetails(task, taskId),
                title: textsCap.techDetails
            }
        ]
            .filter(Boolean)
            .map((props, i) => <Button {...props} key={`${i}-${props.title}`} />)
    }

    render = () => <DataTable {...{ ...this.props, ...this.state }} />
}
TaskList.propTypes = {
    // @listType valid options: owner, approver, fulfiller etc
    listType: PropTypes.string,
}
TaskList.defaultProps = {
    listType: listTypes.owner,
}
export default React.memo(TaskList)