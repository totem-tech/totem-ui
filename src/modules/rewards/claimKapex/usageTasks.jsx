import React, { isValidElement } from 'react'
import { Button, Icon, Step } from 'semantic-ui-react'

import { getUser } from '../../../utils/chatClient'
import { translated } from '../../../utils/languageHelper'
import { useRxSubject } from '../../../utils/reactHelper'
import {
	BLOCK_DURATION_SECONDS,
	durationToSeconds,
} from '../../../utils/time'
import {
	arrUnique,
	isInteger,
	isObj,
	isStr,
	objToUrlParams,
	objWithoutKeys,
} from '../../../utils/utils'
import { Embolden } from '../../../components/StringReplace'
import { setActiveExclusive, setContentProps } from '../../../services/sidebar'
import { MOBILE, rxLayout } from '../../../services/window'
import { getAll as getHistory, limit } from '../../history/history'
import partners from '../../partner/partner'
import { listTypes } from '../../task/TaskList'
import { statusCached } from './claimKapex'
import { confirm } from '../../../services/modal'

let textsCap = {
	addIdentity: 'add identity shared by a friend',
	addSelf: 'add yourself as a team member by clicking on the "Add myself" button.',
	amountClaimable: 'amount transferred will not affect the amount claimable.',
	checkNotification: 'check your notification to see if your friend shared their identity with you and add their them as partner by clicking on "Add partner" button.',
	clickCreate: 'click on the "Create" button.',
	clickDuration: 'click on "Manually enter duration"',
	clickProceed: 'click on the "Proceed" button',
	clickRequest: 'click on the "Request" button.',
	clickSubmit: 'click on the "Submit" button',
    clickTimer: 'click on the "Timer" button.',    
    clickViewTeam: 'click on the "Add/view team members" button. Or click on the view team icon under the "Actions" column.',    
	createActivity: 'create an Activity',
	createTask: 'create a task',
	createTkRecord: 'create a timekeeping record',
	enterAmount: 'enter any amount you wish to send.',
	enterDuration: 'enter a duration greater or equal to three hours',
	enterDuration2: '03:00:00',
	enterFriendUserId: `Enter your friend's Totem User ID in the "User" field`,
	enterNameDesc: 'enter any name and description for the activity.',
	enterReason: 'select or enter a custom reason',    
    fillTaskForm: 'fill up all the required fields',    
	followInstructions: 'follow instruction below to complete the task:',
	goToActivity: 'go to Activities module',
	goToPartners: 'go to Partners module',
	goToTasks: 'go to Tasks module',
	goToTimekeeping: 'go to Timekeeping module',
	goToTransfer: 'go to Transfer module',
	openTab: 'open in a new tab?',
	requestIdentity: 'request identity from a friend',
	selectActivity: 'select the activity you just created',
	selectRecipient: 'select your friend from the recipient DropDown list',
	step1Title: 'test the DApp',
	step2Title: 'post a Tweet',
	step3Title: 'claim KAPEX',
    submit: 'submit',    
	submitActivity: 'submit and wait until Activity is successfully created.',
    taskCompleted: 'Well done! You have completed this task.',
	taskIncomplete: 'you have not completed this task',
    transferToFriend: 'transfer any amount to one of your friends',
}
textsCap = translated(textsCap, true)[1]

export const getUsageTasks = rewardIdentity => {
	let { endDate, startDate } = statusCached()
	const { id: currentUserId } = getUser() || {}
	// set history limit to 100 or higer
	const lim = limit() || 500
	if (lim < 100) limit(100)
	const historyArr2d = Array.from(getHistory())
	// list of user IDs who were requested to shared their identity by current user
	const partnerIds = arrUnique(
		historyArr2d
			.map(([_, historyItem]) => {
				const {
					action = '',
					data = [],
					timestamp,
					userId,
				} = historyItem || {}
				const [
					userIds = [],
					type,
					childType,
				] = data || []
				const entryEligible = startDate < timestamp
					&& timestamp < endDate
					&& userId === currentUserId
				
				return entryEligible
					&& action === 'client.notify'
					&& type === 'identity'
					&& childType === 'request'
					&& userIds
			})
			.flat()
			.filter(Boolean)
	)
	const partnerRequested = partnerIds.length > 0
	const allPartners = partners.getAll()
	const partnersAdded = Array.from(allPartners)
		.map(([_, p]) => partnerIds.includes(p.userId) && p)
		.filter(Boolean)

	const taskStatus = {
		partnersAdded: partnersAdded.length > 0,
	}
	const activityDone = [
		false, // activity created
		false, // added self as team member
	]

	historyArr2d.forEach(([_, historyItem]) => {
		const {
			action,
			data = [],
			identity,
			status,
			timestamp,
			userId,
		} = historyItem
		const [recipient] = data

		const entryEligible = rewardIdentity === identity
			&& startDate < timestamp
			&& timestamp < endDate
			&& status === 'success'
			&& userId === currentUserId
		if (!entryEligible) return

		// check blockchain transaction releated tasks
		switch (action) {
			case 'api.tx.projects.addNewProject':
				// create a new activity/project
				activityDone[0] = true
				break
			case 'api.tx.orders.createSpfso':
				// create a new task
				taskStatus.taskCreated = true
				break
			case 'api.tx.transfer.networkCurrency':
				// transfer funds
				taskStatus.transferred = taskStatus.transferred
					|| !!partnersAdded.find(x => x.address === recipient)
					|| !!allPartners.get(recipient)
				break
			case 'api.tx.timekeeping.notifyProjectWorker': 
				// add members to activity
				activityDone[1] = true
				break
			case 'api.tx.timekeeping.submitTime':
				// create new time record
				if (taskStatus.timekeepingDone) break
				const numBlocks = data[4]
				if (!isInteger(numBlocks)) break

				const minSeconds = durationToSeconds('03:00:00')
				const seconds = numBlocks * BLOCK_DURATION_SECONDS
				taskStatus.timekeepingDone = seconds >= minSeconds
				break
		}
	})
	taskStatus.activityDone = activityDone.every(Boolean)

	const icon = (name, title, color) => (
		<React.Fragment>
			<Icon {...{
				className: 'no-margin',
				color,
				name,
				title,
			}} />{' '}
		</React.Fragment>
	)
	const checkIcon = icon(
		'check circle',
		textsCap.taskCompleted,
		'green',
	)
	const circleIcon = icon(
		'circle outline',
		textsCap.taskIncomplete,
	)
	const tasks = [
		{
			answer: getUsageInstructions([
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
					{partnerRequested ? checkIcon : circleIcon}
					{textsCap.requestIdentity + ' '}
				</span>
			),
		},
		{
			answer: getUsageInstructions([
				textsCap.checkNotification,
			]),
			completed: taskStatus.partnersAdded,
			question: (
				<span>
					{taskStatus.partnersAdded ? checkIcon : circleIcon}
					{textsCap.addIdentity + ' '}
				</span>
			),
		},
		{
			answer: getUsageInstructions(
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
					<b style={{ color: 'deeppink' }}>
						<br />
						<Icon className='no-margin' name='info circle' /> {textsCap.amountClaimable}
					</b>
				)
			),
			completed: taskStatus.transferred,
			question: (
				<span>
					{taskStatus.transferred ? checkIcon : circleIcon}
					{textsCap.transferToFriend + ' '}
				</span>
			),
		},
		{
			answer: getUsageInstructions([
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
					{taskStatus.activityDone ? checkIcon : circleIcon}
					{textsCap.createActivity}
				</span>
			),
		},
		{
			answer: getUsageInstructions([
				{
					content: textsCap.goToTimekeeping,
					module: 'timekeeping',
				},
				textsCap.clickTimer,
				textsCap.selectActivity,
				textsCap.clickDuration,
				`${textsCap.enterDuration} "${textsCap.enterDuration2}"`,
				textsCap.clickSubmit,
				textsCap.clickProceed,
			]),
			completed: taskStatus.timekeepingDone,
			question: (
				<span>
					{taskStatus.timekeepingDone ? checkIcon : circleIcon}
					{textsCap.createTkRecord}
				</span>
			),
		},
		{
			answer: getUsageInstructions([
				{
					content: textsCap.goToTasks,
					module: 'tasks',
					moduleProps: {
						tab: listTypes.owner,
					},
				},
				textsCap.clickCreate,
				textsCap.fillTaskForm,
				textsCap.clickSubmit,
			]),
			completed: taskStatus.taskCreated,
			question: (
				<span>
					{taskStatus.taskCreated ? checkIcon : circleIcon}
					{textsCap.createTask}
				</span>
			),
		},
	]
	return tasks
}

const getUsageInstructions = (items = [], prefix = textsCap.followInstructions, suffix) => (
	<div>
		{prefix}
		<ul>
			{items.map((item, i) => {
				if (isStr(item) || isValidElement(item)) return (
					<li key={i}>
						<Embolden>{item}</Embolden>
					</li>
				)

				let { module, moduleProps, url } = item || {}
				if (isStr(module)) {
					item.onClick = e => {
						e.preventDefault()
						// hide all modules other than these two
						isObj(moduleProps) && setContentProps(module, moduleProps)
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
						onClick: e => {
							e.preventDefault()
							confirm({
								content: textsCap.openTab,
								onConfirm: () => window.open(url, '_blank'),
								size: 'mini',
							})
						},
						size: 'tiny',
						target: '_blank',
					}} />
				)

				return (
					<li key={i}>
						<Button {...{
							...objWithoutKeys(item, ['moduleProps']),
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
export const StepGroup = React.memo(({ rxStep, steps }) => {
	const [isMobile] = useRxSubject(rxLayout, l => l === MOBILE)
    const [stepArr] = useRxSubject(rxStep, activeStep => [
		{
			active: activeStep === steps.tasks,
			icon: 'play',
			key: steps.tasks,
			title: textsCap.step1Title,
		},
		{
			active: activeStep === steps.tweet,
			disabled: false,
			icon: 'twitter',
			key: steps.tweet,
			title: textsCap.step2Title,
		},
		{
			active: activeStep === steps.feedback,
			icon: 'gift',
			key: steps.feedback,
			title: textsCap.step3Title,
		},
    ])

	const getStep = step => (
		<Step {...{
			...step,
			icon: (
				<Icon {...{
					className: isMobile && !step.active 
						? 'no-margin'
						: '',
					name: step.icon,
					style: {
						fontSize: isMobile
							? 18
							: undefined,
						color: step.active
							? 'deeppink'
							: 'grey',
					}
				}} />
			),
			title: isMobile && !step.active
				? ''
				: (
					<span style={{color: step.active ? 'deeppink' : undefined}}>
						{step.title}
					</span>
				),
		}} /> 
	)
	return (
		<Step.Group fluid={true} unstackable>
			{stepArr.map(getStep)}
		</Step.Group>
	)
})