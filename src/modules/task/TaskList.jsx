import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import { Button, Icon } from 'semantic-ui-react'
import { deferred, isObj } from '../../utils/utils'
// components
import { ButtonAcceptOrReject } from '../../components/buttons'
import DataTable from '../../components/DataTable'
import Tags from '../../components/Tags'
import Text from '../../components/Text'
// forms
import TaskForm from './TaskForm'
// services
import { translated } from '../../services/language'
import { showForm, confirm } from '../../services/modal'
import { rxOnSave, statuses as queueStatuses } from '../../services/queue'
import { useRxSubject } from '../../services/react'
import { MOBILE, rxLayout } from '../../services/window'
// modules
import Currency from '../currency/Currency'
import { get as getIdentity, getSelected } from '../identity/identity'
import { query, queueableApis, rxInProgressIds, statuses } from './task'
import {
    handleAssignmentResponse,
    handleInvoicedResponse,
    handleUpdateStatus,
} from './notificationHandlers'
import TaskDetails from './TaskDetails'
import FormInput from '../../components/FormInput'
import PromisE from '../../utils/PromisE'
import { subjectAsPromise } from '../../utils/reactHelper'
import { rxIsLoggedIn } from '../../utils/chatClient'
import AddressName from '../partner/AddressName'
import { format } from '../../utils/time'

let textsCap = {
    acceptInvoice: 'accept invoice',
    acceptInvoiceDesc: 'accept the invoice and pay the assignee?',
    acceptInvoiceTitle: 'task - accept invoice',
    action: 'action',
    addPartner: 'add partner',
    applications: 'applications',
    apply: 'apply',
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
    yes: 'yes',
}
textsCap = translated(textsCap, true)[1]

export const listTypes = Object.freeze({
    approver: 'approver',
    beneficiary: 'beneficiary',
    marketplace: 'marketplace',
    owner: 'owner',
})
// preserves search keywords for each list type until page reloads
const tempCache = new Map()
// const toBeImplemented = () => alert('to be implemented')
export default function TaskList(props) {
    const {
        rxTasks: _rxTasks,
        type,
    } = props
    const [rxTasks] = _rxTasks
        ? [_rxTasks]
        : useState(() => new BehaviorSubject())
    const [data] = useRxSubject(rxTasks)
    const [inProgressIds] = useRxSubject(rxInProgressIds)
    const [isMobile] = useRxSubject(rxLayout, l => l === MOBILE)
    const listType = listTypes[type] || listTypes.owner
    const isOwnedList = listType === listTypes.owner
    // const isApproverList = listType === listTypes.approver
    const isFulfillerList = listType === listTypes.beneficiary
    const isMarketplace = listType === listTypes.marketplace
    const keywordsKey = 'keywords' + listType
    const showCreate = isOwnedList || isMarketplace
    const tableProps = getTableProps(
        isMobile,
        isFulfillerList,
        isMarketplace,
    )
    const [{ keywords = '' }, setSearch] = useState({})
    const emptyMessage = isMarketplace
        ? textsCap.emptyMsgMarketPlace
        : undefined
    
    return (
        <DataTable {...{
            ...props,
            ...tableProps,
            data,
            emptyMessage,
            isOwnedList,
            inProgressIds,
            keywords: isMarketplace
                ? undefined
                // preserve search keywords
                : tempCache.get(keywordsKey),
            listType,
            topLeftMenu: [
                showCreate && {
                    content: textsCap.create,
                    icon: 'plus',
                    onClick: () => showForm(TaskForm, {
                        values: !isMarketplace
                            ? undefined
                            : { isMarket: false },
                        size: 'tiny',
                    }),
                }
            ].filter(Boolean),
            rxTasks, // keep

            // marketplace
            searchHideOnEmpty: !isMarketplace,
            searchable: !isMarketplace
                ? true
                : (
                    <FormInput {...{
                        // for advanced filtering
                        // filter by: 
                        //      tags(categories?),
                        //      amountXTX (convert from display currency if necessary)
                        //      deadline (convert timestamp to block number before search)
                        //      created after (tsCreated)
                        // search by: title, description, userId (filter by partner userId or own (default on first load??))
                        // action: {
                        //     icon: 'filter',
                        //     onClick: alert
                        // },
                        icon: 'search',
                        iconPosition: 'left',
                        name: 'search',
                        onChange: async (_, { value: keywords = '' }) => {
                            setSearch({ keywords })
                            await subjectAsPromise(rxIsLoggedIn, true)
                            searchMarketPlace({ keywords }, rxTasks)
                        },
                        onDragOver: e => e.preventDefault(),
                        onDrop: async e => {
                            const keywords = e.dataTransfer.getData('Text')
                            if (!keywords.trim()) return
                            setSearch({keywords})
                            await subjectAsPromise(rxIsLoggedIn, true)
                            searchMarketPlace({ keywords }, rxTasks)
                        },
                        placeholder: 'search',
                        rxValue: new BehaviorSubject(keywords),
                        type: 'search',
                        value: keywords,
                    }} />
                ),
        }} />
    )
}
TaskList.propTypes = {
    // @listType valid options: owner, approver, fulfiller etc
    listType: PropTypes.string,
}
TaskList.defaultProps = {
    listType: listTypes.owner,
}

const getActions = (task, taskId, _, { isOwnedList, rxTasks }) => [
    {
        icon: 'eye',
        onClick: () => TaskDetails.asModal(
            {
                allowEdit: isOwnedList,
                getAssigneeView,
                getStatusView,
                rxInProgressIds,
                rxTasks,
                // task,
                taskId,
            },
            // {
            //     size: task.isMarket 
            //         ? 'tiny'
            //         : 'mini',
            // }
        ),
        title: textsCap.techDetails,
    }
]
    .filter(Boolean)
    .map((props, i) => (
        <Button {...{
            ...props,
            key: `${i}-${props.title}`,
        }} />
    ))
export const getAssigneeView = ({ applications = [], fulfiller, isMarket, isOwner, owner }) =>
    !isMarket || owner !== fulfiller
        ? <AddressName {...{ address: fulfiller }} />
        : (
            <Button {...{
                content: isOwner 
                    ? `${applications.length} ${textsCap.applications}`
                    : textsCap.apply,
                icon: isOwner
                    ? 'eye'
                    : 'play',
                fluid: true,
                positive: !isOwner,
                onClick: () => { },
                style: { whiteSpace: 'nowrap' }
            }} />
        )
// status cell view (with status related action buttons where appropriate)
export const getStatusView = (task, taskId, _, { inProgressIds }) => {
    const {
        fulfiller,
        isMarket,
        orderStatus,
        owner,
        _orderStatus,
     } = task
    if (isMarket) return `${_orderStatus}`

    const isOpen = isMarket && owner === fulfiller
    const { address } = !isOpen && getIdentity(fulfiller) || getSelected()
    const isOwner = address === owner
    const isFulfiller = address === fulfiller
    const inProgress = inProgressIds && inProgressIds.has(taskId)

    switch (orderStatus) {
        // fulfiller hasn't accepted/rejected yet
        case statuses.submitted:
            // fulfiller responds to assignement (also handles relevant notifications)
            if (isFulfiller) return (
                <ButtonAcceptOrReject
                    disabled={inProgress}
                    loading={inProgress}
                    onAction={(e, accepted) => {
                        e.preventDefault()
                        handleAssignmentResponse(
                            taskId,
                            address,
                            accepted,
                        )
                    }}
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
                    onClick={e => {
                        e.preventDefault()
                        confirm({
                            confirmButton: textsCap.createInvoice,
                            content: textsCap.createInvoiceDesc,
                            header: textsCap.createInvoice,
                            onConfirm: () => {
                                handleUpdateStatus(
                                    address,
                                    taskId,
                                    statuses.invoiced,
                                    textsCap.createInvoiceTitle,
                                )
                            },
                            size: 'mini',
                        })
                    }}
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
                    onAction={(e, accepted) => {
                        e.preventDefault()
                        handleInvoicedResponse(taskId, address, accepted)
                    }}
                    rejectText={textsCap.dispute}
                    title={textsCap.acceptInvoiceDesc}
                />
            )
            break
    }
    return `${_orderStatus}`
}

const getTableProps = (isMobile, isFulfillerList, isMarketplace) => ({
    columns: [
        !isMobile && !isMarketplace && {
            content: ({ tsCreated }) => format(tsCreated),
            collapsing: true,
            key: 'tsCreated',
            title: textsCap.createdAt,
        },
        {
            content: !isMobile
                ? undefined // display title only
                : task => ( // display title and bounty amount
                    <div>
                        {task.title}
                        <Text {...{
                            color: 'grey',
                            El: 'div',
                            invertedColor: 'lightgrey',
                        }}>
                            <small>
                                <Icon className='no-margin' name='money' />
                                <span style={{ paddingLeft: 7 }}>
                                    <Currency {...{
                                        emptyMessage: textsCap.loading,
                                        value: task.amountXTX,
                                    }} />
                                </span>
                            </small>
                        </Text>
                    </div>
                ),
            draggableValueKey: 'title',
            key: 'title',
            style: { minWidth: 125 },
            title: textsCap.title,
        },
        !isMobile && {
            collapsing: true,
            content: task => (
                <Currency {...{
                    emptyMessage: textsCap.loading,
                    value: task.amountXTX,
                }} />
            ),
            draggable: !isMarketplace,
            draggableValueKey: 'amountXTX',
            key: 'amountXTX',
            title: textsCap.bounty,
        },
        (isMarketplace || !isMobile) && {
            content: ({ createdBy, owner }) => (
                <AddressName {...{
                    address: owner,
                    userId: createdBy,
                }} />
            ),
            draggableValueKey: 'owner',
            key: 'owner',
            textAlign: 'center',
            title: textsCap.taskOwner,
        },
        !(isMobile && isFulfillerList) && {
            content: getAssigneeView,
            draggable: !isMarketplace,
            draggableValueKey: 'fulfiller',
            key: 'fulfiller',
            title: textsCap.assignee,
        },
        !isMobile && {
            content: ({ tags = [] }) => <Tags tags={tags} />,
            key: 'tags',
            title: textsCap.tags,
            style: { textAlign: 'center' },
        },
        {
            content: getStatusView,
            collapsing: true,
            draggable: !isMarketplace,
            draggableValueKey: '_orderStatus',
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
            draggable: false,
            textAlign: 'center',
            title: textsCap.action,
        },
    ].filter(Boolean),
    defaultSort: isMarketplace
        ? false // no sorting
        : '_tsCreated',
    defaultSortAsc: isMarketplace
        ? true
        : false,
    // disable all actions if there is an unfinished queue item for this task ID
    rowProps: (_task, taskId, _tasks, { inProgressIds }) =>
        inProgressIds.has(taskId)
        && { disabled: true }
        || {},
    searchable: !isMarketplace,
    searchExtraKeys: ['_taskId', 'marketplace'],
    searchOnChange: (keywords, { listType }) => tempCache.set(
        'keywords-' + listType,
        keywords,
    ),
})

const searchMarketPlaceDP = PromisE.deferred()
const searchMarketPlace = deferred((filter = {}, rxTasks) => {
    const promise = query.searchMarketplace(filter)
    searchMarketPlaceDP(promise)
        .then(result => rxTasks.next(result) || console.log({result}))
}, 300)

setTimeout(() => {
    // subscribe to queue item changes and store taskIds
    rxOnSave.subscribe(value => {
        if (!isObj(value)) return
        const { task = {} } = value
        const { func, recordId: taskId, status } = task
        // only handle queue tasks that are relevant for tasks
        const taskRelated = Object
            .values(queueableApis)
            .includes(func)
        if (!taskRelated || !taskId) return

        const isDone = [
            queueStatuses.ERROR,
            queueStatuses.SUCCESS,
        ].includes(status)
        const inProgressIds = rxInProgressIds.value
        if (!isDone && inProgressIds.has(taskId)) return
        if (isDone && !inProgressIds.has(taskId)) return

        // add/remove from list
        inProgressIds[isDone ? 'delete' : 'add'](taskId)
        rxInProgressIds.next(new Set(inProgressIds))
    })  
})