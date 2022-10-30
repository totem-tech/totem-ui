import React, { useCallback, useEffect, useState } from 'react'
import { Button } from 'semantic-ui-react'
import { BehaviorSubject } from 'rxjs'
import uuid from 'uuid'
import chatClient, {
	rxIsLoggedIn,
} from '../../../utils/chatClient'
import { bytesToHex } from '../../../utils/convert'
import { translated } from '../../../utils/languageHelper'
import { keyring } from '../../../utils/polkadotHelper'
import PromisE from '../../../utils/PromisE'
import {
    iUseReducer,
	subjectAsPromise,
	useRxSubject,
} from '../../../utils/reactHelper'
import {
	deferred,
	isFn,
	isHex,
	isStr,
} from '../../../utils/utils'
import FAQ from '../../../components/FAQ'
import FormBuilder, { findInput } from '../../../components/FormBuilder'
import Message, { statuses } from '../../../components/Message'
import { rxHistory } from '../../history/history'
import identities, {
	rxIdentities,
	rxSelected,
} from '../../identity/identity'
import { rxPartners } from '../../partner/partner'
import { generateTweet, getRewardIdentity, statusCached } from './claimKapex'
import { getUsageTasks, StepGroup } from './usageTasks'

let textsCap = {	    
	continue: 'continue',    
	errSubmitted: 'your claim has been received!',
	errSubmittedDetails: 'make sure to remind your friends to submit their claim.', 
	errEnded: 'Claim period has ended!',
	errIneligible1: 'You are not eligible to claim KAPEX.',
	errIneligible2: 'Only users who previously participated in the rewards campaign are eligible.',
	errInvalidTweetUrl: 'invalid Tweet URL',
	errRewardId404: 'reason: missing reward identity',
	feedbackLabel: 'enter your feedback',
	feedbackPlaceholder: 'please enter your feedback about the Totem.Live testnet application including any bug report (between 50 and 1000 characters)',  
    header: 'claim KAPEX',
	historyWarning: 'DO NOT remove history items before submitting your claim!',    
    loading: 'loading...',
	rewardIdLabel: 'your reward identity',
	rewardIdLabelDetails: 'this is the identity you need to complete the tasks with',    
	successMsg0: 'claim submitted successfully',
	successMsg1: 'we have received your claim and will go through them in due time.',
	successMsg2: 'read terms and condition for KAPEX migration',
	taskCompleted: 'Well done! You have completed this task.',
    tasksListTitle: 'in order claim KAPEX you must complete the following tasks using your reward identity:',
	tweetedBtn: 'post a tweet',
	tweetBtnDesc: 'Post a tweet to spread the word about the Totem KAPEX migration. In order for you to be eligible for referral rewards users you have referred MUST also submit their claim and be accepted.',
    tweetUrlLabel: 'Tweet ID',
	tweetUrlPlaceholder: 'paste the URL of the Tweet',
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

function ClaimKAPEXForm(props) {
    const [status, setStatusOrg] = useState(() => ({ ...statusCached(), loading: false }))
    const [initialState] = useState(() => getFormProps())
	const [state, setState] = iUseReducer(null, initialState)
	// automatically update inputs after partners list changes.
	// this is required to make sure 2nd task is automatically updated after adding a partner.
	// otherwise, a manual reload of the component will be needed by the user.
	useRxSubject(rxPartners, deferred(() => setState({
		inputs: updateInputs(state.inputs)
    }), 300))
    // automatically update inputs after history list changes.
	useRxSubject(rxHistory, deferred(() => setState({
		inputs: updateInputs(state.inputs)
    }), 300))
    const { values = {} } = state
    let { eligible, loading, message, submitted } = status

	const setStatus = useCallback((status) => {
		const now = new Date()
		const { eligible, endDate = now, error, submitted } = status
		const content = !!error
            ? error
            : !eligible
                ? `${textsCap.errIneligible1} ${textsCap.errIneligible2}`
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
	}, [])
	
	useEffect(() => {
		let mounted = true
		const init = async () => {
			status.loading = true
			setStatus({ ...status })

			// wait until user is logged in
			await subjectAsPromise(rxIsLoggedIn, true)[0]

			// makes sure reward identity is saved to storage
			await PromisE.delay(100)
			
			const rewardId = !!identities.get(getRewardIdentity())
			// check if the reward identity exists in the identities module
			if (!rewardId) throw `${textsCap.errIneligible1} ${textsCap.errRewardId404}`

			const doCheckStatus = !submitted && eligible !== false
			if (!doCheckStatus) return

			const result = ClaimKAPEXForm.resultCache
				? {
					...ClaimKAPEXForm.resultCache,
					submitted: status.submitted,
				}
				: await chatClient
					.rewardsClaimKAPEX
					.promise(true)
			// store as in-memory cache
			ClaimKAPEXForm.resultCache = result
			Object
				.keys(result)
				.forEach(key => status[key] = result[key])

			statusCached(status)
			setState({ inputs: updateInputs(state.inputs) })
		}
		init()
			.catch(err => status.error = `${err}`)
			.finally(() => {
				status.loading = false
				mounted && setStatus({...status})
			})
		
		return () => mounted = false
	}, [setStatus])

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
            onSubmit = null
			// submitText = textsCap.continue
			// onSubmit = () => {
			// 	// continue to feedback step
			// 	const { rxValue } = findInput(state.inputs, inputNames.step) || {}
			// 	rxValue && rxValue.next(steps.tweet)
			// }
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
					statusCached(status)
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
			onChange: (_, values) => setState({ values }),
			onSubmit,
			submitText,
		}} />
	)
}
ClaimKAPEXForm.defaultProps = {
	header: textsCap.header,
}
export default React.memo(ClaimKAPEXForm)

const getFormProps = () => {
	const checkTweetStep = values => !values[inputNames.tasksCompleted]
		|| values[inputNames.step] !== steps.tweet
	const checkTasksStep = values => !!values[inputNames.tasksCompleted]
	const checkFeedbackStep = values => !values[inputNames.tasksCompleted]
		|| values[inputNames.step] !== steps.feedback
	const rxStep = new BehaviorSubject()
	const inputs = [
		{
			content: <StepGroup {...{ key: 'steps', rxStep, steps }} />,
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
            maxLength: 81,
            minLength: 51,
			name: inputNames.tweetUrl,
			label: textsCap.tweetUrlLabel,
			placeholder: textsCap.tweetUrlPlaceholder,
            required: true,
            rxValue: new BehaviorSubject(''),
			type: 'url',
            validate: (_, { value }) => {
                if (!value) return

				const url = new URL(value)
				const pathArr = url.pathname.split('/')
                const userId = pathArr[1]
                const tweetId = pathArr[3]
				const invalid = url.hostname !== 'twitter.com'
					|| pathArr[2] !== 'status'
                    || !new RegExp(/^[0-9]{19}$/).test(tweetId)
                if (!invalid && value.length > 51) {
                    const { rxValue } = findInput(inputs, inputNames.tweetUrl) || {}
                    const urlStr = `https://twitter.com/${userId}/status/${tweetId}`
                    rxValue && setTimeout(() => rxValue.next(urlStr))
                }
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
            validate: (_, { value }, values) => value.replaceAll(' ', '').includes(values[inputNames.tweetUrl])
                || value.split(' ').length < 5, // require minimum 5 words
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
		inputs: updateInputs(inputs),
		submitInProgress: false,
        success: false,
        values: {},
	}
}

const updateInputs = inputs => {
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

	const tasks = getUsageTasks(rewardIdentity)
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

	// Tweet button
    const href = generateTweet()
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