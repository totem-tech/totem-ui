import React from 'react'
import { isArr, isFn } from '../../utils/utils'
import { ButtonAcceptOrReject } from '../../components/buttons'
import { translated } from '../../services/language'
import { confirm } from '../../services/modal'
import { addToQueue, QUEUE_TYPES, statuses as queueStatuses } from '../../services/queue'
import { get as getIdentity } from '../identity/identity'
import { get as getPartner } from '../partner/partner'
import notification, { remove, removeMatching, search, setItemViewHandler } from '../notification/notification'
import { query, queueables, statuses } from './task'

const [texts, textsCap] = translated({
    assigntTaskMsg: 'assigned a task to you.',
    taskAccept: 'accept task',
    taskAccepted: 'accepted the following task:',
    taskReject: 'reject task',
    taskRejected: 'rejected the following task:',
    yourIdentity: 'your identity',
}, true)
const TYPE = 'task'
const CHILD_TYPES = {
    assignment: 'assignment',
    assignmentResponse: 'assignment_response',
}

/**
 * @name    handleTaskAssignment
 * @summary accept/reject task
 * 
 * @param   {String} taskId 
 * @param   {String} assigneeAddress 
 * @param   {Boolean} accepted 
 */
export const handleTaskAssignment = async (taskId, assigneeAddress, accepted = false) => {
    // retrieve task details
    const task = await query.orders(taskId)
    const { orderStatus } = task
    const isFulfiller = task && task.fulfiller === assigneeAddress
    const removeNotifs = () => removeMatching(
        { type: TYPE, childType: CHILD_TYPES.assignment },
        { assigneeAddress, taskId },
    )
    // invalid taskId or task cannot be accepted 
    if (!task || !isFulfiller || orderStatus !== statuses.submitted) return removeNotifs()

    handleUpdateStatus(
        assigneeAddress,
        taskId,
        accepted ? statuses.accepted : statuses.rejected,
        accepted ? textsCap.taskAccept : textsCap.taskReject,
        success => success && removeNotifs()
    )
}

const handleAssignmentItemView = (id, notification = {}, { senderIdBtn }) => {
    const { data, status } = notification
    const { assigneeAddress, taskId } = data || {}
    const { name } = getIdentity(assigneeAddress) || {}
    if (!name) {
        // assigneeAddress doesn't belong to the user!
        remove(id)
        return {}
    }

    return {
        icon: 'tasks',
        content: (
            <div>
                {senderIdBtn} {texts.assigntTaskMsg}
                <div>{textsCap.yourIdentity}: {name}</div>
                <ButtonAcceptOrReject {...{
                    acceptColor: 'blue',
                    disabled: status === queueStatuses.LOADING,
                    onClick: accepted => confirm({
                        onConfirm: () => handleTaskAssignment(taskId, assigneeAddress, accepted),
                        size: 'mini',
                    })
                }} />

            </div>
        ),
    }
}

const handleAssignmentResponseItemView = (id, notification = {}, { senderIdBtn }) => {
    const { data = {} } = notification
    const { accepted, taskId, taskTitle, ownerAddress } = data
    if (!taskId || !getIdentity(ownerAddress)) {
        // invalid task or does task not belong to user
        remove(id)
        return ''
    }

    const msg = {
        icon: 'tasks',
        content: (
            <div>
                {senderIdBtn} {accepted ? textsCap.taskAccepted : textsCap.taskRejected}
                <div><i>{taskTitle || taskId}</i></div>
            </div>
        ),
    }
    return msg
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
export const handleUpdateStatus = (address, taskIds, statusCode, queueTitle, then) => {
    taskIds = isArr(taskIds) ? taskIds : [taskIds]
    taskIds.forEach(async (taskId) => {
        const task = await query.orders(taskId)
        if (!task) return
        const { owner: ownerAddress, fulfiller: fulfillerAddress } = task
        const { title: taskTitle } = (await query.getDetailsByTaskIds([taskId])).get(taskId) || {}
        const isOwner = !!getIdentity(ownerAddress)

        // notification for appropriate statuses
        let send = false
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
                const { userId } = getPartner(ownerAddress) || {}
                if (isOwner || !userId) break
                data = {
                    accepted: statusCode === statuses.accepted,
                    taskId,
                    taskTitle,
                    ownerAddress,
                }
                notifyProps.args = [[userId], TYPE, CHILD_TYPES.assignmentResponse, null, data]
                send = true
                break
            case statuses.invoiced: // fulfiller marked as done
                break
            case statuses.disputed: // owner rejected invoice
                break
            case statuses.completed: // owner approved invoice and payment is processed
                break
        }

        addToQueue(queueables.changeStatus(
            address,
            taskId,
            statusCode,
            {
                description: taskTitle || taskId,
                next: send ? notifyProps : null,
                then,
                title: queueTitle,
            }
        ))
    })
}

setTimeout(() => [
    {
        childType: CHILD_TYPES.assignment,
        handler: handleAssignmentItemView,
        type: TYPE,
    },
    {
        childType: CHILD_TYPES.assignmentResponse,
        handler: handleAssignmentResponseItemView,
        type: TYPE,
    }
].forEach(x => setItemViewHandler(x.type, x.childType, x.handler)))