import React, { Component } from 'react'
import { Button, Label } from 'semantic-ui-react'
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
import { getById } from '../../services/history'

const textsCap = translated({
    action: 'action',
    assignee: 'assignee',
    bounty: 'bounty',
    create: 'create',
    description: 'description',
    emptyMsgMarketPlace: 'search for marketplace tasks by title or description',
    loading: 'loading',
    marketplace: 'marketplace',
    no: 'no',
    status: 'status',
    tags: 'tags',
    taskOwner: 'task owner',
    title: 'title',
    update: 'update',
    yes: 'yes',
}, true)[1]
const listTypes = Object.freeze({
    approver: 'approver',
    beneficiary: 'beneficiary',
    marketplace: 'marketplace',
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
        this.isMarketplace = this.listType === listTypes.marketplace
        const keywordsKey = 'keywords' + this.listType
        const showCreate = this.isOwner || this.isMarketplace
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
                    content: ({ tags = [] }) => tags.map(tag => (
                        <Label
                            key={tag}
                            draggable='true'
                            onDragStart={e => {
                                e.stopPropagation()
                                e.dataTransfer.setData("Text", e.target.textContent)
                            }}
                            style={{
                                cursor: 'grab',
                                display: 'inline',
                                // float: 'left',
                                margin: 1,
                            }}
                        >
                            {tag}
                        </Label>
                    )),
                    key: 'tags',
                    title: textsCap.tags,
                    style: { textAlign: 'center' },
                },
                {
                    collapsing: true,
                    key: '_status',
                    title: textsCap.status,
                },
                {
                    collapsing: true,
                    content: ({ publish }) => publish ? textsCap.yes : textsCap.no,
                    key: 'publish',
                    title: textsCap.marketplace,
                },
                // { key: 'description', title: textsCap.description },
                {
                    collapsing: true,
                    content: this.getActions,
                    textAlign: 'center',
                    title: textsCap.action
                },
            ],
            emptyMessage: this.isMarketplace ? textsCap.emptyMsgMarketPlace : undefined,
            // preserve search keywords
            keywords: cachedData.get(keywordsKey),
            searchHideOnEmpty: !this.isMarketplace,
            searchOnChange: keywords => cachedData.set(keywordsKey, keywords),
            topLeftMenu: [
                showCreate && {
                    content: textsCap.create,
                    icon: 'plus',
                    onClick: () => showForm(TaskForm, {
                        onSubmit: this.handleTaskSubmit,
                        values: !this.isMarketplace ? undefined : { publish: 1 },
                        size: 'tiny',
                    }),
                }
            ].filter(Boolean)
        }

        this.originalSetState = this.setState
        this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
    }

    handleTaskSubmit = (success, values, taskId, historyId) => {
        if (!success) return
        const { updater } = this.props
        taskId = taskId || (getById(historyId) || { data: [] }).data[0]
        if (!taskId.startsWith('0x')) return
        updater([taskId])
    }

    getActions = (task, taskId) => {
        return [
            this.isOwner && {
                icon: 'pencil',
                onClick: () => showForm(TaskForm, {
                    onSubmit: this.handleTaskSubmit,
                    taskId,
                    values: task,
                }),
                title: textsCap.update,
            },
            this.showDetails && {
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
    updater: PropTypes.func.isRequired,
}
TaskList.defaultProps = {
    listType: listTypes.owner,
}
export default React.memo(TaskList)