import React from 'react'
import { isArr } from '../../utils/utils'
import { ButtonGroup } from '../../components/buttons'
import { translated } from '../../services/language'
import { confirm } from '../../services/modal'
import { addToQueue, QUEUE_TYPES, statuses as queueStatuses } from '../../services/queue'
import { get as getIdentity } from '../identity/identity'
import { get as getPartner } from '../partner/partner'
import { getMatchingIds, remove, setItemViewHandler } from '../notification/notification'
import { query, queueables, statuses } from './task'

const [texts, textsCap] = translated(
	{
		accept: 'accept',
		assigntTaskMsg: 'assigned a task to you.',
		dispute: 'dispute',
		invoiceAccept: 'accept task invoice',
		invoiceAcceptConfirm: 'accept invoice and pay the assignee?',
		invoiceDispute: 'reject task invoice',
		invoiceDisputeConfirm: 'reject invoice and dispute task?',
		pay: 'pay',
		reject: 'reject',
		task: 'task',
		taskAccept: 'accept task',
		taskAccepted: 'accepted the following task:',
		taskDisputed: 'disputed a task',
		taskInvoiced: 'created an invoice',
		taskPaid: 'made a payment to you',
		taskReject: 'reject task',
		taskRejected: 'rejected the following task:',
		yourIdentity: 'your identity',
	},
	true
)
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
 * @name    getTaskNotifIds
 * @summary get task notification IDs matching @taskId and @childType
 *
 * @param   {String}    taskId
 * @param   {String}    childType notification child type
 *
 * @returns {Array}
 */
const getTaskNotifIds = (taskId, childType) => getMatchingIds({ type: TASK_TYPE, childType }, { taskId })

/**
 * @name    removeTaskNotifs
 * @summary remove task notifications matching `childType` and task ID in `data` property
 *
 * @param   {String}    taskId
 * @param   {String}    childType notification child type
 */
const removeTaskNotifs = (taskId, childType) => remove(getTaskNotifIds(taskId, childType))

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
	const { orderStatus } = task || {}
	const isFulfiller = task && task.fulfiller === fulfillerAddress
	// invalid taskId or task cannot be accepted
	if (!task || !isFulfiller || orderStatus !== statuses.submitted)
		return removeTaskNotifs(taskId, CHILD_TYPES.assignment)

	confirm({
		size: 'mini',
		content: accepted ? textsCap.taskAccept : textsCap.taskReject,
		onConfirm: () =>
			handleUpdateStatus(
				fulfillerAddress,
				taskId,
				accepted ? statuses.accepted : statuses.rejected,
				accepted ? textsCap.taskAccept : textsCap.taskReject,
				(success) => success && removeTaskNotifs(taskId, CHILD_TYPES.assignment),
				notificationId || getTaskNotifIds(taskId, CHILD_TYPES.assignment)
			),
	})
}

/**
 * @name    handleTaskInvoiced
 * @summary accept/dispute invoiced task
 *
 * @param   {String}    taskId
 * @param   {String}    ownerAddress
 * @param   {Boolean|null}   accepted        whether invoice has been accepted (to pay) or disputed
 * @param   {String}    notificationId (optional)
 */
export const handleInvoicedResponse = async (taskId, ownerAddress, accepted, notificationId) => {
	confirm({
		content: accepted ? textsCap.invoiceAcceptConfirm : textsCap.invoiceDisputeConfirm,
		onConfirm: () =>
			handleUpdateStatus(
				ownerAddress,
				taskId,
				accepted ? statuses.completed : statuses.disputed,
				accepted ? textsCap.invoiceAccept : textsCap.invoiceDispute,
				// remove matching notifications
				() => removeTaskNotifs(taskId, CHILD_TYPES.invoiced),
				notificationId || getTaskNotifIds(taskId, CHILD_TYPES.invoiced)
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
 * @param   {String}        queueTitle      short message to be displayed in the queue toast and history item
 * @param   {Function}      then            (optional) callback to be invoked once queue item finishes execution.
 *                                          See queue service for list of arguments supplied.
 * @param   {String|Array}  notificationId  attach notification ids so that they are disabled when action is in-progress
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
				notifyProps.args = [[userId], TASK_TYPE, CHILD_TYPES.assignmentResponse, null, data]
				break
			case statuses.invoiced: // fulfiller marked task as done
				// recipient is the user themself
				if (getIdentity(ownerAddress)) break

				userId = (getPartner(ownerAddress) || {}).userId
				if (!userId) break

				data = { ownerAddress, taskId, taskTitle }
				notifyProps.args = [[userId], TASK_TYPE, CHILD_TYPES.invoiced, null, data]
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
				notifyProps.args = [[userId], TASK_TYPE, CHILD_TYPES.invoicedResponse, null, data]
				break
		}

		addToQueue(
			queueables.changeStatus(address, taskId, statusCode, {
				description: taskTitle || taskId,
				next: userId ? notifyProps : null,
				notificationId,
				then,
				title: queueTitle,
			})
		)
	})
}

// set task related notification item view handlers
setTimeout(() =>
	[
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
					return {}
				}

				const buttons = [
					{ color: 'blue', content: textsCap.accept },
					{ color: 'red', content: textsCap.reject },
				]
				const onAction = (_, accepted) => handleAssignmentResponse(taskId, fulfillerAddress, accepted, id)
				const content = (
					<div>
						{senderIdBtn} {texts.assigntTaskMsg}
						<div>
							{textsCap.yourIdentity}: {name}
						</div>
						<ButtonGroup
							{...{
								buttons,
								disabled: status === queueStatuses.LOADING,
								fluid: true,
								loading: status === queueStatuses.LOADING,
								onAction,
								or: true,
								// what to pass when respective button is clicked
								values: [true, false, null],
							}}
						/>
					</div>
				)
				return { icon, content }
			},
		},
		{
			// Notification item view when user is task owner and assignee responded to task assignment
			// no action required
			childType: CHILD_TYPES.assignmentResponse,
			type: TASK_TYPE,
			handler: (id, notification = {}, { senderIdBtn }) => {
				const { data = {} } = notification
				const { accepted, taskId, taskTitle, ownerAddress } = data
				// invalid task or does task not belong to user
				if (!taskId || !getIdentity(ownerAddress)) return remove(id)

				const content = (
					<div>
						{senderIdBtn} {accepted ? textsCap.taskAccepted : textsCap.taskRejected}
						<div>
							<i>{taskTitle || taskId}</i>
						</div>
					</div>
				)
				return { icon, content }
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

				const buttons = [
					{ color: 'blue', content: textsCap.pay },
					{ color: 'red', content: textsCap.dispute },
				]
				const onAction = (_, accepted) => handleInvoicedResponse(taskId, ownerAddress, accepted, id)
				const content = (
					<div>
						{senderIdBtn} {textsCap.taskInvoiced}
						<div>
							<b>{textsCap.task}: </b>
							{taskTitle || taskId}
						</div>
						<div>
							<b>{textsCap.yourIdentity}: </b>
							{ownerIdentity.name}
						</div>
						<ButtonGroup
							{...{
								buttons,
								disabled: status === queueStatuses.LOADING,
								fluid: true,
								loading: status === queueStatuses.LOADING,
								onAction,
								or: true,
								values: [true, false, null],
							}}
						/>
					</div>
				)
				return { icon, content }
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

				const content = (
					<div>
						{senderIdBtn} {disputed ? textsCap.taskDisputed : textsCap.taskPaid}
						<div>
							<b>{textsCap.yourIdentity}: </b>
							{identity.name}
						</div>
						<div>
							<b>{textsCap.task}: </b>
							{taskTitle || taskId}
						</div>
					</div>
				)
				return { icon, content }
			},
		},
	].forEach((x) => setItemViewHandler(x.type, x.childType, x.handler))
)
