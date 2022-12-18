import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import { Icon } from 'semantic-ui-react'
import { getUser } from '../../utils/chatClient'
import { format } from '../../utils/time'
import { isFn, isObj, textEllipsis } from '../../utils/utils'
// components
import { Button, ButtonAcceptOrReject, UserID } from '../../components/buttons'
import DataTable from '../../components/DataTable'
import FormInput from '../../components/FormInput'
import Message from '../../components/Message'
import Tags from '../../components/Tags'
import Text from '../../components/Text'
// services
import { translated } from '../../services/language'
import { showForm, confirmAsPromise, showInfo } from '../../services/modal'
import { rxOnSave, statuses as queueStatuses } from '../../services/queue'
import { useRxSubject } from '../../services/react'
import { MOBILE, rxLayout } from '../../services/window'
// modules
import Currency from '../currency/Currency'
import { get, get as getIdentity, getSelected } from '../identity/identity'
import AddressName from '../partner/AddressName'
import useSearch from './marketplace/useSearch'
import ApplicationForm from './marketplace/ApplicationForm'
import {
    handleAssignmentResponse,
    handleInvoicedResponse,
    handleUpdateStatus,
} from './notificationHandlers'
import {
    MODULE_KEY,
    queueableApis,
    rxInProgressIds,
    statuses,
} from './task'
import TaskDetails from './TaskDetails'
import TaskForm, { inputNames } from './TaskForm'
import ApplicationList from './marketplace/ApplicationList'

let textsCap = {
    acceptInvoice: 'accept invoice',
    acceptInvoiceDesc: 'accept the invoice and pay the assignee?',
    acceptInvoiceTitle: 'task - accept invoice',
    addPartner: 'add partner',
    applications: 'applications',
    applied: 'applied',
    apply: 'apply',
    approve: 'approve',
    approved: 'approved',
    approvedChangeNotAllowed: 'approved task cannot be changed',
    assignee: 'assignee',
    bounty: 'bounty',
    closed: 'closed',
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
    marketSearch: 'search marketplace',
    no: 'no',
    pay: 'pay',
    rejectTask: 'reject task',
    status: 'status',
    tags: 'tags',
    task: 'task',
    taskOwner: 'task owner',
    title: 'title',
    yes: 'yes',
    view: 'view',
    viewDetails: 'view details',
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
    const { rxTasks, type } = props
    const listType = listTypes[type] || listTypes.owner
    const isOwnedList = listType === listTypes.owner
    // const isApproverList = listType === listTypes.approver
    const isFulfillerList = listType === listTypes.beneficiary
    const isMarketplace = listType === listTypes.marketplace
    const keywordsKey = 'keywords' + listType
    const showCreate = isOwnedList || isMarketplace
    const [filter, setFilter] = useState({})
    const [message, data] = isMarketplace
        ? useSearch(filter)
        : [null, useRxSubject(rxTasks)[0]]
    const [inProgressIds] = useRxSubject(rxInProgressIds)
    const [isMobile] = useRxSubject(rxLayout, l => l === MOBILE)
    const [tableProps, setTableProps] = useState(getTableProps(
        isMobile,
        isFulfillerList,
        isMarketplace,
        isOwnedList,
    ))
    const { keywords = '' } = filter || {}
    const emptyMessage = isMarketplace
        ? textsCap.emptyMsgMarketPlace
        : undefined
    
    useEffect(() => {
        setTableProps(
            getTableProps(
                isMobile,
                isFulfillerList,
                isMarketplace,
                isOwnedList,
            )
        )
    }, [isMobile, isFulfillerList, isMarketplace])
    
    if (message) return <Message {...message} />

    const forceReload = () => {
        const { keywords } = filter
        setFilter({
            ...filter,
            keywords: useSearch.REFRESH_PLACEHOLDER,
        })
        setTimeout(() => setFilter({
            ...filter,
            keywords,
        }))
    }
    return (
        <DataTable {...{
            ...props,
            ...tableProps,
            data,
            emptyMessage,
            forceReload,
            isFulfillerList,
            isMarketplace,
            isMobile,
            isOwnedList,
            inProgressIds,
            key: data,
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
                        onSubmit: (ok, values) => ok
                            && !!values[inputNames.isMarket]
                            && forceReload(),
                        size: 'tiny',
                        values: {
                            [inputNames.isMarket]: isMarketplace,
                        },
                    }),
                },
            ].filter(Boolean),
            rxTasks, // keep??

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
                        action: !keywords
                            ? undefined
                            : {
                                basic: true,
                                icon: {
                                    className: 'no-margin',
                                    name: 'close',
                                },
                                onClick: () => setFilter({
                                    ...filter,
                                    keywords: '',
                                }),
                            },
                        style: isMobile ? { minWidth: '100%' } : {},
                        icon: 'search',
                        iconPosition: 'left',
                        name: 'search',
                        onChange: async (_, { value = '' }) => setFilter({
                            ...filter,
                            keywords: value,
                        }),
                        onDragOver: e => e.preventDefault(),
                        onDrop: async e => {
                            const keywords = e.dataTransfer.getData('Text')
                            if (!keywords.trim()) return
                            setFilter({ keywords })
                        },
                        placeholder: textsCap.marketSearch,
                        // this ensures the search occur on load
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
// Assignee/Fullfiler
export const getAssigneeView = (task = {}, taskId, _, { forceReload, isMobile }) => {
    const {
        applications = [],
        fulfiller,
        isClosed,
        isMarket,
        isOwner,
        owner,
        proposalRequired,
        title,
    } = task
    const isAssigned = owner !== fulfiller && get(fulfiller)
    let applied = !isOwner
        && applications.map(x => x.userId)
        .includes((getUser() || {}).id)
    
    if (!isMarket || isAssigned) return (
        <div>
            {isMobile && <b>{textsCap.assignee}: </b>}
            <AddressName {...{ address: fulfiller }} />
        </div>
    )
    return (
        <Button {...{
            color: applied
                ? 'green'
                : !isOwner && !isClosed
                    ? 'blue'
                    : undefined,
            content: isOwner
                ? `${textsCap.applications}: ${applications.length}`
                : applied
                    ? textsCap.applied
                    : isClosed
                        ? textsCap.closed
                        : textsCap.apply,
            disabled: !!applied
                || (!isOwner && isClosed)
                || (isOwner && !applications.length),
            fluid: true,
            icon: isOwner
                ? 'list'
                : applied
                    ? 'check'
                    : isClosed
                        ? 'dont'//'warning circle'
                        : 'play',
            key: taskId,
            onClick: () => {
                // open application form
                if (!isOwner) return showForm(ApplicationForm, {
                    onSubmit: success => {
                        success && isFn(forceReload) && forceReload()
                    },
                    proposalRequired,
                    title,
                    values: { taskId },
                })

                const modalId = `${taskId}-applications`
                // show list of applications
                showInfo({
                    collapsing: true,
                    content: (
                        <ApplicationList {...{
                            forceReload,
                            modalId,
                            taskId,
                        }} />
                    ),
                    header: textsCap.applications,
                    // size: 'tiny',
                    subheader: `${textsCap.title}: ${title}`,
                }, modalId)
            },
            style: { whiteSpace: 'nowrap' }
        }} />
    )
}
// status cell view (with status related action buttons where appropriate)
export const getStatusView = (task, taskId, _, { inProgressIds }) => {
    const {
        fulfiller,
        isMarket,
        orderStatus,
        owner,
        _orderStatus,
    } = task
    const btnStatus = (
        <Button basic fluid>
            {_orderStatus}
        </Button>
    )
    if (isMarket) return btnStatus

    const isOpen = isMarket && owner === fulfiller
    const { address } = !isOpen && getIdentity(fulfiller) || getSelected()
    const isOwner = address === owner
    const isFulfiller = address === fulfiller
    const inProgress = inProgressIds && inProgressIds.has(taskId)

    switch (orderStatus) {
        // fulfiller hasn't accepted/rejected yet
        case statuses.created:
            // fulfiller responds to assignement (also handles relevant notifications)
            if (isFulfiller) return (
                <ButtonAcceptOrReject
                    disabled={inProgress}
                    fluid
                    loading={inProgress}
                    onAction={async (e, accepted) => {
                        e.preventDefault()
                        await handleAssignmentResponse(
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
                    fluid
                    loading={inProgress}
                    onClick={async (e) => {
                        e.preventDefault()
                        const confirmed = await confirmAsPromise({
                            confirmButton: textsCap.createInvoice,
                            content: textsCap.createInvoiceDesc,
                            header: textsCap.createInvoice,
                            size: 'mini',
                        })
                        confirmed && await handleUpdateStatus(
                            address,
                            taskId,
                            statuses.invoiced,
                            textsCap.createInvoiceTitle,
                        )
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
                    fluid
                    loading={inProgress}
                    onAction={async (e, accepted) => {
                        e.preventDefault()
                        await handleInvoicedResponse(
                            taskId,
                            address,
                            accepted,
                        )
                    }}
                    rejectText={textsCap.dispute}
                    title={textsCap.acceptInvoiceDesc}
                />
            )
            break
    }
    return btnStatus
}

const getTableProps = (isMobile, isFulfillerList, isMarketplace, isOwnedList) => {
    const actionsCol = {
        collapsing: true,
        content: (_, taskId) => (
            <Button {...{
                content: isMobile
                    ? textsCap.viewDetails
                    : undefined,
                fluid: isMobile,
                icon: 'eye',
                onClick: () => TaskDetails
                    .asModal({ taskId })
                    .catch(console.warn),
                title: textsCap.view,
            }} />
        ),
        draggable: false,
        textAlign: 'center',
        title: textsCap.view,
    }

    const columns = [
        !isMarketplace && {
            content: ({ tsCreated }) => format(tsCreated),
            collapsing: true,
            key: 'tsCreated',
            title: textsCap.createdAt,
        },
        {
            draggableValueKey: 'title',
            key: 'title',
            style: {
                fontSize: !isMobile
                    ? undefined
                    : '110%',
                minWidth: 125,
            },
            title: textsCap.title,
        },
        isMobile && {
            content: x => textEllipsis(
                x.description,
                200,
                3,
                false,
            ),
            key: 'description',
            title: textsCap.description,
        },
        {
            collapsing: true,
            content: task => (
                <Currency {...{
                    emptyMessage: textsCap.loading,
                    value: task.amountXTX,
                }} />
            ),
            draggable: !isMarketplace,
            draggableValueKey: 'amountXTX',
            includeTitleOnMobile: true,
            key: 'amountXTX',
            title: textsCap.bounty,
        },
        (isFulfillerList || isMarketplace) && {
            content: ({ createdBy, owner, isOwner }) => {
                if (isMarketplace && !isOwner) return (
                    <UserID {...{
                        address: owner,
                        userId: createdBy
                    }} />
                )

                return (
                    <AddressName {...{
                        address: owner,
                        maxLength: isMobile ? 25 : 32,
                        userId: createdBy,
                    }} />
                )
            },
            onDragStart: (e, dragValue) => {
                // if marketplace use "@userId" to search by createdBy property.
                // Otherwise, use owner identity for local search
                e.dataTransfer.setData(
                    'Text',
                    `${!isMarketplace ? '' : '@'}${dragValue}`
                )
            },
            draggableValueKey: isMarketplace
                ? 'createdBy'
                : 'owner',
            includeTitleOnMobile: true,
            key: 'owner',
            title: textsCap.taskOwner,
        },
        !isFulfillerList && {
            content: getAssigneeView,
            draggable: !isMarketplace,
            draggableValueKey: 'fulfiller',
            key: 'fulfiller',
            title: textsCap.assignee,
        },
        {
            content: ({ tags = [] }) => (
                <Tags {...{
                    onDragStart: isMarketplace && (e => {
                        // add prefix: "tag:" to search by tag
                        e.dataTransfer.setData(
                            'Text',
                            `tag:${e.target.textContent}`,
                        )
                    }),
                    tags,
                }} />
            ),
            key: 'tags',
            title: textsCap.tags,
            style: { maxWidth: 150 },
        },
        !isMarketplace && {
            content: getStatusView,
            collapsing: true,
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
        actionsCol,
    ].filter(Boolean)

    return {
        columns,
        columnsHidden: !isMobile
            ? []
            : [
                'tsCreated',
                'tags',
                '_orderStatus',
            ].filter(Boolean),
        // no default sorting on marketplace
        defaultSort: 'tsCreated',
        defaultSortAsc: false,
        headers: !isMobile,
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
        sortBy: isMarketplace
            ? false
            : undefined,
        sortAsc: isMarketplace
            ? true
            : undefined,
        tableProps: {
            unstackable: false,
        }
    }
}

setTimeout(() => {
    // subscribe to queue item changes and store taskIds
    rxOnSave.subscribe(value => {
        if (!isObj(value)) return
        const { task = {} } = value
        const {
            func,
            module,
            recordId: taskId,
            status,
        } = task
        if (!taskId) return
        // only handle queue tasks that are relevant for tasks
        const isTaskModuleRelated = module === MODULE_KEY
            || Object
                .values(queueableApis)
                .includes(func)
        if (!isTaskModuleRelated) return

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