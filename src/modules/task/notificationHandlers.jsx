import React from 'react'
import { Button } from 'semantic-ui-react'
import { isArr } from '../../utils/utils'
import { ButtonAcceptOrReject } from '../../components/buttons'
import { translated } from '../../utils/languageHelper'
import { confirmAsPromise } from '../../services/modal'
import {
	addToQueue,
	awaitComplete,
	QUEUE_TYPES,
	statuses as queueStatuses,
} from '../../services/queue'
import { get as getIdentity } from '../identity/identity'
import { get as getPartner } from '../partner/partner'
import {
	getMatchingIds,
	remove,
	setItemViewHandler,
} from '../notification/notification'
import {
	query,
	queueables,
	statuses,
} from './task'
import TaskDetails from './TaskDetails'
import IdentityIcon from '../identity/IdentityIcon'

let textsCap = {
	assignedTaskMsg: 'assigned a task to you.',
	dispute: 'dispute',
	invoiceAccept: 'accept task invoice and pay assignee',
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
	viewTask: 'view task',
	yourIdentity: 'your identity',

	// marketplace related
	mpAccepted: 'accepted your application and assigned a task to you',
	mpApplied: 'applied to your marketplace task',
	mpAppliedTotal: 'total applications',
	mpRejected: 'rejected your marketplace task application'

}
textsCap = translated(textsCap, true)[1]
const icon = 'tasks'
// Notification type
const TASK_TYPE = 'task'
const CHILD_TYPES = {
	assignment: 'assignment',
	assignmentResponse: 'assignment_response',
	invoiced: 'invoiced',
	invoicedResponse: 'invoiced_response',
	// owner received new application
	marketApply: 'marketplace_apply',
	// applicant received response
	marketApplyResponse: 'marketplace_apply_response',
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
	const invalid = !task || !isFulfiller || orderStatus !== statuses.created
	if (invalid) return removeTaskNotifs(taskId, CHILD_TYPES.assignment)

	const confirmed = await confirmAsPromise({
		size: 'mini',
		content: accepted
			? textsCap.taskAccept
			: textsCap.taskReject,
	})
	confirmed && await handleUpdateStatus(
		fulfillerAddress,
		taskId,
		accepted
			? statuses.accepted
			: statuses.rejected,
		accepted
			? textsCap.taskAccept
			: textsCap.taskReject,
		(success) => success && removeTaskNotifs(
			taskId,
			CHILD_TYPES.assignment,
		),
		notificationId || getTaskNotifIds(
			taskId,
			CHILD_TYPES.assignment,
		)
	)
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
	const confirmed = await confirmAsPromise({
		content: accepted
			? textsCap.invoiceAcceptConfirm
			: textsCap.invoiceDisputeConfirm,
		size: 'mini',
	})
	confirmed && await handleUpdateStatus(
		ownerAddress,
		taskId,
		accepted
			? statuses.completed
			: statuses.disputed,
		accepted
			? textsCap.invoiceAccept
			: textsCap.invoiceDispute,
		// remove matching notifications
		() => removeTaskNotifs(taskId, CHILD_TYPES.invoiced),
		notificationId || getTaskNotifIds(taskId, CHILD_TYPES.invoiced)
	)
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
export const handleUpdateStatus = async (address, taskIds, statusCode, queueTitle, then, notificationId) => {
	taskIds = isArr(taskIds)
		? taskIds
		: [taskIds]
	const promises = taskIds.map(async (taskId) => {
		const task = await query.orders(taskId)
		if (!task) return
		const {
			owner: ownerAddress,
			fulfiller: fulfillerAddress,
		} = task
		const detailsMap = await query.getDetailsByTaskIds([taskId])
		const { title: taskTitle } = detailsMap.get(taskId) || {}

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

		const queueItem = queueables.changeStatus(
			address,
			taskId,
			statusCode,
			{
				description: taskTitle || taskId,
				next: userId
					? notifyProps
					: null,
				notificationId,
				then,
				title: queueTitle,
			},
		)
		await awaitComplete(addToQueue(queueItem))
	})
	await Promise.all(promises)
		.catch(console.log)
}

const getTaskDetailsBtn = (taskId, props) => (
	<Button {...{
		icon: 'eye',
		onClick: e => {
			e.preventDefault()
			TaskDetails.asModal({ taskId })
		},
		size: 'tiny',
		style: { padding: 3 },
		title: textsCap.viewTask,
		...props,
	}} />
)
// set task related notification item view handlers
setTimeout(() =>
	[
		{
			// Notification item view when user has been assigned to a task
			childType: CHILD_TYPES.assignment,
			type: TASK_TYPE,
			handler: (id, notification = {}, { senderIdBtn }) => {
				const { data, status } = notification
				const {
					fulfillerAddress,
					purpose,
					taskId,
				} = data || {}
				const {
					address,
					name,
					usageType,
				} = getIdentity(fulfillerAddress) || {}
				if (!name) {
					// fulfillerAddress doesn't belong to the user!
					remove(id)
					return {}
				}
				const onAction = async (_, accepted) => await handleAssignmentResponse(
					taskId,
					fulfillerAddress,
					accepted,
					id,
				)
				let msg
				switch (purpose) {
					case 1:
						msg = textsCap.mpAccepted
						break
					default:
						msg = textsCap.assignedTaskMsg
						break
				}
				const isLoading = queueStatuses.LOADING === status
				const content = (
					<div>
						{senderIdBtn}
						{` ${msg || ''}`.toLowerCase()}
						{' '}
						{getTaskDetailsBtn(taskId)}
						<div>
							<IdentityIcon {...{ address, usageType }} />
							{textsCap.yourIdentity}: {name}
						</div>
						<ButtonAcceptOrReject {...{
							acceptColor: 'blue',
							disabled: isLoading,
							fluid: true,
							onAction,
						}} />
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
				const { data = {}, status } = notification
				const { ownerAddress, taskId, taskTitle } = data
				const ownerIdentity = getIdentity(ownerAddress)
				// invalid task or does task not belong to user
				if (!taskId || !ownerIdentity) return remove(id)

				const onAction = async (_, accepted) => await handleInvoicedResponse(taskId, ownerAddress, accepted, id)
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
						<ButtonAcceptOrReject {...{
							acceptText: textsCap.pay,
							disabled: status === queueStatuses.LOADING,
							fluid: true,
							onAction,
							rejectText: textsCap.dispute,
						}} />
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
				const { address, name, usageType } = getIdentity(fulfillerAddress)
				// invalid task or task is not assigned to user's identity
				if (!name || !taskId) return remove(id)

				const content = (
					<div>
						{senderIdBtn} {(
							disputed
								? textsCap.taskDisputed
								: textsCap.taskPaid
						).toLowerCase()}
						<div>
							<b>{textsCap.task}: </b>
							{taskTitle || taskId}
							{' '}
							{getTaskDetailsBtn(taskId)}
						</div>
						<div>
							<b>{textsCap.yourIdentity}: </b>
							<IdentityIcon {...{ address, usageType }} /> {name}
						</div>
					</div>
				)
				return { content, icon }
			},
		},

		// marketplace related
		{
			childType: CHILD_TYPES.marketApply,
			type: TASK_TYPE,
			handler: (id, notification = {}, { senderIdBtn }) => {
				const {
					data: {
						applications = 1,
						taskId,
					} = {},
				} = notification

				const content = (
					<div>
						{senderIdBtn}
						{' ' + textsCap.mpApplied + ' '}
						{getTaskDetailsBtn(taskId)}
						<div>
							{textsCap.mpAppliedTotal}: {applications}
						</div>
					</div>
				)
				return { content, icon }
			},
		},
		{
			childType: CHILD_TYPES.marketApplyResponse,
			type: TASK_TYPE,
			handler: (id, notification = {}, { senderIdBtn }) => {
				const {
					data: { taskId } = {},
				} = notification

				const content = (
					<div>
						{senderIdBtn}
						{' ' + textsCap.mpRejected + ' '}
						{getTaskDetailsBtn(taskId)}
					</div>
				)
				return { content, icon }
			},
		},
	].forEach((x) => setItemViewHandler(x.type, x.childType, x.handler))
)
