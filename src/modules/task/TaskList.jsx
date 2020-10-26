import React, { Component, useReducer } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import { Button, Label } from 'semantic-ui-react'
import { isArr, isObj } from '../../utils/utils'
// components
import { ButtonAcceptOrReject } from '../../components/buttons'
import Currency from '../../components/Currency'
import DataTable from '../../components/DataTable'
import { FormInput } from '../../components/FormInput'
// forms
import TaskForm from './TaskForm'
// services
import { translated } from '../../services/language'
import { showForm, confirm } from '../../services/modal'
import { addToQueue, rxOnSave, statuses as queueStatuses } from '../../services/queue'
import { reducer, useRxSubject } from '../../services/react'
import { getSelected, rxSelected } from '../identity/identity'
import { approvalStatuses, query, queueableApis, queueables, statuses } from './task'
import { handleTaskAssignment, handleUpdateStatus } from './notificationHandlers'
import TaskDetailsForm from './TaskDetailsForm'

const textsCap = translated({
    acceptInvoice: 'accept invoice',
    acceptInvoiceDesc: 'accept the invoice and pay the assignee?',
    acceptInvoiceTitle: 'task - accept invoice',
    acceptTask: 'accept task',
    action: 'action',
    approve: 'approve',
    approved: 'approved',
    approvedChangeNotAllowed: 'approved task cannot be changed',
    assignee: 'assignee',
    bounty: 'bounty',
    create: 'create',
    createdAt: 'created at',
    createInvoice: 'mark as done',
    createInvoiceDesc: 'mark the task as done and create an invoice?',
    createInvoiceTitle: 'task - create invoice',
    description: 'description',
    dispute: 'dispute',
    disputeTask: 'dispute task',
    emptyMsgMarketPlace: 'search for marketplace tasks by title or description',
    loading: 'loading',
    marketplace: 'marketplace',
    no: 'no',
    pay: 'pay',
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
const rxInProgressIds = new BehaviorSubject(new Set())

function TaskList(props) {
    const listType = listTypes[props.type] || listTypes.owner
    const isOwnedList = listType === listTypes.owner
    // const isApproverList = listType === listTypes.approver
    const isFulfillerList = listType === listTypes.beneficiary
    const isMarketPlace = listType === listTypes.marketplace
    const keywordsKey = 'keywords' + listType
    const showCreate = isOwnedList || isMarketPlace
    const [inProgressIds] = useRxSubject(rxInProgressIds)
    const [ state ] = useReducer(reducer, {
        columns: [
            { collapsing: true, key: '_tsCreated', title: textsCap.createdAt },
            { key: 'title', title: textsCap.title },
            {
                collapsing: true,
                content: ({ amountXTX }) => <Currency value={amountXTX} emptyMessage={textsCap.loading} />,
                key: 'amountXTX',
                title: textsCap.bounty,
            },
            {
                hidden: isOwnedList,
                key: '_owner',
                title: textsCap.taskOwner,
            },
            {
                hidden: isFulfillerList,
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
                    const { fulfiller, isMarket, orderStatus, owner, _orderStatus } = task
                    if (isMarket) return _orderStatus
                    const { address } = getSelected()
                    const isOwner = address === owner
                    const isFulfiller = address === fulfiller
                    const inProgress = rxInProgressIds.value.has(taskId)

                    switch (orderStatus) {
                        // fulfiller hasn't accepted/rejected yet
                        case statuses.submitted:
                            // assignement response
                            if (isFulfiller) return (
                                <ButtonAcceptOrReject
                                    disabled={inProgress}
                                    loading={inProgress}
                                    onClick={accept => confirm({
                                        header: textsCap.acceptTask,
                                        onConfirm: () => handleTaskAssignment(taskId, address, accept),
                                        size: 'mini',
                                    })}
                                />
                            )
                            break
                        // fulfiller accepted but hasn't finished/invoiced the task
                        case statuses.accepted:
                            // invoice
                            if (isFulfiller) return (
                                <Button
                                    content={textsCap.createInvoice}
                                    disabled={inProgress}
                                    loading={inProgress}
                                    onClick={() => confirm({
                                        confirmButton: textsCap.createInvoice,
                                        content: textsCap.createInvoiceDesc,
                                        header: textsCap.createInvoice,
                                        onConfirm: () => handleUpdateStatus(
                                            address,
                                            taskId,
                                            statuses.invoiced,
                                            textsCap.createInvoiceTitle,
                                        ),
                                        size: 'mini',
                                    })}
                                    positive
                                    title={textsCap.createInvoiceDesc}
                                />
                            )
                            break
                        case statuses.invoiced:
                            // invoice response
                            if (isOwner) return (
                                <ButtonAcceptOrReject
                                    acceptText={textsCap.pay}
                                    disabled={inProgress}
                                    loading={inProgress}
                                    onClick={accept => confirm({
                                        confirmButton: (
                                            <Button {...{
                                                content: accept ? textsCap.pay : textsCap.dispute,
                                                negative: !accept,
                                                positive: accept,
                                            }} />
                                        ),
                                        content: accept ? textsCap.acceptInvoiceDesc : undefined,
                                        header: accept ? textsCap.acceptInvoice : textsCap.dispute,
                                        onConfirm: () => handleUpdateStatus(
                                            address,
                                            taskId,
                                            accept ? statuses.completed : statuses.disputed,
                                            accept ? textsCap.acceptInvoiceTitle : textsCap.disputeTask,
                                        ),
                                        size: 'mini',
                                    })}
                                    rejectText={textsCap.dispute}
                                    title={textsCap.acceptInvoiceDesc}
                                />
                            )
                            break
                    }
                    return _orderStatus
                },
                collapsing: true,
                key: '_orderStatus',
                textAlign: 'center',
                title: textsCap.status,
            },
            // {
            //     content: (task, taskId) => {
            //         const { approvalStatus, approver, _approvalStatus } = task
            //         const isPendingAproval = approvalStatus === approvalStatuses.pendingApproval
            //         const isApprover = selectedAddress === approver
            //         const approveInProgress = rxInProgressIds.value.has(taskId)
            //
            //         return !isApprover || !isPendingAproval ? _approvalStatus : (
            //             <ButtonAcceptOrReject
            //                 acceptText={textsCap.approve}
            //                 disabled={approveInProgress}
            //                 loading={approveInProgress}
            //                 onClick={approve => handleApprove(taskId, approve)}
            //             />
            //         )
            //     },
            //     collapsing: true,
            //     key: '_approvalStatus',
            //     title: textsCap.approved,
            // },
            {
                collapsing: true,
                content: (task, taskId) => [
                    isOwnedList && task.allowEdit && {
                        icon: 'pencil',
                        onClick: () => showForm(TaskForm, { taskId, values: task }),
                        title: textsCap.update,
                    },
                    {
                        icon: 'eye',
                        onClick: () => showForm(TaskDetailsForm, { id: taskId, values: task }),
                        title: textsCap.techDetails
                    }
                ].filter(Boolean)
                    .map((props, i) => <Button {...props} key={`${i}-${props.title}`} />),
                textAlign: 'center',
                title: textsCap.action
            },
        ],
        defaultSort: '_tsCreated',
        defaultSortAsc: false,
        emptyMessage: isMarketPlace ? textsCap.emptyMsgMarketPlace : undefined,
        // preserve search keywords
        keywords: tempCache.get(keywordsKey),
        // perPage: 100,
        searchable: !isMarketPlace ? true : (
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
        searchHideOnEmpty: !isMarketPlace,
        searchOnChange: keywords => tempCache.set(keywordsKey, keywords),
        topLeftMenu: [
            showCreate && {
                content: textsCap.create,
                icon: 'plus',
                onClick: () => showForm(TaskForm, {
                    values: !isMarketPlace ? undefined : { isMarket: false },
                    size: 'tiny',
                }),
            }
        ].filter(Boolean)
    })

    return <DataTable {...{
        ...props,
        ...state,
        // disable all actions if there is an unfinished queue item for this task ID
        rowProps: (task, taskId) => inProgressIds.has(taskId) && { disabled: true },
    }} />
}
TaskList.propTypes = {
    // @listType valid options: owner, approver, fulfiller etc
    listType: PropTypes.string,
}
TaskList.defaultProps = {
    listType: listTypes.owner,
}
export default React.memo(TaskList)

setTimeout(() => {
    // subscribe to queue item changes and store taskIds
    rxOnSave.subscribe(value => {
        if (!isObj(value)) return
        const { task = {} } = value
        const { func, recordId: taskId, status } = task
        // only handle queue tasks that are relevant for tasks
        if (!Object.values(queueableApis).includes(func) || !taskId) return
        const isDone = [queueStatuses.ERROR, queueStatuses.SUCCESS].includes(status)
        const inProgressIds = rxInProgressIds.value
        if (!isDone && inProgressIds.has(taskId)) return
        if (isDone && !inProgressIds.has(taskId)) return
        // add/remove from list
        inProgressIds[isDone? 'delete' : 'add'](taskId)
        rxInProgressIds.next(new Set(inProgressIds))
    })  
})