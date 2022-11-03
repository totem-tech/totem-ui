/*
 * Read-only form that displays task details
 */
import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { getUser } from '../../utils/chatClient'
import { blockNumberToTS, format } from '../../utils/time'
import { getCurrentBlock } from '../../services/blockchain'
import { translated } from '../../services/language'
import { confirmAsPromise } from '../../services/modal'
import { UserID } from '../../components/buttons'
import DataTableVertical from '../../components/DataTableVertical'
import LabelCopy from '../../components/LabelCopy'
import { statuses } from '../../components/Message'
import Currency from '../currency/Currency'
import AddPartnerBtn from '../partner/AddPartnerBtn'
import { approvalStatusNames, statusNames } from './task'

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
    updated: 'updated',
}
textsCap = translated(textsCap, true)[1]

export default function TaskDetails(props = {}) {
    const [tableProps, setTableProps] = useState({ 
        emptyMessage: {
            content: textsCap.loading,
            icon: true,
            status: statuses.LOADING,
        }
    })

    useEffect(() => { 
        getCurrentBlock().then(blockNum => {
            let { task = {}, id = '' } = props
            task = {...task, id}
            const { deadline, dueDate } = task
            task.amount = parseInt(task.amountXTX)
            task.deadline = blockNumberToTS(deadline, blockNum, true)
            task.dueDate = blockNumberToTS(dueDate, blockNum, true)
            task.tsCreated = format(task.tsCreated)
            task.tsUpdated = format(task.tsUpdated)
            const ownerIsApprover = task.owner === task.approver
            const userIsOwner = (getUser() || {}).id === task.createdBy
            const columns = [
                {
                    content: ({ id }) => (
                        <LabelCopy {...{
                            maxLength: 18,
                            value: id,
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
                    content: x => approvalStatusNames[x.approvalStatus],
                    key: 'orderStatus',
                    title: textsCap.orderStatus,
                },
                {
                    content: x => statusNames[x.orderStatus],
                    key: 'approvalStatus',
                    title: textsCap.approvalStatus,
                },
                {
                    content: x => <AddPartnerBtn {...{ address: x.fulfiller }} />,
                    key: 'fulfiller',
                    title: textsCap.fulfiller,
                },
                {
                    content: x => [
                        <AddPartnerBtn {...{ address: x.owner, key: 0 }} />,
                        <span key='1'>
                            {!userIsOwner && <UserID prefix=' (' suffix=')' userId={x.createdBy} />}
                        </span>,
                    ],
                    key: 'owner',
                    title: textsCap.owner,
                },
                {
                    content: x => <AddPartnerBtn {...{ address: x.approver }} />,
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
                data: [task],
                emptyMessage: undefined,
            }
            setTableProps(tableProps)            
        })
    }, [])

    return <DataTableVertical {...tableProps} />
}
TaskDetails.defaultProps = {
    // Task ID
    id: PropTypes.string,
    // task
    task: PropTypes.object,
}
/**
 * @name    TaskDetails.asModal
 * 
 * @param   {Object} task 
 * @param   {String} id 
 * 
 * @returns {Promise}
 */
TaskDetails.asModal = (task, id) => confirmAsPromise({
    className: 'collapsing',
    cancelButton: null,
    confirmButton: null,
    content: <TaskDetails {...{ id, task }} />,
    header: textsCap.header,
    size: 'mini',
})