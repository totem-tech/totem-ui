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
import { FormInput } from '../../components/FormInput'
import { getSelected } from '../../services/identity'
import { approvalStatuses, queueables, statuses } from './task'
import { ButtonAcceptOrReject } from '../../components/buttons'
import { addToQueue } from '../../services/queue'
import { isArr } from '../../utils/utils'

const textsCap = translated({
    acceptTask: 'accept task',
    action: 'action',
    approve: 'approve',
    approved: 'approved',
    approvedChangeNotAllowed: 'approved task cannot be changed',
    assignee: 'assignee',
    bounty: 'bounty',
    create: 'create',
    description: 'description',
    emptyMsgMarketPlace: 'search for marketplace tasks by title or description',
    loading: 'loading',
    marketplace: 'marketplace',
    no: 'no',
    rejectTask: 'reject task',
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
// preserves search keywords for each list type until page reloads
const tempCache = new Map()
const toBeImplemented = () => alert('to be implemented')

class TaskList extends Component {
    constructor(props) {
        super(props)

        this.selectedAddress = getSelected().address
        this.listType = listTypes[props.type] || listTypes.owner
        this.isOwner = this.listType === listTypes.owner
        this.isApprover = this.listType === listTypes.approver
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
                    hidden: this.isFulfiller,
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
                    content: (task, taskId) => {
                        const { fulfiller, orderStatus, _orderStatus } = task
                        const isFulfiller = this.selectedAddress === fulfiller
                        const isSubmitted = orderStatus === statuses.submitted
                        const { acceptInProgress } = tempCache.get(taskId) || {}

                        return !isFulfiller || !isSubmitted ? _orderStatus : (
                            <ButtonAcceptOrReject
                                disabled={acceptInProgress}
                                loading={acceptInProgress}
                                onClick={accept => this.handleAccept(taskId, accept)}
                            />
                        )
                    },
                    collapsing: true,
                    key: '_orderStatus',
                    title: textsCap.status,
                },
                {
                    content: (task, taskId) => {
                        const { approvalStatus, approver, _approvalStatus } = task
                        const isPendingAproval = approvalStatus === approvalStatuses.pendingApproval
                        const isApprover = this.selectedAddress === approver
                        const { approveInProgress } = tempCache.get(taskId) || {}

                        return !isApprover || !isPendingAproval ? _approvalStatus : (
                            <ButtonAcceptOrReject
                                acceptText={textsCap.approve}
                                disabled={approveInProgress}
                                loading={approveInProgress}
                                onClick={approve => this.handleApprove(taskId, approve)}
                            />
                        )
                    },
                    collapsing: true,
                    key: '_approvalStatus',
                    title: textsCap.approved,
                },
                {
                    collapsing: true,
                    content: this.getActions,
                    textAlign: 'center',
                    title: textsCap.action
                },
            ],
            emptyMessage: this.isMarketplace ? textsCap.emptyMsgMarketPlace : undefined,
            // preserve search keywords
            keywords: tempCache.get(keywordsKey),
            // perPage: 100,
            searchable: !this.isMarketplace ? true : (
                <FormInput {...{
                    // for advanced filtering
                    // filter by: 
                    //      tags(categories?),
                    //      amountXTX (convert from display currency if necessary)
                    //      deadline (convert timestamp to block number before search)
                    //      created after (tsCreated)
                    // search by: title, description, userId (filter by partner userId or own (default on first load??))
                    action: {
                        icon: 'filter',
                        onClick: toBeImplemented
                    },
                    icon: 'search',
                    iconPosition: 'left',
                    name: 'search',
                    placeholder: 'search',
                    type: 'search'
                }} />
            ),
            searchExtraKeys: ['_taskId'],
            searchHideOnEmpty: !this.isMarketplace,
            searchOnChange: keywords => tempCache.set(keywordsKey, keywords),
            topLeftMenu: [
                showCreate && {
                    content: textsCap.create,
                    icon: 'plus',
                    onClick: () => showForm(TaskForm, {
                        values: !this.isMarketplace ? undefined : { isClosed: 0 },
                        size: 'tiny',
                    }),
                }
            ].filter(Boolean)
        }
    }

    getActions = (task, taskId) => [
        this.isOwner && {
            disabled: !task.allowEdit,
            icon: 'pencil',
            onClick: () => showForm(TaskForm, { taskId, values: task }),
            title: textsCap.update,
        },
        this.showDetails && {
            icon: 'eye',
            onClick: () => this.showDetails(task, taskId),
            title: textsCap.techDetails
        }
    ].filter(Boolean)
        .map((props, i) =>
            <Button {...props} key={`${i}-${props.title}`} />
        )

    handleAccept = (taskIds, accept = true) => {
        taskIds = isArr(taskIds) ? taskIds : [taskIds]
        taskIds.forEach(taskId => {
            tempCache.set(
                taskId,
                { ...tempCache.get(taskId), acceptInProgress: true },
            )
            const queueProps = queueables.accept(this.selectedAddress, taskId, accept, {
                description: taskId,
                title: accept ? textsCap.acceptTask : textsCap.rejectTask,
                then: () => {
                    tempCache.set(taskId, {
                        ...tempCache.get(taskId),
                        acceptInProgress: false,
                    })
                    this.forceUpdate()
                }
            })
            addToQueue(queueProps)
        })
        this.forceUpdate()
    }

    handleApprove = (taskId, approve = true) => {
        return toBeImplemented()
    }

    showDetails = (task, taskId) => {
        console.log({ task, taskId })
        toBeImplemented()
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