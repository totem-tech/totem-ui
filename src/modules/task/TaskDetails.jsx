import PropTypes from 'prop-types'
import React, { useEffect, useState } from 'react'
import { Button, UserID } from '../../components/buttons'
import DataTableVertical from '../../components/DataTableVertical'
import LabelCopy from '../../components/LabelCopy'
import { Linkify } from '../../components/StringReplace'
import { rxBlockNumber } from '../../services/blockchain'
import {
    closeModal,
    newId,
    showForm,
    showInfo,
} from '../../services/modal'
import { getUser, rxIsRegistered } from '../../utils/chatClient'
import { translated } from '../../utils/languageHelper'
import {
    iUseReducer,
    statuses,
    useRxSubject
} from '../../utils/reactjs'
import { blockToDate, format } from '../../utils/time'
import { generateHash, isObj } from '../../utils/utils'
import { MOBILE, rxLayout } from '../../utils/window'
import Currency from '../currency/Currency'
import AddressName from '../partner/AddressName'
import { approvalStatusNames, rxInProgressIds } from './task'
import TaskForm from './TaskForm'
import { getAssigneeView, getStatusView } from './TaskList'
import useTask from './useTask'

const textsCap = {
    amount: 'bounty amount',
    approvalStatus: 'approval status',
    approver: 'approver',
    created: 'created',
    deadline: 'deadline to accept task',
    description: 'description',
    dueDate: 'due date',
    fulfiller: 'assignee',
    header: 'task details',
    id: 'ID',
    loading: 'loading...',
    orderStatus: 'order status',
    owner: 'created by',
    title: 'title',
    updateTask: 'update task',
    updated: 'updated',
}
translated(textsCap, true)

export default function TaskDetails(props = {}) {
    const { modalId, taskId } = props
    const [blockNum] = useRxSubject(rxBlockNumber)
    const [inProgressIds = new Set()] = useRxSubject(rxInProgressIds)
    const [reload, setReload] = useState(0)
    const [tableProps, setTableProps] = iUseReducer(null, {
        emptyMessage: {
            content: textsCap.loading,
            icon: true,
            status: statuses.LOADING,
        },
        forceReload: () => setReload(generateHash()),
    })
    const { error, task } = useTask(taskId, reload)
    const [userId] = useRxSubject(rxIsRegistered, ok => ok && getUser().id)

    useEffect(() => {
        if (!task || !Object.keys(task).length) return () => { }

        const _task = { ...task, taskId }
        const {
            approver,
            createdBy,
            description = '',
            isMarket,
            owner,
        } = _task
        const ownerIsApprover = owner === approver
        const userIsOwner = userId === createdBy
        const showOwnerId = !isMarket || userIsOwner
        const isMobile = rxLayout.value === MOBILE
        const width = !isMobile && description.length > 300
            ? 150
            : undefined
        const style = {
            minWidth: 150,
        }
        const headerProps = { style }
        const columns = [
            {
                content: ({ taskId }) => (
                    <LabelCopy {...{
                        maxLength: 25,
                        value: taskId,
                    }} />
                ),
                key: 'id',
                title: textsCap.id,
            },
            {
                key: 'title',
                title: textsCap.title,
            },
            {
                content: x => (
                    <div style={{ whiteSpace: 'pre-wrap' }}>
                        <Linkify>{x.description}</Linkify>
                    </div>
                ),
                key: 'description',
                headerProps: {
                    style: {
                        verticalAlign: 'top',
                    },
                },
                title: textsCap.description,
            },
            {
                content: x => <Currency {...{ value: parseInt(x.amountXTX) }} />,
                key: 'amountXTX',
                title: textsCap.amount,
            },
            {
                content: (...args) => getStatusView(...args),
                key: 'orderStatus',
                title: textsCap.orderStatus,
            },
            {
                content: x => approvalStatusNames[x.approvalStatus],
                hidden: ownerIsApprover || isMarket,
                key: 'approvalStatus',
                title: textsCap.approvalStatus,
            },
            {
                content: getAssigneeView,
                key: 'fulfiller',
                title: textsCap.fulfiller,
            },
            {
                content: x => (
                    <span>
                        {showOwnerId && (
                            <AddressName {...{
                                address: x.owner,
                                userId: x.createdBy,
                            }} />
                        )}
                        {!userIsOwner && (
                            <UserID {...{
                                onChatOpen: () => closeModal(modalId),
                                prefix: showOwnerId ? ' (' : '',
                                suffix: showOwnerId ? ' )' : '',
                                userId: x.createdBy,
                            }} />
                        )}
                    </span>
                ),
                key: 'owner',
                title: textsCap.owner,
            },
            {
                content: x => <AddressName {...{ address: x.approver }} />,
                hidden: ownerIsApprover || isMarket,
                key: 'approver',
                title: textsCap.approver,
            },
            {
                content: x => blockToDate(
                    x.dueDate,
                    x.blockNum,
                    true,
                ),
                key: 'dueDate',
                title: textsCap.dueDate,
            },
            {
                content: x => blockToDate(
                    x.deadline,
                    x.blockNum,
                    true,
                ),
                key: 'deadline',
                title: textsCap.deadline,
            },
            {
                content: ({ tsCreated }) => format(tsCreated),
                key: 'tsCreated',
                title: textsCap.created,
            },
            {
                content: ({ tsUpdated }) => format(tsUpdated),
                key: 'tsUpdated',
                title: textsCap.updated,
            },
        ].map(x => ({ ...x, headerProps }))
        const tableProps = {
            columns,
            data: new Map([[taskId, { ..._task, blockNum }]]),
            emptyMessage: undefined,
        }
        setTableProps(tableProps)
    }, [setTableProps, getStatusView, blockNum, task, userId])

    tableProps.emptyMessage = !isObj(task) || !!error
        ? {
            content: `${error || ''}` || textsCap.loading,
            icon: true,
            status: !!error
                ? statuses.ERROR
                : statuses.LOADING
        }
        : undefined

    return (
        <div>
            <DataTableVertical {...{
                ...tableProps,
                inProgressIds,
                userId,

            }} />
            {!!task && task.allowEdit && (
                <div style={{
                    marginBottom: 14,
                    marginTop: -14,
                    padding: 1,
                    textAlign: 'center',
                }}>
                    <Button {...{
                        fluid: true,
                        content: textsCap.updateTask,
                        icon: 'pencil',
                        onClick: () => {
                            closeModal(props.modalId)
                            showForm(TaskForm, {
                                taskId,
                                values: task,
                            })
                        },
                    }} />
                </div>
            )}
        </div>
    )
}
TaskDetails.propTypes = {
    taskId: PropTypes.string,
}
/**
 * @name    TaskDetails.asModal
 * 
 * @param   {Object}            props       props for TaskDetails
 * @param   {String}            props.taskId
 * @param   {Object}            modalProps (optional)
 * 
 * @returns {Promise}
 */
TaskDetails.asModal = (props = {}, modalProps, modalId) => {
    modalId = newId('task_', props.taskId)
    return showInfo({
        collapsing: true,
        header: textsCap.header,
        size: 'tiny',
        ...modalProps,
        content: <TaskDetails {...{ ...props, modalId }} />,
    }, modalId)
}