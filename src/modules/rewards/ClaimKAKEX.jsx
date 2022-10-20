import React, { isValidElement, useCallback, useEffect, useState } from 'react'
import { Button, Icon, List } from 'semantic-ui-react'
import { BehaviorSubject } from 'rxjs'
import { iUseReducer, subjectAsPromise, useRxSubject } from '../../utils/reactHelper'
import { arrUnique, isFn, isObj, isStr, objClean, objWithoutKeys } from '../../utils/utils'
import FAQ from '../../components/FAQ'
import FormBuilder from '../../components/FormBuilder'
import { getAll as getHistory } from '../history/history'
import identities from '../identity/identity'
import partners from '../partner/partner'
import chatClient, { rxIsLoggedIn, rxIsRegistered } from '../../utils/chatClient'
import storage from '../../utils/storageHelper'
import { useRewards } from './rewards'
import { translated } from '../../utils/languageHelper'
import Message, { statuses } from '../../components/Message'
import { setActive, setActiveExclusive } from '../../services/sidebar'
import Text from '../../components/Text'
import { InvertibleMemo } from '../../components/Invertible'

const textsCap = translated({
	errAlreadySubmitted: 'You have already submitted your claim.',
    errEnded: 'Claim period has ended!',
    errInactive: 'Claim period is over!',
	errIneligible: 'You are not eligible to claim KAPEX!',
	errNotRegistered: 'please complete registration in the getting started module',
	feedbackLabel: 'please enter your unique feedback including any bug report here (between 50 and 5000 characters)',
	header: 'claim KAPEX',
	loading: 'loading...',
	tasksCompletedLabel: 'in order claim KAPEX you must complete the following tasks:',
}, true)[1]

export const inputNames = {
	feedback: 'feedback',
	rewardsIdentity: 'rewardsIdentity',
	taskList: 'taskList',
	taskIdentity: 'taskIdentity',
	tasksCompleted: 'tasksCompleted',
}

// invoke without arguments to retrieve saved value
const statusCached = (status) => storage.cache(
	'rewards',
	'KAPEXClaimStatus',
	isObj(status)
		? objClean(status, ['eligible', 'endDate', 'submitted'])
		: undefined,
) || {}

export const getTaskList = taskIdentity => {
	const historyArr2d = Array.from(getHistory())
	// list of user IDs who were requested to shared their identity by current user
	const partnerIds = arrUnique(
		historyArr2d
			.map(([_, { action = '', data = [] }]) => {
				const [userIds = [], type, childType] = data || []
				return (
					action === 'client.notify' &&
					type === 'identity' &&
					childType === 'request' &&
					userIds
				)
			})
			.flat()
			.filter(Boolean)
	)
	const partnerRequested = partnerIds.length > 0
	const partnersAdded = Array.from(partners.getAll())
		.map(([_, p]) => partnerIds.includes(p.userId) && p)
		.filter(Boolean)

	const taskStatus = {
		partnersAdded: partnersAdded.length > 0,
	}

	historyArr2d.forEach(([_, { action, data = [], identity, status }]) => {
		const [recipient] = data

		if (taskIdentity !== identity || status !== 'success') return
		// check blockchain transaction releated tasks
		switch (action) {
			case 'api.tx.projects.addNewProject':
				taskStatus.activityDone = true
				break
			case 'api.tx.timekeeping.submitTime':
				taskStatus.timekeepingDone = true
				break
			case 'api.tx.transfer.networkCurrency':
				taskStatus.transferred = taskStatus.transferred
					|| partnersAdded.find(x => x.address === recipient)
				break
		}
	})

	const textsCap = {
		addIdentity: 'add identity shared by a friend',
		addSelf: 'add yourself as a team member.',
		amountClaimable: 'amount transferred will not affect the amount claimable.',
		checkNotification: 'check your notification to see if your friend shared their identity with you and add their them as partner by clicking on "Add partner" button.',
		clickCreate: 'click on the "Create" button.',
		clickDuration: 'click on "Manually enter duration"',
		clickProceed: 'click on the "Proceed" button',
		clickRequest: 'click on the "Request" button.',
		clickStart: 'click on the "Start" button',
		clickSubmit: 'click on the "Submit" button',
		clickTimer: 'click on the "Timer" button.',
		clickViewTeam: 'click on the "Add/view team members" button.',
		createActivity: 'create an Activity',
		createTask: 'create a task',
		createTkRecord: 'create a timekeeping record',
		enterAmount: 'enter any amount you wish to send.',
		enterDuration: 'enter a duration of three hours (03:00:00) or greater.',
		enterFriendUserId: `Enter your friend's Totem User ID`,
		enterNameDesc: 'enter any name and description for the activity.',
		enterReason: 'select or enter a custom reason',
		followInstructions: 'follow instruction below to complete the task:',
		goToActivity: 'go to Activity module',
		goToPartners: 'go to Partners module',
		goToTasks: 'go to Tasks module',
		goToTimekeeping: 'go to Timekeeping module',
		goToTransfer: 'go to Transfer module',
		requestIdentity: 'request identity from a friend',
		selectActivity: 'select an activity.',
		selectRecipient: 'select your friend from the recipient DropDown list',
		submit: 'submit',
		submitActivity: 'submit and wait until Activity is successfully created.',
		taskCompleted: 'you have completed this task',
		transferToFriend: 'transfer any amount to one of your friend',
		waitAndStop: 'wait a few seconds and then click on the "stop" button',
	}

	const checkMark = (
		<Icon {...{
			color: 'green',
			name: 'check circle',
			title: textsCap.taskCompleted,
		}} />
	)
	const tasks = [
		{
			answer: (
				<div>
					{textsCap.followInstructions}
					<ul>
						<li>
							<a {...{
								href: '/?exclusive=false&module=partners',
								target: '_blank',
							}}>
								{textsCap.goToPartners}
							</a>
						</li>
						<li>{textsCap.clickRequest}</li>
						<li>{textsCap.enterFriendUserId}</li>
						<li>{textsCap.enterReason}</li>
						<li>{textsCap.submit}</li>
					</ul>
				</div>
			),
			completed: partnerRequested,
			question: (
				<span>
					{textsCap.requestIdentity + ' '}
					{partnerRequested && checkMark}
				</span>
			),
		},
		{
			answer: textsCap.checkNotification,
			answer: getStepList([
				textsCap.checkNotification,
				// {
				// 	children: ''
				// },
			]),
			completed: taskStatus.partnersAdded,
			question: (
				<span>
					{textsCap.addIdentity + ' '}
					{taskStatus.partnersAdded && checkMark}
				</span>
			),
		},
		{
			answer: getStepList(
				[
					{
						children: textsCap.goToTransfer,
						module: 'transfer',
					},
					textsCap.selectRecipient,
					textsCap.enterAmount,
					textsCap.submit
				],
				undefined,
				(
					<b>
						<br />
						<Icon className='no-margin' name='info circle' /> {textsCap.amountClaimable}
					</b>
				)
			),
			completed: taskStatus.transferred,
			question: (
				<span>
					{textsCap.transferToFriend + ' '}
					{taskStatus.transferred && checkMark}
				</span>
			),
		},
		{
			answer: getStepList([
				{
					children: textsCap.goToActivity,
					module: 'activity',
				},
				textsCap.clickCreate,
				textsCap.enterNameDesc,
				textsCap.submitActivity,
				textsCap.clickViewTeam,
				textsCap.addSelf,
			]),
			completed: taskStatus.activityDone,
			question: (
				<span>
					{textsCap.createActivity} {taskStatus.activityDone && checkMark}
				</span>
			),
		},
		{
			answer: getStepList([
				{
					children: textsCap.goToTimekeeping,
					module: 'timekeeping',
				},
				textsCap.clickTimer,
				textsCap.selectActivity,
				textsCap.clickStart,
				textsCap.waitAndStop,
				textsCap.clickDuration,
				textsCap.enterDuration,
				textsCap.clickSubmit,
				textsCap.clickProceed,
			]),
			completed: taskStatus.timekeepingDone,
			question: (
				<span>{textsCap.createTkRecord} {taskStatus.timekeepingDone && checkMark}</span>
			),
		},
		{
			answer: getStepList([
				{
					children: textsCap.goToTasks,
					module: 'tasks',
				},
			]),
			completed: true,
			question: <span>{textsCap.createTask} {false && checkMark}</span>,
		},
	]
	return tasks
}

const getStepList = (items = [], prefix = textsCap.followInstructions, suffix) => (
	<div>
		{prefix}
		<ul>
			{items.map((item, i) => {
				if (isStr(item) || isValidElement(item)) return <li key={i}>{item}</li>

				let { children, El = Button, module } = item || {}
				if (isStr(module)) {
					item.onClick = e => {
						e.preventDefault()
						// hide all modules other than these two
						setActiveExclusive(['claim-kapex', module], true)
					}
				}
				return (
					<li key={i}>
						<InvertibleMemo {...{
							...item,
							basic: true,
							children: <Text {...{ children }} />,
							El,
							size: 'mini',
						}} />
					</li>
				)
			})}
		</ul>
		{suffix}
	</div>
)

const getFormProps = rxSetState => {
	const reload = () => rxSetState.next({
		...rxSetState.value,
		inputs: inputs(),
	})

	const inputs = () => {
		const getSelected = () => identities.getSelected().address
		const { address: rewardsIdentity } = (storage.settings.module('messaging') || {})
			.user || {}
		const switchIdenity = !!identities.get(rewardsIdentity)
			&& rewardsIdentity !== getSelected()
		// If rewards identity is available it will be selected automatically.
		if (switchIdenity) identities.setSelected(rewardsIdentity)
		const taskIdentity = getSelected()
		// identity to complete the tasks with.

		const tasks = getTaskList(taskIdentity)
		const tasksCompleted = tasks.every(x => x.completed)
		return [
			{
				hidden: true,
				name: inputNames.rewardsIdentity,
				value: rewardsIdentity,
			},
			{
				hidden: true,
				name: inputNames.taskIdentity,
				value: taskIdentity,
			},
			{
				checked: tasksCompleted,
				disabled: true,
				label: (
					<div>
						{textsCap.tasksCompletedLabel + ' '}
						<Icon {...{
							className: 'no-margin',
							name: 'refresh',
							onClick: () => reload(),
							style: {
								// color: 'orange',
								cursor: 'pointer',
							},
						}} />
					</div>
				),
				name: inputNames.tasksCompleted,
				required: true,
				type: 'checkbox',
				value: tasksCompleted,
			},
			{
				content: (
					<div>
						<FAQ {...{ questions: tasks, exclusive: true }} />
						<br />
					</div>
				),
				name: inputNames.taskList,
				type: 'html',
			},
			{
				hidden: values => !values.tasksCompleted,
				label: 'Feedback',
				maxLength: 1000,
				minLength: 50,
				name: inputNames.feedback,
				placeholder: textsCap.feedbackPlaceholder,
				required: true,
				type: 'textarea',
			},
		]
	}

	return {
		...rxSetState.value,
		inputs: inputs(),
	}
}

export default function ClaimKAPEXView(props) {
	const [formProps, setFormProps] = iUseReducer(null, getFormProps)
	const [isRegistered] = useRxSubject(rxIsRegistered)
	const [status, setStatusOrg] = useState(() => ({ ...statusCached(), loading: true }))
	let { active, eligible, endDate, loading, message, startDate, submitted } = status

	const setStatus = useCallback((status) => {
		const now = new Date()
		const { endDate = now, error, loading, submitted } = status
		const content = !isRegistered
			? textsCap.errNotRegistered
			: !!error
				? error
				: submitted
					? textsCap.errAlreadySubmitted
					: endDate && new Date(endDate) < now
						? textsCap.errEnded
						: null
		return setStatusOrg({
			...status,
			message: !content
				? null
				: {
					content: !submitted && content,
					header: submitted && content,
					icon: true,
					status: submitted
						? statuses.SUCCESS
						: statuses.ERROR
				},
		})
	}, [isRegistered])
	
	useEffect(() => {
		let mounted = true
		const init = async () => {
			const doCheckStatus = !submitted && eligible !== false
			if (!doCheckStatus) return
			
			try {
				status.loading = doCheckStatus
				setStatus(status)
				await subjectAsPromise(rxIsLoggedIn, true)[0]
				const result = ClaimKAPEXView.resultCache
					? {
						...ClaimKAPEXView.resultCache,
						submitted: status.submitted,
					}
					: await chatClient
						.rewardsClaimKAPEX
						.promise(true)
				// store as in-memory cache
				ClaimKAPEXView.resultCache = result
				// console.log({result})
				Object
					.keys(result)
					.forEach(key => status[key] = result[key] )
			} catch (err) {
				status.error = `${err}`
			} finally {
				status.loading = false
				mounted && setStatus(status)		
			}
		}
		!isRegistered
			? setStatus(status)
			: init()
		return () => mounted = false
	}, [isRegistered, setStatus])

	if (!!message) return <Message {...message} />
	if (loading) return <Message {...{
		content: textsCap.loading,
		icon: true,
		status: statuses.LOADING,
	}} />

	return (
		<FormBuilder {...{
			...props,
			...formProps,
			inputsHidden: !message
				? props.inputsHidden
				: Object.values(inputNames),
			message: message || formProps.message || props.message,
			onSubmit: async (e, values) => {
				const { onSubmit } = props
				setFormProps({ submitInProgress: true })
				await chatClient.rewardsClaimKAPEX.promise(values)

				status.submitted = true
				statusCached(status)
				setStatus(status)

				setFormProps({ submitInProgress: false })
				isFn(onSubmit) && onSubmit(true, values)
			},
		}} />
	)
}
ClaimKAPEXView.defaultProps = {
	header: textsCap.header,
}
