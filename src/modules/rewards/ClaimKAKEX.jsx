import React, { isValidElement, useCallback, useEffect, useState } from 'react'
import { Button, Icon, Step } from 'semantic-ui-react'
import { BehaviorSubject, Subject } from 'rxjs'
import uuid from 'uuid'
import chatClient, { getUser, rxIsLoggedIn, rxIsRegistered } from '../../utils/chatClient'
import { translated } from '../../utils/languageHelper'
import { subjectAsPromise, unsubscribe, useRxSubject } from '../../utils/reactHelper'
import storage from '../../utils/storageHelper'
import { BLOCK_DURATION_SECONDS, durationToSeconds } from '../../utils/time'
import { arrUnique, clearClutter, deferred, isFn, isInteger, isObj, isStr, objClean, objToUrlParams } from '../../utils/utils'
import FAQ from '../../components/FAQ'
import FormBuilder, { fillValues, findInput } from '../../components/FormBuilder'
import Message, { statuses } from '../../components/Message'
import { setActiveExclusive } from '../../services/sidebar'
import { getAll as getHistory, limit, rxHistory } from '../history/history'
import identities, { rxIdentities, rxSelected } from '../identity/identity'
import partners from '../partner/partner'
import Embolden from '../../components/Embolden'
import PromisE from '../../utils/PromisE'
import { MOBILE, rxLayout } from '../../services/window'
import { keyring } from '../../utils/polkadotHelper'
import { bytesToHex, isHex } from 'web3-utils'

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
	continue: 'continue',
	createActivity: 'create an Activity',
	createTask: 'create a task',
	createTkRecord: 'create a timekeeping record',
	enterAmount: 'enter any amount you wish to send.',
	enterDuration: 'enter a duration greater or equal to three hours',
	enterDuration2: '03:00:00',
	enterFriendUserId: `Enter your friend's Totem User ID in the "User" field`,
	enterNameDesc: 'enter any name and description for the activity.',
	enterReason: 'select or enter a custom reason',
	errSubmitted: 'your claim has been received!',
	errSubmittedDetails: 'make sure to remind your friends to submit their claim.', 
	errEnded: 'Claim period has ended!',
	errIneligible: 'You are not eligible to claim KAPEX.',
	errInvalidTweetUrl: 'invalid Tweet URL',
	errRewardId404: 'reason: missing reward identity',
	errNotRegistered: 'please complete registration in the getting started module',
	feedbackLabel: 'enter your feedback',
	feedbackPlaceholder: 'please enter your feedback about the Totem.Live testnet application including any bug report (between 50 and 1000 characters)',
	fillTaskForm: 'fill up all the required fields',
	followInstructions: 'follow instruction below to complete the task:',
	header: 'claim KAPEX',
	historyWarning: 'DO NOT remove history items before submitting your claim!',
	goToActivity: 'go to Activities module',
	goToPartners: 'go to Partners module',
	goToTasks: 'go to Tasks module',
	goToTimekeeping: 'go to Timekeeping module',
	goToTransfer: 'go to Transfer module',
	loading: 'loading...',
	requestIdentity: 'request identity from a friend',
	rewardIdLabel: 'your reward identity',
	rewardIdLabelDetails: 'this is the identity you need to complete the tasks with',
	selectActivity: 'select an activity.',
	selectRecipient: 'select your friend from the recipient DropDown list',
	step1Title: 'test the DApp',
	step2Title: 'post a Tweet',
	step3Title: 'claim KAPEX',
	submit: 'submit',
	submitActivity: 'submit and wait until Activity is successfully created.',
	successMsg0: 'claim submitted successfully',
	successMsg1: 'we have received your claim and will go through them in due time.',
	successMsg2: 'read terms and condition for KAPEX migration',
	taskCompleted: 'Well done! You have completed this task.',
	taskIncomplete: 'you have not completed this task',
	tasksListTitle: 'in order claim KAPEX you must complete the following tasks using your reward identity:',
	transferToFriend: 'transfer any amount to one of your friend',
	tweetedBtn: 'post a tweet',
	tweetBtnDesc: 'Post a tweet to spread the word about the Totem KAPEX migration. In order for you to be eligible for referral rewards users you have referred MUST also submit their claim and be accepted.',
	tweetUrlLabel: 'Tweet ID',
	tweetUrlPlaceholder: 'paste the URL of the Tweet',
	waitAndStop: 'wait a few seconds and then click on the "stop" button',
}
textsCap = translated(textsCap, true)[1]

export const inputNames = {
	feedback: 'feedback',
	rewardsIdentity: 'rewardsIdentity',
	signature: 'signature',
	step: 'step',
	token: 'token',
	tasksCompleted: 'taskList',
	tweetBtn: 'tweetBtn',
	tweetUrl: 'tweetUrl',
}

const steps = {
	tasks: 'tasks',
	tweet: 'tweet',
	feedback: 'feedback',
}

const getRewardIdentity = () => { 
	const {
		user: {
			address: rewardsIdentity
		} = {},
	} = storage.settings.module('messaging') || {}
	return rewardsIdentity
}

// invoke with status object to save to storage
const getStatusCached = status => storage.cache(
	'rewards',
	'KAPEXClaimStatus',
	isObj(status)
		? objClean(status, [ // only store these values in the localStorage
			'eligible',
			'endDate',
			'startDate',
			'submitted',
		])
		: undefined,
) || {}

export const getTasks = rewardIdentity => {
	let { endDate, startDate } = getStatusCached()
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
				const numBlocks = data[7] - data[6]
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
			answer: getTaskSteps([
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
			answer: textsCap.checkNotification,
			answer: getTaskSteps([
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
			answer: getTaskSteps(
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
					{taskStatus.transferred ? checkIcon : circleIcon}
					{textsCap.transferToFriend + ' '}
				</span>
			),
		},
		{
			answer: getTaskSteps([
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
			answer: getTaskSteps([
				{
					content: textsCap.goToTimekeeping,
					module: 'timekeeping',
				},
				textsCap.clickTimer,
				// textsCap.selectActivity,
				// textsCap.clickStart,
				// textsCap.waitAndStop,
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
			answer: getTaskSteps([
				{
					content: textsCap.goToTasks,
					module: 'tasks',
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

const getTaskSteps = (items = [], prefix = textsCap.followInstructions, suffix) => (
	<div>
		{prefix}
		<ul>
			{items.map((item, i) => {
				if (isStr(item) || isValidElement(item)) return (
					<li key={i}>
						<Embolden>{item}</Embolden>
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
const StepGroup = ({rxStep}) => {
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
}

const updateTasks = inputs => {
	const rewardIdIn = findInput(inputs, inputNames.rewardsIdentity)
	const signatureIn = findInput(inputs, inputNames.signature)
	const stepIn = findInput(inputs, inputNames.step)
	const tasksIn = findInput(inputs, inputNames.tasksCompleted)
	const tokenIn = findInput(inputs, inputNames.token)
	const tweetBtn = findInput(inputs, inputNames.tweetBtn)
	const selectedIdentity = rxSelected.value
	const rewardIdentity = getRewardIdentity()
	const switchIdenity = !!identities.get(rewardIdentity)
		&& rewardIdentity !== selectedIdentity
	rewardIdIn.rxValue.next(rewardIdentity)
	// If rewards identity is available it will be selected automatically.
	if (switchIdenity) identities.setSelected(rewardIdentity)

	const tasks = getTasks(rewardIdentity)
	const tasksCompleted = tasks.every(x => x.completed)
	tasksIn.content = (
		<div>
			<h4 className='no-margin'>{textsCap.tasksListTitle + ' '}</h4>
			<small style={{ color: 'deeppink' }}>
				<b>({textsCap.historyWarning})</b>
			</small>
			<FAQ {...{
				questions: tasks,
				exclusive: true,
			}} />
			<br />
		</div>
	)
	tasksIn.rxValue.next(tasksCompleted)

	const curStep = stepIn.rxValue.value
	const step = !tasksCompleted
		? steps.tasks
		: curStep && curStep !== steps.tasks
			? curStep
			: steps.tweet
	stepIn.rxValue.next(step)

	// set Tweet button
	const { endDate } = getStatusCached()
	const diffMs = new Date(endDate || undefined) - new Date()
	let count = Math.floor(diffMs / 1000 / 60 / 60 / 24)
	let title = 'days'
	if (count < 1) {
		title = 'hours'
		count = Math.floor(diffMs / 1000 / 60 / 60)
	}
	const tweetText = encodeURIComponent(
		`Only ${count} ${title} @totem_live_ to claim $KAPEX for your testnet $TOTEM rewards!`
		+ '\n\nIf you have participated in the Totem rewards campaign you must complete the claim process to be '
		+ 'eligible to migrate your reward tokens to $KAPEX.'
		+ '\n\nSubmit your claim now!\nhttps://totem.live?module=claim-kapex'
	)
	const href = `https://twitter.com/intent/tweet?button_hashtag=share&text=${tweetText}`
	tweetBtn.content = (
		<p>
			{textsCap.tweetBtnDesc}
			<Button {...{
				as: 'a',
				content: textsCap.tweetedBtn,
				href,
				onClick: e => {
					e.preventDefault()
					window.open(href, '_blank')
				},
				target: '_blank',
			}} />
		</p>
	)

	// generate a token for this request
	// ToDo: use fingerprint token
	tokenIn.rxValue.next(uuid.v1())

	// generate and attach signature
	const address = getRewardIdentity()
	const { uri } = identities.get(address) || {}
	if (isStr(uri) && !isHex(uri)) {
		keyring.add([identities.get(address).uri])
		const pair = keyring.getPair(address)
		const signature = bytesToHex(pair.sign(tokenIn.rxValue))
		signatureIn.rxValue.next(signature)
	}
	return inputs
}

const getFormProps = () => {
	const checkTweetStep = values => !values[inputNames.tasksCompleted]
		|| values[inputNames.step] !== steps.tweet
	const checkTasksStep = values => !!values[inputNames.tasksCompleted]
	const checkFeedbackStep = values => !values[inputNames.tasksCompleted]
		|| values[inputNames.step] !== steps.feedback
	const rxStep = new BehaviorSubject()
	const inputs = [
		{
			content: <StepGroup {...{ rxStep }} />,
			disabled: true,
			name: inputNames.step,
			required: true,
			rxValue: rxStep,
			type: 'html',
		},
		{
			content: '',
			hidden: checkTasksStep,
			name: inputNames.tasksCompleted,
			rxValue: new BehaviorSubject(false),
			type: 'html',
		},
		{
			hidden: checkTasksStep,
			label: textsCap.rewardIdLabel,
			labelDetails: (
				<b style={{ color: 'deeppink' }}>
					{textsCap.rewardIdLabelDetails}
				</b>
			),
			name: inputNames.rewardsIdentity,
			options: [],
			readOnly: true,
			rxOptions: rxIdentities,
			rxOptionsModifier: identitiesMap => Array
				.from(identitiesMap)
				.map(([value, { name }]) => ({
					key: value,
					text: <b>{name}</b>,
					value,
				})),
			selection: true,
			rxValue: new BehaviorSubject(),
			type: 'dropdown',
		},
		{
			hidden: checkTweetStep,
			name: inputNames.tweetBtn,
			rxValue: new BehaviorSubject(),
			type: 'html',
		},
		{
			hidden: checkTweetStep,
			placeholder: textsCap.tweetUrlPlaceholder,
			icon: 'twitter',
			iconPosition: 'left',
			name: inputNames.tweetUrl,
			label: textsCap.tweetUrlLabel,
			placeholder: textsCap.tweetUrlPlaceholder,
			required: true,
			type: 'url',
			validate: (_, { value }) => {
				const url = new URL(value)
				const pathArr = url.pathname.split('/')
				const invalid = url.hostname !== 'twitter.com'
					|| pathArr[2] !== 'status'
					|| !new RegExp(/^[0-9]{19}$/).test(pathArr[3])
				return invalid && textsCap.errInvalidTweetUrl
			}
		},
		{
			hidden: checkFeedbackStep,
			label: textsCap.feedbackLabel,
			maxLength: 1000,
			minLength: 50,
			name: inputNames.feedback,
			placeholder: textsCap.feedbackPlaceholder,
			required: true,
			type: 'textarea',
			validate: (_, { value }, values) => value.includes(values[inputNames.tweetUrl])	,
		},
		{
			hidden: true,
			name: inputNames.token,
			required: true,
			rxValue: new BehaviorSubject(),
		},
		{
			hidden: true,
			name: inputNames.signature,
			required: true,
			rxValue: new BehaviorSubject(),
		},
	]

	return {
		inputs: updateTasks(inputs),
		submitInProgress: false,
		success: false,
	}
}

export default function ClaimKAPEXView(props) {
	const [status, setStatusOrg] = useState(() => ({ ...getStatusCached(), loading: false }))
	const [state, setState] = useRxSubject(null, getFormProps, {}, true)
	const [isRegistered] = useRxSubject(rxIsRegistered)
	const [values, setValues] = useState({})
	let { eligible, loading, message, submitted } = status

	const setStatus = useCallback((status) => {
		const now = new Date()
		const { endDate = now, error, submitted } = status
		const content = !isRegistered
			? textsCap.errNotRegistered
			: !!error
				? error
				: submitted
					? textsCap.errSubmitted
					: endDate && new Date(endDate) < now
						? textsCap.errEnded
						: null
		
		return setStatusOrg({
			...status,
			message: !content
				? null
				: {
					content: submitted
						? (
							<div>
								{textsCap.errSubmittedDetails + ' '}
								
								<a href='https://docs.totemaccounting.com/#/totem/terms'>
									{textsCap.successMsg2}
								</a>
							</div>
						)
						: content,
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
			status.loading = true
			setStatus({ ...status })

			// wait until user is logged in
			await subjectAsPromise(rxIsLoggedIn, true)[0]

			// makes sure reward identity is saved to storage
			await PromisE.delay(100)
			
			const rewardId = identities.get(getRewardIdentity())
			// check if the reward identity exists in the identities module
			if (!rewardId) throw `${textsCap.errIneligible} ${textsCap.errRewardId404}`

			const doCheckStatus = !submitted && eligible !== false
			if (!doCheckStatus) return

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
			Object
				.keys(result)
				.forEach(key => status[key] = result[key])

			getStatusCached(status)
			setState(getFormProps())
		}
		isRegistered && init()
			.catch(err => status.error = `${err}`)
			.finally(() => {
				status.loading = false
				mounted && setStatus({...status})
			})
		
		return () => mounted = false
	}, [isRegistered, setStatus])

	useEffect(() => {
		let mounted = true
		const history = rxHistory.subscribe(deferred(() => {
			mounted && setState({
				inputs: updateTasks(state.inputs),
			})
		}, 200))
		return () => {
			mounted = false
			unsubscribe(history)
		}
	}, [setState, state])

	if (!!message) return <Message {...message} />
	if (loading) return <Message {...{
		content: textsCap.loading,
		icon: true,
		status: statuses.LOADING,
	}} />

	let submitText, onSubmit
	switch (values[inputNames.step]) {
		case steps.tasks:
			submitText = null
			break
		case steps.tweet:
			submitText = textsCap.continue
			onSubmit = () => {
				// continue to feedback step
				const { rxValue } = findInput(state.inputs, inputNames.step) || {}
				rxValue && rxValue.next(steps.feedback)
			}
			break
		case steps.feedback:
			onSubmit = async (e, values) => {
				const message = {}
				try {
					const { onSubmit } = props
					setState({
						message: null,
						submitInProgress: true,
					})
					await chatClient.rewardsClaimKAPEX.promise(values)

					status.submitted = true
					getStatusCached(status)
					// setStatus(status)

					isFn(onSubmit) && onSubmit(true, values)
					message.status = statuses.SUCCESS
					message.header = textsCap.successMsg0
					message.content = (
						<div>
							{textsCap.successMsg1 + ' '}
							<a href='https://docs.totemaccounting.com/#/totem/terms'>
								{textsCap.successMsg2}
							</a>
						</div>
					)
				} catch (err) {
					message.status = statuses.ERROR
					message.content = `${err}`
				} finally {
					setState({
						message,
						success: message.status !== statuses.ERROR,
						submitInProgress: false
					})
				}
			}
			break
	}
	
	return (
		<FormBuilder {...{
			...props,
			...state,
			inputsHidden: !message
				? props.inputsHidden
				: Object.values(inputNames),
			message: message || state.message || props.message,
			onChange: (_, values) => setValues({...values}),
			onSubmit,
			submitText,
		}} />
	)
}
ClaimKAPEXView.defaultProps = {
	header: textsCap.header,
}
