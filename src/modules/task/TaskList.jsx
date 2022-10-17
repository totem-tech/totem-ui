import React from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import { Button, Label } from 'semantic-ui-react'
import { isObj } from '../../utils/utils'
// components
import { ButtonAcceptOrReject } from '../../components/buttons'
import DataTable from '../../components/DataTable'
// import { FormInput } from '../../components/FormInput'
// forms
import TaskForm from './TaskForm'
// services
import { translated } from '../../services/language'
import { showForm, confirm } from '../../services/modal'
import { rxOnSave, statuses as queueStatuses } from '../../services/queue'
import { useRxSubject } from '../../services/react'
// modules
import Currency from '../currency/Currency'
import { getSelected } from '../identity/identity'
import { queueableApis, statuses } from './task'
import { handleAssignmentResponse, handleInvoicedResponse, handleUpdateStatus } from './notificationHandlers'
import TaskDetailsForm from './TaskDetailsForm'
import { getAddressName } from '../partner/partner'
import PartnerForm from '../partner/PartnerForm'

const textsCap = translated({
    acceptInvoice: 'accept invoice',
    acceptInvoiceDesc: 'accept the invoice and pay the assignee?',
    acceptInvoiceTitle: 'task - accept invoice',
    action: 'action',
    addPartner: 'add partner',
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

export default function TaskList(props) {
    const [inProgressIds] = useRxSubject(rxInProgressIds)
    const listType = listTypes[props.type] || listTypes.owner
    const isOwnedList = listType === listTypes.owner
    // const isApproverList = listType === listTypes.approver
    const isFulfillerList = listType === listTypes.beneficiary
    const isMarketPlace = listType === listTypes.marketplace
    const keywordsKey = 'keywords' + listType
    const showCreate = isOwnedList || isMarketPlace

    return <DataTable {...{
        ...props,
        ...tableProps,
        columnsHidden: [
            isOwnedList && '_owner',
            isFulfillerList && '_fulfiller',
        ].filter(Boolean),
        emptyMessage: isMarketPlace ? textsCap.emptyMsgMarketPlace : undefined,
        inProgressIds,
        isOwnedList,
        // preserve search keywords
        keywords: tempCache.get(keywordsKey),
        listType,
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

        // searchHideOnEmpty: !isMarketPlace,
        // searchable: !isMarketPlace ? true : (
        //     <FormInput {...{
        //         // for advanced filtering
        //         // filter by: 
        //         //      tags(categories?),
        //         //      amountXTX (convert from display currency if necessary)
        //         //      deadline (convert timestamp to block number before search)
        //         //      created after (tsCreated)
        //         // search by: title, description, userId (filter by partner userId or own (default on first load??))
        //         action: {
        //             icon: 'filter',
        //             onClick: toBeImplemented
        //         },
        //         icon: 'search',
        //         iconPosition: 'left',
        //         name: 'search',
        //         placeholder: 'search',
        //         type: 'search'
        //     }} />
        // ),
    }} />
}
TaskList.propTypes = {
    // @listType valid options: owner, approver, fulfiller etc
    listType: PropTypes.string,
}
TaskList.defaultProps = {
    listType: listTypes.owner,
}

const getActions = (task, taskId, { inProgressIds, isOwnedList }) => [
    isOwnedList && task.allowEdit && {
        disabled: inProgressIds.has(taskId),
        icon: 'pencil',
        onClick: () => showForm(TaskForm, { taskId, values: task }),
        title: textsCap.update,
    },
    {
        icon: 'eye',
        onClick: () => showForm(TaskDetailsForm, { id: taskId, values: task }),
        title: textsCap.techDetails
    }
]
    .filter(Boolean)
    .map((props, i) => <Button {...props} key={`${i}-${props.title}`} />)

// status cell view (with status related action buttons where appropriate)
const getStatusView = (task, taskId) => {
    const { fulfiller, isMarket, orderStatus, owner, _orderStatus } = task
    if (isMarket) return _orderStatus
    const { address } = getSelected()
    const isOwner = address === owner
    const isFulfiller = address === fulfiller
    const inProgress = rxInProgressIds.value.has(taskId)

    switch (orderStatus) {
        // fulfiller hasn't accepted/rejected yet
        case statuses.submitted:
            // fulfiller responds to assignement (also handles relevant notifications)
            if (isFulfiller) return (
                <ButtonAcceptOrReject
                    disabled={inProgress}
                    loading={inProgress}
                    onAction={(_, accepted) => handleAssignmentResponse(taskId, address, accepted)}
                />
            )
            break
        // fulfiller accepted but hasn't finished/invoiced the task
        case statuses.accepted:
            // fulfiller marks as done
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
        // fulfiller created invoice for a task
        case statuses.invoiced:
            // owner responds to invoice (also handles relevant notifications)
            if (isOwner) return (
                <ButtonAcceptOrReject
                    acceptText={textsCap.pay}
                    disabled={inProgress}
                    loading={inProgress}
                    onAction={(_, accepted) => handleInvoicedResponse(taskId, address, accepted)}
                    rejectText={textsCap.dispute}
                    title={textsCap.acceptInvoiceDesc}
                />
            )
            break
    }
    return _orderStatus
}

const tableProps = Object.freeze({
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
            key: '_owner',
            name: '_owner',
            textAlign: 'center',
            title: textsCap.taskOwner,
        },
        {
            key: '_fulfiller',
            title: textsCap.assignee,
        },
        {
            content: ({ tags }) => [...tags || []].map(tag => (
                <Label
                    key={tag}
                    draggable='true'
                    onDragStart={e => {
                        e.stopPropagation()
                        e.dataTransfer.setData('Text', e.target.textContent)
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
            key: '_orderStatus',
            textAlign: 'center',
            title: textsCap.status,
            content: getStatusView,
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
        //                 onAction={(_, approve) => handleApprove(taskId, approve)}
        //             />
        //         )
        //     },
        //     collapsing: true,
        //     key: '_approvalStatus',
        //     title: textsCap.approved,
        // },
        {
            collapsing: true,
            content: getActions,
            textAlign: 'center',
            title: textsCap.action,
        },
    ],
    defaultSort: '_tsCreated',
    defaultSortAsc: false,
    // disable all actions if there is an unfinished queue item for this task ID
    rowProps: (task, taskId, tasks, { inProgressIds }) => inProgressIds.has(taskId) && { disabled: true },
    // perPage: 100,
    searchable: true,
    searchExtraKeys: ['_taskId'],
    searchOnChange: (keywords, { listType }) => tempCache.set('keywords-' + listType, keywords),
})

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