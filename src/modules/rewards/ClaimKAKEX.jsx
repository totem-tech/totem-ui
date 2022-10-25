import React, { isValidElement, useCallback, useEffect, useState } from 'react'
import { Button, Icon } from 'semantic-ui-react'
import { subjectAsPromise, useRxSubject } from '../../utils/reactHelper'
import { arrUnique, isFn, isInteger, isObj, isStr, objClean, objToUrlParams } from '../../utils/utils'
import FAQ from '../../components/FAQ'
import FormBuilder from '../../components/FormBuilder'
import { getAll as getHistory, limit, rxHistory } from '../history/history'
import identities from '../identity/identity'
import partners from '../partner/partner'
import chatClient, { rxIsLoggedIn, rxIsRegistered } from '../../utils/chatClient'
import storage from '../../utils/storageHelper'
import { translated } from '../../utils/languageHelper'
import Message, { statuses } from '../../components/Message'
import { setActiveExclusive } from '../../services/sidebar'
import { BLOCK_DURATION_SECONDS, durationToSeconds } from '../../utils/time'

let textsCap = {
	addIdentity: 'add identity shared by a friend',
	addSelf: 'add yourself as a team member by clicking on the "Add myself" button.',
	amountClaimable: 'amount transferred will not affect the amount claimable.',
	checkNotification: 'check your notification to see if your friend shared their identity with you and add their them as partner by clicking on "Add partner" button.',
	clickCreate: 'click on the "Create" button.',
	clickDuration: 'click on "Manually enter duration"',
	clickProceed: 'click on the "Proceed" button',
	clickRequest: 'click on the "Request" button.',
	clickStart: 'click on the "Start" button',
	clickSubmit: 'click on the "Submit" button',
	clickTimer: 'click on the "Timer" button.',
	clickToRefresh: 'click to refresh',
	clickViewTeam: 'click on the "Add/view team members" button.',
	createActivity: 'create an Activity',
	createTask: 'create a task',
	createTkRecord: 'create a timekeeping record',
	enterAmount: 'enter any amount you wish to send.',
	enterDuration: 'enter a duration of three hours (03:00:00) or greater.',
	enterFriendUserId: `Enter your friend's Totem User ID in the "User" field`,
	enterNameDesc: 'enter any name and description for the activity.',
	enterReason: 'select or enter a custom reason',
	errAlreadySubmitted: 'You have already submitted your claim.',
    errEnded: 'Claim period has ended!',
    errInactive: 'Claim period is over!',
	errIneligible: 'You are not eligible to claim KAPEX!',
	errNotRegistered: 'please complete registration in the getting started module',
	feedbackLabel: 'enter your feedback',
	feedbackPlaceholder: 'please enter your feedback about the Totem.Live testnet application including any bug report (between 50 and 1000 characters)',
	fillTaskForm: 'fill up all the required fields',
	followInstructions: 'follow instruction below to complete the task:',
	header: 'claim KAPEX',
	goToActivity: 'go to Activities module',
	goToPartners: 'go to Partners module',
	goToTasks: 'go to Tasks module',
	goToTimekeeping: 'go to Timekeeping module',
	goToTransfer: 'go to Transfer module',
	loading: 'loading...',
	requestIdentity: 'request identity from a friend',
	selectActivity: 'select an activity.',
	selectRecipient: 'select your friend from the recipient DropDown list',
	submit: 'submit',
	submitActivity: 'submit and wait until Activity is successfully created.',
	taskCompleted: 'you have completed this task',
	tasksCompletedLabel: 'in order claim KAPEX you must complete the following tasks:',
	transferToFriend: 'transfer any amount to one of your friend',
	waitAndStop: 'wait a few seconds and then click on the "stop" button',
}
textsCap = translated(textsCap, true)[1]

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
	// set history limit to 100 or higer
	const lim = limit() || 500
	if (lim < 100) limit(100)
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
	console.log({partnerIds})
	const partnerRequested = partnerIds.length > 0
	const allPartners = partners.getAll()
	const partnersAdded = Array.from(allPartners)
		.map(([_, p]) => partnerIds.includes(p.userId) && p)
		.filter(Boolean)

	const taskStatus = {
		partnersAdded: partnersAdded.length > 0,
	}

	historyArr2d.forEach(([_, historyItem]) => {
		const { action, data = [], identity, status } = historyItem
		const [recipient] = data

		if (taskIdentity !== identity || status !== 'success') return
		// check blockchain transaction releated tasks
		switch (action) {
			case 'api.tx.projects.addNewProject':
				taskStatus.activityDone = true
				break
			case 'api.tx.orders.createSpfso':
				taskStatus.taskCreated = true
				break
			case 'api.tx.transfer.networkCurrency':
				taskStatus.transferred = taskStatus.transferred
					|| !!partnersAdded.find(x => x.address === recipient)
					|| !!allPartners.get(recipient)
				break
			case 'api.tx.timekeeping.submitTime':
				if (taskStatus.timekeepingDone) break
				const numBlocks = data[7] - data[6]
				if (!isInteger(numBlocks)) break

				const minSeconds = durationToSeconds('03:00:00')
				const seconds = numBlocks * BLOCK_DURATION_SECONDS
				taskStatus.timekeepingDone = seconds >= minSeconds
				break
		}
	})

	const checkMark = (
		<Icon {...{
			color: 'green',
			name: 'check circle',
			title: textsCap.taskCompleted,
		}} />
	)
	const tasks = [
		{
			answer: getStepList([
				{
					content: textsCap.goToPartners,
					module: 'partners',
				},
				textsCap.clickRequest,
				textsCap.enterFriendUserId,
				textsCap.enterReason,
				textsCap.submit,
			]),
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
						content: textsCap.goToTransfer,
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
					content: textsCap.goToActivity,
					module: 'activities',
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
					content: textsCap.goToTimekeeping,
					module: 'timekeeping',
				},
				textsCap.clickTimer,
				// textsCap.selectActivity,
				// textsCap.clickStart,
				// textsCap.waitAndStop,
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
					content: textsCap.goToTasks,
					module: 'tasks',
				},
				textsCap.clickCreate,
				textsCap.fillTaskForm,
				textsCap.clickSubmit,
			]),
			completed: taskStatus.taskCreated,
			question: <span>{textsCap.createTask} {taskStatus.taskCreated && checkMark}</span>,
		},
	]
	return tasks
}

/**
 * @name	quotedToBold
 * @summary	embolden quoted texts
 * 
 * @param	{String}	str
 * @param	{RegExp}	regex		Regular expression to match texts to be embolden.
 * 									Default: regex that matches quoted texts
 * @param	{Boolean}	reactSafe	If truthy, <React.Fragment /> with index as key will be used to avoid errors
 * 									when using on the DOM/JSX
 * 
 * @example 
 * ```javascript
 * embolden('This is "quoted" text', undefined, false)
 * 
 * // Result: ['This is ', <b>"quoted"</b>, ' text']
 * ```
 * 
 * @returns {Array}
 */
const embolden = (str, regex = /"[^"]+"/g, reactSafe = true) => {
	if (!isStr(str)) return str

	const matches = str.match(regex)
	let arr = [str]
	if (matches) {
		const replacements = matches.map(quoted => <b>{quoted}</b>)
		matches.forEach((quoted, i) => {
			arr = arr.map(s =>
				s.split(quoted).map((x, j) =>
					j === 0
						? [x]
						: [replacements[i], x])
					
			)
				.flat()
				.flat()
		})
	}
	return !reactSafe
		? arr
		: arr.map((x, i) =>
			<React.Fragment {...{
				children: x,
				key: i
			}} />
		)
}

const getStepList = (items = [], prefix = textsCap.followInstructions, suffix) => (
	<div>
		{prefix}
		<ul>
			{items.map((item, i) => {
				if (isStr(item) || isValidElement(item)) return (
					<li key={i}>
						{isStr(item)
							? embolden(item)
							: item}
					</li>
				)

				let { module, url } = item || {}
				if (isStr(module)) {
					item.onClick = e => {
						e.preventDefault()
						// hide all modules other than these two
						setActiveExclusive(['claim-kapex', module], true)
					}
					const { location: { host, protocol } } = window
					const params = {
						module,
						exclusive: true,
					}
					url = [
						`${protocol}//`,
						host,
						`?${objToUrlParams(params)}`
					].join('')
				}
				const iconBtn = isStr(module) && (
					<Button {...{
						as: 'a',
						icon: 'forward mail',
						href: url,
						size: 'tiny',
						target: '_blank',
					}} />
				)

				return (
					<li key={i}>
						<Button {...{
							...item,
							icon: <Icon name='hand point right' />,
							size: 'tiny',
						}} />
						{iconBtn}
					</li>
				)
			})}
		</ul>
		{suffix}
	</div>
)

const getFormProps = () => {
	const { address: selectedIdentitty } = identities.getSelected()
	const { address: rewardsIdentity } = (storage.settings.module('messaging') || {})
		.user || {}
	const switchIdenity = !!identities.get(rewardsIdentity)
		&& rewardsIdentity !== selectedIdentitty
	// If rewards identity is available it will be selected automatically.
	if (switchIdenity) identities.setSelected(rewardsIdentity)
	const taskIdentity = selectedIdentitty
	// identity to complete the tasks with.

	const tasks = getTaskList(taskIdentity)
	const tasksCompleted = tasks.every(x => x.completed)
	const inputs = [
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
			hidden: tasksCompleted,
			label: (
				<div>
					{textsCap.tasksCompletedLabel + ' '}
					{/* <Icon {...{
						className: 'no-margin',
						name: 'refresh',
						onClick: () => reload(),
						style: {
							// color: 'orange',
							cursor: 'pointer',
						},
						title: textsCap.clickToRefresh,
					}} /> */}
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
			hidden: !tasksCompleted,
			label: textsCap.feedbackLabel,
			maxLength: 1000,
			minLength: 50,
			name: inputNames.feedback,
			placeholder: textsCap.feedbackPlaceholder,
			required: true,
			type: 'textarea',
		},
	]
	console.log({inputs})

	return {
		inputs,
		submitInProgress: false,
		success: false,
	}
}

export default function ClaimKAPEXView(props) {
	const [status, setStatusOrg] = useState(() => ({ ...statusCached(), loading: true }))
	const [formProps, setFormProps] = useRxSubject(rxHistory, getFormProps)
	const [isRegistered] = useRxSubject(rxIsRegistered)
	let { eligible, loading, message, submitted } = status

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

				setFormProps({ submitted: true, submitInProgress: false })
				isFn(onSubmit) && onSubmit(true, values)
			},
		}} />
	)
}
ClaimKAPEXView.defaultProps = {
	header: textsCap.header,
}
