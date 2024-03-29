import PropTypes from 'prop-types'
import React, { useEffect, useState } from 'react'
import { BehaviorSubject } from 'rxjs'
import { Icon } from 'semantic-ui-react'
// components
import {
    Button,
    ButtonAcceptOrReject,
    UserID,
} from '../../components/buttons'
import DataTable from '../../components/DataTable'
import FormInput from '../../components/FormInput'
import Tags from '../../components/Tags'
// services
import {
    showForm,
    confirmAsPromise,
    showInfo,
    newId,
} from '../../services/modal'
import { rxOnSave, statuses as queueStatuses } from '../../services/queue'
// utils
import { getUser, rxIsRegistered } from '../../utils/chatClient'
import { translated } from '../../utils/languageHelper'
import { useRxSubject } from '../../utils/reactjs'
import { format } from '../../utils/time'
import {
    isFn,
    isObj,
    textEllipsis,
} from '../../utils/utils'
import { MOBILE, rxLayout } from '../../utils/window'
// modules
import Currency from '../currency/Currency'
import {
    get as getIdentity,
    getSelected,
    rxSelected
} from '../identity/identity'
import AddressName from '../partner/AddressName'
import ApplicationForm from './marketplace/ApplicationForm'
import ApplicationList from './marketplace/ApplicationList'
import ApplicationView from './marketplace/ApplicationView'
import useSearch from './marketplace/useSearch'
import {
    handleAssignmentResponse,
    handleInvoicedResponse,
    handleUpdateStatus,
} from './notificationHandlers'
import {
    applicationStatus,
    approvalStatuses,
    MODULE_KEY,
    queueableApis,
    rxInProgressIds,
    statuses,
} from './task'
import TaskDetails from './TaskDetails'
import TaskForm, { inputNames } from './TaskForm'

const textsCap = {
    acceptInvoice: 'accept invoice',
    acceptInvoiceDesc: 'accept the invoice and pay the assignee?',
    acceptInvoiceTitle: 'task - accept invoice',
    addPartner: 'add partner',
    application: 'application',
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
    emptyMsgMarketPlace: 'search for marketplace tasks by title or tag (eg: "tag:remote")',
    loading: 'loading',
    marketplace: 'marketplace',
    marketSearch: 'search marketplace',
    no: 'no',
    pay: 'pay',
    publisher: 'publisher',
    rejected: 'rejected',
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
translated(textsCap, true)

export const listTypes = Object.freeze({
    approver: 'approver',
    beneficiary: 'beneficiary',
    marketplace: 'marketplace',
    owner: 'owner',
})
// preserves search keywords for each list type until page reloads
const tempCache = new Map()
const adIcon = (
    <Icon {...{
        className: 'no-margin',
        name: 'audio description',
        style: { paddingRight: 3 },
    }} />
)

export default function TaskList(props) {
    let {
        emptyMessage,
        rxTasks,
        type,
    } = props
    const listType = listTypes[type] || listTypes.owner
    const isOwnedList = listType === listTypes.owner
    const isApproverList = listType === listTypes.approver
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
    const [userId] = useRxSubject(rxIsRegistered, ok => ok && getUser().id)
    const [tableProps, setTableProps] = useState({})
    const { keywords = '' } = filter || {}
    emptyMessage = message || emptyMessage || (
        isMarketplace
            ? textsCap.emptyMsgMarketPlace
            : undefined
    )

    useEffect(() => {
        setTableProps(
            getTableProps({
                isApproverList,
                isMobile,
                isFulfillerList,
                isMarketplace,
                isOwnedList,
            })
        )
    }, [isMobile, listType])

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

    const searchable = !isMarketplace
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
                style: {
                    minWidth: isMobile
                        ? '100%'
                        : undefined
                },
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
        )

    return (
        <DataTable {...{
            ...props,
            ...tableProps,
            data,
            emptyMessage,
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
                        inputsHidden: isMarketplace && [inputNames.isMarket] || [],
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

            // marketplace
            searchable,
            searchHideOnEmpty: !isMarketplace,

            // extra information used by columns/cells
            forceReload,
            isApproverList,
            isFulfillerList,
            isMarketplace,
            isMobile,
            isOwnedList,
            inProgressIds,
            rxTasks, // keep??
            userId,

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
export const getAssigneeView = (task = {}, taskId, _, props) => {
    const { forceReload, userId } = props
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
    const isAssigned = owner !== fulfiller
    const application = !isOwner
        && userId
        && applications.find(x => x.userId === userId)
    const applied = userId && !!application
    applied && console.log({ application, task, userId, fulfiller, owner })
    const rejected = !!applied
        && application.status === 2
    if (isAssigned || !isMarket) return <AddressName {...{ address: fulfiller }} />

    return (
        <Button {...{
            color: applied
                ? rejected
                    ? 'red'
                    : 'green'
                : !isOwner && !isClosed && !!userId
                    ? 'blue'
                    : undefined,
            content: isOwner || !userId
                ? `${textsCap.applications}: ${applications.length}`
                : rejected
                    ? textsCap.rejected
                    : applied
                        ? textsCap.applied
                        : isClosed
                            ? textsCap.closed
                            : textsCap.apply,
            disabled: !userId
                || (!isOwner && isClosed)
                || (isOwner && !applications.length),
            // || !!applied
            fluid: true,
            icon: isOwner || !userId
                ? 'list'
                : applied
                    ? 'eye'
                    : isClosed
                        ? 'dont'//'warning circle'
                        : 'play',
            key: taskId,
            onClick: () => {
                const modalId = newId(
                    !isOwner
                        ? 'application_'
                        : 'applications_',
                    taskId,
                )
                // open application form
                if (!isOwner) {
                    if (applied) return ApplicationView.asModal({
                        application,
                        modalId,
                        taskId,
                        task,
                    })
                    return showForm(ApplicationForm, {
                        onSubmit: success => success
                            && isFn(forceReload)
                            && forceReload(),
                        proposalRequired,
                        title,
                        values: { taskId },
                    })
                }
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
        isOwner,
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
const getTableProps = (options) => {
    const {
        isMobile,
        isFulfillerList,
        isMarketplace,
        isOwnedList,
        isApproverList,
    } = options
    const actionsCol = {
        collapsing: true,
        content: (_, taskId) => (
            <Button {...{
                content: isMobile
                    ? textsCap.viewDetails
                    : undefined,
                fluid: isMobile,
                icon: 'eye',
                onClick: () => TaskDetails.asModal({ taskId }),
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
            content: ({ description, isMarket, title }, _1, _2, { isMobile }) => (
                <span style={{ fontSize: isMobile ? '110%' : undefined }}>
                    {isOwnedList && isMarket && adIcon}
                    {title}
                    <div style={{ color: 'grey' }}>
                        {!isMobile && textEllipsis(
                            description,
                            isMarket ? 100 : 50,
                            3,
                            false
                        )}
                    </div>
                </span>
            ),
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
            title: isMarketplace
                ? textsCap.publisher
                : textsCap.taskOwner,
        },
        !isFulfillerList && {
            content: getAssigneeView,
            draggable: !isMarketplace,
            draggableValueKey: 'fulfiller',
            dynamicProps: ({ fulfiller, isMarket, owner }) => ({
                includeTitleOnMobile: owner !== fulfiller
                    || !isMarket,
            }),
            key: 'fulfiller',
            // removes unnecessary extra padding when button is used
            style: { padding: '.28571429em .78571429em' },
            title: isMarketplace
                ? textsCap.application
                : textsCap.assignee,
        },
        {
            content: ({ tags = [] }) => (
                <Tags {...{
                    onDragStart: !isMarketplace
                        ? undefined
                        : (e, tag) => {
                            // add prefix: "tag:" to search by tag
                            e.dataTransfer.setData(
                                'Text',
                                `tag:${tag}`,
                            )
                        },
                    tags,
                }} />
            ),
            draggable: false,
            key: 'tags',
            title: textsCap.tags,
            style: { maxWidth: 150 },
        },
        !isApproverList && !isMarketplace && {
            content: getStatusView,
            collapsing: true,
            draggableValueKey: '_orderStatus',
            key: '_orderStatus',
            textAlign: 'center',
            title: textsCap.status,
        },
        isApproverList && {
            content: (task, taskId) => {
                const {
                    approvalStatus,
                    approver,
                    _approvalStatus,
                } = task
                const isPendingAproval = approvalStatus === approvalStatuses.pendingApproval
                const isApprover = rxSelected.value === approver
                const approveInProgress = rxInProgressIds
                    .value
                    .has(taskId)
                if (!isApprover || !isPendingAproval) return _approvalStatus

                return (
                    <ButtonAcceptOrReject
                        acceptText={textsCap.approve}
                        disabled={approveInProgress}
                        loading={approveInProgress}
                        onAction={(_, approve) => handleApprove(taskId, approve)}
                    />
                )
            },
            collapsing: true,
            key: '_approvalStatus',
            title: textsCap.approved,
        },
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