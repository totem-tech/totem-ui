import React from 'react'
import { isArr, isFn } from '../../utils/utils'
import { ButtonAcceptOrReject, ButtonGroup } from '../../components/buttons'
import { translated } from '../../services/language'
import { confirm } from '../../services/modal'
import { addToQueue, QUEUE_TYPES, statuses as queueStatuses } from '../../services/queue'
import { get as getIdentity } from '../identity/identity'
import { get as getPartner } from '../partner/partner'
import { remove, removeMatching, setItemViewHandler } from '../notification/notification'
import task, { query, queueables, statuses } from './task'
import { Button } from 'semantic-ui-react'

const [texts, textsCap] = translated({
    assigntTaskMsg: 'assigned a task to you.',
    dispute: 'dispute',
    ignore: 'ignore',
    invoiceAccept: 'accept task invoice',
    invoiceAcceptConfirm: 'accept invoice and pay the assignee?',
    invoiceDispute: 'reject task invoice',
    invoiceDisputeConfirm: 'reject invoice and dispute task?',
    pay: 'pay',
    task: 'task',
    taskAccept: 'accept task',
    taskAccepted: 'accepted the following task:',
    taskDisputed: 'disputed a task',
    taskInvoiced: 'created an invoice',
    taskPaid: 'made a payment to you',
    taskReject: 'reject task',
    taskRejected: 'rejected the following task:',
    yourIdentity: 'your identity',
}, true)
const icon = 'tasks'
// Notification type
const TASK_TYPE = 'task'
const CHILD_TYPES = {
    assignment: 'assignment',
    assignmentResponse: 'assignment_response',
    invoiced: 'invoiced',
    invoicedResponse: 'invoiced_response',
}

/**
 * @name    removeNotifs
 * @summary remove notifications matching `childType` and task ID in `data` property
 * 
 * @param {String} taskId 
 * @param {String} childType
 */
const removeNotifs = (taskId, childType) => removeMatching({ type: TASK_TYPE, childType }, { taskId })

/**
 * @name    handleAssignmentResponse
 * @summary response to task assignment
 * 
 * @param   {String}    taskId 
 * @param   {String}    fulfillerAddress 
 * @param   {Boolean}   accepted 
 * @param   {String}    notificationId (optional)
 */
export const handleAssignmentResponse = async (taskId, fulfillerAddress, accepted = false, notificationId) => {
    // retrieve task details
    const task = await query.orders(taskId)
    const { orderStatus } = task
    const isFulfiller = task && task.fulfiller === fulfillerAddress
    // invalid taskId or task cannot be accepted 
    if (!task || !isFulfiller || orderStatus !== statuses.submitted) return removeNotifs(
        taskId,
        CHILD_TYPES.assignment,
    )

    handleUpdateStatus(
        fulfillerAddress,
        taskId,
        accepted ? statuses.accepted : statuses.rejected,
        accepted ? textsCap.taskAccept : textsCap.taskReject,
        success => success && removeNotifs( taskId, CHILD_TYPES.assignment ),
        notificationId,
    )
}

/**
 * @name    handleTaskInvoiced
 * @summary accept/dispute invoiced task
 * 
 * @param   {String}    taskId 
 * @param   {String}    ownerAddress 
 * @param   {Boolean}   accepted        whether invoice has been accepted (to pay) or disputed
 * @param   {String}    notificationId (optional)
 */
export const handleInvoicedResponse = async (taskId, ownerAddress, accepted = false, notificationId) => {
    confirm({
        content: accepted ? textsCap.invoiceAcceptConfirm : textsCap.invoiceDisputeConfirm,
        onConfirm: () => handleUpdateStatus(
            ownerAddress,
            taskId,
            accepted ? statuses.completed : statuses.disputed,
            accepted ? textsCap.invoiceAccept : textsCap.invoiceDispute,
            // remove matching notifications
            () => removeNotifs(taskId, CHILD_TYPES.invoiced), 
            notificationId,
        ),
        size: 'mini',
    })
}

/**
 * @name    handleUpdateStatus
 * @summary update task status
 * 
 * @param   {String}        address
 * @param   {String|Array}  taskIds
 * @param   {Number}        statusCode
 * @param   {String}        queueTitle  short message to be displayed in the queue toast and history item
 * @param   {Function}      then        (optional) callback to be invoked once queue item finishes execution.
 *                                      See queue service for list of arguments supplied.
 */
export const handleUpdateStatus = (address, taskIds, statusCode, queueTitle, then, notificationId) => {
    taskIds = isArr(taskIds) ? taskIds : [taskIds]
    taskIds.forEach(async (taskId) => {
        const task = await query.orders(taskId)
        if (!task) return
        const { owner: ownerAddress, fulfiller: fulfillerAddress } = task
        const { title: taskTitle } = (await query.getDetailsByTaskIds([taskId])).get(taskId) || {}

        // notification for appropriate statuses
        let userId
        let data = {}
        const notifyProps = {
            args: [],
            func: 'notify',
            silent: true,
            type: QUEUE_TYPES.CHATCLIENT,
        }

        switch (statusCode) {
            case statuses.accepted: // fulfiller rejected task assignment
            case statuses.rejected: // fulfiller rejected task assignment
                // recipient is the user themself
                if (getIdentity(ownerAddress)) break
                
                userId = (getPartner(ownerAddress) || {}).userId
                if (!userId) break
                
                data = {
                    accepted: statusCode === statuses.accepted,
                    taskId,
                    taskTitle,
                    ownerAddress,
                }
                notifyProps.args = [
                    [userId],
                    TASK_TYPE,
                    CHILD_TYPES.assignmentResponse,
                    null,
                    data,
                ]
                break
            case statuses.invoiced: // fulfiller marked task as done
                // recipient is the user themself
                if (getIdentity(ownerAddress)) break
                
                userId = (getPartner(ownerAddress) || {}).userId
                if (!userId) break

                data = { ownerAddress, taskId, taskTitle }
                notifyProps.args = [
                    [userId],
                    TASK_TYPE,
                    CHILD_TYPES.invoiced,
                    null,
                    data,
                ]
                break
            case statuses.disputed: // owner rejected invoice
            case statuses.completed: // owner approved invoice and payment is processed
                // recipient is the user themself
                if (getIdentity(fulfillerAddress)) break
                userId = (getPartner(fulfillerAddress) || {}).userId
                if (!userId) break

                data = {
                    disputed: statusCode === statuses.disputed,
                    fulfillerAddress,
                    taskId,
                    taskTitle,
                }
                notifyProps.args = [
                    [userId],
                    TASK_TYPE,
                    CHILD_TYPES.invoicedResponse,
                    null,
                    data,
                ]
                break
        }

        addToQueue(queueables.changeStatus(
            address,
            taskId,
            statusCode,
            {
                description: taskTitle || taskId,
                next: userId ? notifyProps : null,
                notificationId,
                then,
                title: queueTitle,
            }
        ))
    })
}

// set task related notification item view handlers
setTimeout(() => [
    {
        // Notification item view when user has been assigned to a task
        childType: CHILD_TYPES.assignment,
        type: TASK_TYPE,
        handler: (id, notification = {}, { senderIdBtn }) => {
            const { data, status } = notification
            const { fulfillerAddress, taskId } = data || {}
            const { name } = getIdentity(fulfillerAddress) || {}
            if (!name) {
                // fulfillerAddress doesn't belong to the user!
                remove(id)
                alert()
                return {}
            }
            const responseBtn = (
                <ButtonAcceptOrReject {...{
                    acceptColor: 'blue',
                    disabled: status === queueStatuses.LOADING,
                    onAction: accepted => confirm({
                        onConfirm: () => handleAssignmentResponse(
                            taskId,
                            fulfillerAddress,
                            accepted,
                            id,
                        ),
                        size: 'mini',
                    })
                }} />
            )
            return {
                icon,
                content: (
                    <div>
                        {senderIdBtn} {texts.assigntTaskMsg}
                        <div>{textsCap.yourIdentity}: {name}</div>
                        {responseBtn}
                    </div>
                ),
            }
        },
    },
    {
        // Notification item view when user is task owner and assignee responded to task assignment
        childType: CHILD_TYPES.assignmentResponse,
        type: TASK_TYPE,
        handler: (id, notification = {}, { senderIdBtn }) => {
            const { data = {} } = notification
            const { accepted, taskId, taskTitle, ownerAddress } = data
            // invalid task or does task not belong to user
            if (!taskId || !getIdentity(ownerAddress)) return remove(id)

            return {
                icon,
                content: (
                    <div>
                        {senderIdBtn} {accepted ? textsCap.taskAccepted : textsCap.taskRejected}
                        <div><i>{taskTitle || taskId}</i></div>
                    </div>
                ),
            }
        },
    },
    {
        // Notification item view when user is task owner and assignee has marked as done
        childType: CHILD_TYPES.invoiced,
        type: TASK_TYPE,
        handler: (id, notification = {}, { senderIdBtn }) => {
            const { data = {} } = notification
            const { ownerAddress, taskId, taskTitle } = data
            const ownerIdentity = getIdentity(ownerAddress)
            // invalid task or does task not belong to user
            if (!taskId || !ownerIdentity) return remove(id)
            const responseBtn = (
                <ButtonGroup {...{
                    disabled: status === queueStatuses.LOADING,
                    buttons: [
                        { color: 'blue', content: textsCap.pay },
                        { color: 'red', content: textsCap.dispute },
                        { content: textsCap.ignore },
                    ],
                    onAction: accepted => { 
                        alert(JSON.stringify(accepted))
                        if (accepted === null) return remove(id)
                        handleInvoicedResponse(taskId, ownerAddress, accepted, id)
                    },
                    or: true,
                    values: [true, false, null]
                }} />
            )
            
            return {
                icon,
                content: (
                    <div>
                        {senderIdBtn} {textsCap.taskInvoiced}
                        <div><b>{textsCap.task}: </b>{taskTitle || taskId}</div>
                        <div><b>{textsCap.yourIdentity}: </b>{ownerIdentity.name}</div>
                        {responseBtn}
                    </div>
                ),
            }
        },
    },
    {
        childType: CHILD_TYPES.invoicedResponse,
        type: TASK_TYPE,
        handler: (id, notification = {}, { senderIdBtn }) => {
            const { data = {} } = notification
            const { disputed, fulfillerAddress, taskId, taskTitle } = data
            const identity = getIdentity(fulfillerAddress)
            // invalid task or task is not assigned to user's identity
            if (!identity || !taskId) return remove(id)

            return {
                icon,
                content: (
                    <div>
                        {senderIdBtn} {disputed ? textsCap.taskDisputed : textsCap.taskPaid}
                        <div>
                            <b>{textsCap.yourIdentity}: </b>{identity.name}
                        </div>
                        <div>
                            <b>{textsCap.task}: </b>{taskTitle || taskId}
                        </div>
                    </div>
                )
            }
        },
    },
].forEach(x => setItemViewHandler(x.type, x.childType, x.handler)))