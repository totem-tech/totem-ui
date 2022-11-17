/*
 * Read-only form that displays task details
 */
import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Button } from 'semantic-ui-react'
import { getUser } from '../../utils/chatClient'
import { useRxSubject } from '../../utils/reactHelper'
import { blockNumberToTS, format } from '../../utils/time'
import { getCurrentBlock } from '../../services/blockchain'
import { translated } from '../../services/language'
import { showForm, showInfo } from '../../services/modal'
import { UserID } from '../../components/buttons'
import DataTableVertical from '../../components/DataTableVertical'
import LabelCopy from '../../components/LabelCopy'
import { statuses } from '../../components/Message'
import Currency from '../currency/Currency'
import AddressName from '../partner/AddressName'
import { approvalStatusNames } from './task'
import TaskForm from './TaskForm'
import { BehaviorSubject } from 'rxjs'

let textsCap = {
    amount: 'bounty amount',
    approvalStatus: 'approval status',
    approver: 'approver',
    created: 'created',
    deadline: 'deadline to accept task',
    dueDate: 'due date',
    fulfiller: 'assignee',
    header: 'task details',
    id: 'ID',
    loading: 'loading...',
    orderStatus: 'order status',
    owner: 'creator by',
    title: 'title',
    updateTask: 'update task',
    updated: 'updated',
}
textsCap = translated(textsCap, true)[1]

export default function TaskDetails(props = {}) {
    const {
        allowEdit,
        getStatusView,
        rxInProgressIds,
        rxTasks,
        taskId = '',
    } = props
    const [blockNum, setBlockNum] = useState()
    const [inProgressIds = new Set()] = useRxSubject(rxInProgressIds)
    const [task] = useRxSubject(rxTasks, tasks => ({ ...tasks.get(taskId) }))
    const [tableProps, setTableProps] = useState({ 
        emptyMessage: {
            content: textsCap.loading,
            icon: true,
            status: statuses.LOADING,
        },
    })

    useEffect(() => {
        getCurrentBlock().then(setBlockNum)
    }, [])

    useEffect(() => {
        if (!Object.keys(task).length) return () => { }

        // let { task = {} } = props
        const _task = {...task, taskId}
        const { deadline, dueDate } = _task
        _task.amount = parseInt(_task.amountXTX)
        _task.deadline = blockNumberToTS(deadline, blockNum, true)
        _task.dueDate = blockNumberToTS(dueDate, blockNum, true)
        _task.tsCreated = format(_task.tsCreated)
        _task.tsUpdated = format(_task.tsUpdated)
        const ownerIsApprover = _task.owner === _task.approver
        const userIsOwner = (getUser() || {}).id === _task.createdBy
        const columns = [
            {
                content: ({ taskId }) => (
                    <LabelCopy {...{
                        maxLength: 18,
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
                content: x => <Currency {...{ value: x.amount }} />,
                key: 'amount',
                title: textsCap.amount,
            },
            {
                content: (...args) => getStatusView(...args),
                key: 'orderStatus',
                title: textsCap.orderStatus,
            },
            {
                content: x => approvalStatusNames[x.approvalStatus],
                key: 'approvalStatus',
                title: textsCap.approvalStatus,
            },
            {
                content: x => <AddressName {...{ address: x.fulfiller }} />,
                key: 'fulfiller',
                title: textsCap.fulfiller,
            },
            {
                content: x => [
                    <AddressName {...{ address: x.owner, key: 0 }} />,
                    <span key='1'>
                        {!userIsOwner && <UserID prefix=' (' suffix=')' userId={x.createdBy} />}
                    </span>,
                ],
                key: 'owner',
                title: textsCap.owner,
            },
            {
                content: x => <AddressName {...{ address: x.approver }} />,
                hidden: ownerIsApprover,
                key: 'approver',
                title: textsCap.approver,
            },
            {
                key: 'dueDate',
                title: textsCap.dueDate,
            },
            {
                key: 'deadline',
                title: textsCap.deadline,
            },
            {
                key: 'tsCreated',
                title: textsCap.created,
            },
            {
                key: 'tsUpdated',
                title: textsCap.updated,
            },
        ]
        const tableProps = {
            columns,
            data: new Map([[taskId, _task]]),
            emptyMessage: undefined,
            inProgressIds,
        }
        setTableProps(tableProps)   
    }, [setTableProps, getStatusView, blockNum, inProgressIds, task])

    return (
        <div>
            <DataTableVertical {...tableProps} />
            {allowEdit && !!taskId && (
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
                        onClick: () => showForm(TaskForm, {
                            taskId,
                            values: task,
                        }, taskId),
                    }} />
                </div>
            )}
        </div>
    )
}
TaskDetails.propTypes = {
    rxInProgressIds: PropTypes.instanceOf(BehaviorSubject),
    // Task ID
    taskId: PropTypes.string,
    // task
    task: PropTypes.object,
}
/**
 * @name    TaskDetails.asModal
 * 
 * @param   {Object}            props
 * @param   {Object}            props.task 
 * @param   {String}            props.taskId
 * @param   {BehaviorSubject}   props.rxInProgressIds
 * 
 * @returns {Promise}
 */
TaskDetails.asModal = props => showInfo({
    collapsing: true,
    content: <TaskDetails {...props} />,
    header: textsCap.header,
    size: 'mini',
}, props.taskId)