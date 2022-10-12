import React, { useEffect, useState } from 'react'
import { Button, Icon } from 'semantic-ui-react'
import { BehaviorSubject } from 'rxjs'
import { iUseReducer, useRxSubject } from '../../utils/reactHelper'
import { arrUnique, isFn } from '../../utils/utils'
import FAQ from '../../components/FAQ'
import FormBuilder from '../../components/FormBuilder'
import { getAll as getHistory } from '../history/history'
import identities from '../identity/identity'
import partners from '../partner/partner'
import chatClient from '../../utils/chatClient'
import storage from '../../utils/storageHelper'

export const getTaskList = targetIdentity => {
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

		if (targetIdentity !== identity || status !== 'success') return
		// check blockchain transaction releated tasks
		switch (action) {
			case 'api.tx.transfer.networkCurrency':
				taskStatus.transferred =
					taskStatus.transferred ||
					partnersAdded.find(x => x.address === recipient)

				console.log('transfer', { partnersAdded, recipient })
				break
			case 'api.tx.projects.addNewProject':
				taskStatus.activityCreated = true
				break
		}
	})

	const checkMark = (
		<Icon
			{...{
				color: 'green',
				name: 'check circle',
				title: 'You have completed this task',
			}}
		/>
	)
	const tasks = [
		{
			answer: (
				<div>
					Follow instruction below to complete the task:
					<ul>
						<li>
							<a
								{...{
									href: '/?exclusive=false&module=partners',
									target: '_blank',
								}}
							>
								Go to Partners module
							</a>
						</li>
						<li>Click on the "Request" button</li>
						<li>Enter your friend's Totem User ID</li>
						<li>Select or enter a custom reason</li>
						<li>Submit</li>
					</ul>
				</div>
			),
			completed: partnerRequested,
			question: (
				<span>
					Request identity from a friend{' '}
					{partnerRequested && checkMark}
				</span>
			),
		},
		{
			answer: 'Check your notification to see if your friend shared an identity with you and add their identity as partner.',
			completed: taskStatus.partnersAdded,
			question: (
				<span>
					Add identity shared by a friend{' '}
					{taskStatus.partnersAdded && checkMark}
				</span>
			),
		},
		{
			answer: (
				<div>
					Use the transfer module to send funds to one of your
					friends.
					<br />
					Follow instruction below to complete the task:
					<ul>
						<li>
							<a
								{...{
									href: '/?exclusive=false&module=transfer',
									target: '_blank',
								}}
							>
								Go to Transfer module
							</a>
						</li>
						<li>
							Select your friend from the recipient DropDown list
						</li>
						<li>
							Enter any amount you wish to send. Amounts
							transferred will not affect the amount claimable.
						</li>
						<li>Submit</li>
					</ul>
				</div>
			),
			completed: taskStatus.transferred,
			question: (
				<span>
					Transfer any amount to one of your friend's identity{' '}
					{taskStatus.transferred && checkMark}
				</span>
			),
		},
		{
			answer: (
				<div>
					Follow instruction below to complete the task:
					<ul>
						<li>
							<a
								{...{
									href: '/?exclusive=false&module=activity',
									target: '_blank',
								}}
							>
								Go to Activity module.
							</a>
						</li>
						<li>Click on the "create" button.</li>
						<li>
							Enter any name and description for the activity.
						</li>
						<li>
							Submit and wait until Activity is successfully
							created.
						</li>
						<li>Click on the "Add/view team members" button.</li>
						<li>Add yourself as a team member.</li>
					</ul>
				</div>
			),
			completed: taskStatus.activityCreated,
			question: (
				<span>
					Create an Activity {taskStatus.activityCreated && checkMark}
				</span>
			),
		},
		{
			answer: (
				<div>
					Follow instruction below to complete the task:
					<ul>
						<li>
							<a
								{...{
									href: '/?exclusive=false&module=timekeeping',
									target: '_blank',
								}}
							>
								Go to Activity module.
							</a>
						</li>
						<li>Click on the "create" button.</li>
						<li>
							Enter any name and description for the activity.
						</li>
						<li>
							Submit and wait until Activity is successfully
							created.
						</li>
						<li>Click on the "Add/view team members" button.</li>
						<li>Add yourself as a team member.</li>
					</ul>
				</div>
			),
			completed: true,
			question: (
				<span>Create a timekeeping record {false && checkMark}</span>
			),
		},
		{
			answer: '',
			completed: true,
			question: <span>Create a task {false && checkMark}</span>,
		},
	]
	return tasks
}
const getInitialState = rxSetState => {
	const inputs = () => {
		const getSelected = () => identities.getSelected().address
		const rewardsIdentity =
			storage.settings.module('messaging').user.address
		const rewardsIdentityAvailable = !!identities.get(rewardsIdentity)
		const switchIdenity =
			rewardsIdentityAvailable && rewardsIdentity !== getSelected()
		// If rewards identity is available it will be selected automatically.
		if (switchIdenity) identities.setSelected(rewardsIdentity)
		const targetIdentity = getSelected()
		// identity to complete the tasks with.

		const tasks = getTaskList(targetIdentity)
		const tasksCompleted = tasks.every(x => x.completed)
		return [
			{
				hidden: true,
				name: 'rewardsIdentity',
				value: rewardsIdentity,
			},
			{
				hidden: true,
				name: 'targetIdentity',
				value: targetIdentity,
			},
			{
				checked: tasksCompleted,
				disabled: true,
				label: (
					<div>
						In order claim KAPEX you must complete the following
						tasks:{' '}
						<Icon
							{...{
								className: 'no-margin',
								name: 'refresh',
								onClick: () => reload(),
								style: {
									// color: 'orange',
									cursor: 'pointer',
								},
							}}
						/>
					</div>
				),
				name: 'tasksCompleted',
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
				name: 'html',
				type: 'html',
			},
			{
				hidden: values => !values.tasksCompleted,
				label: 'Feedback',
				maxLength: 1000,
				minLength: 50,
				name: 'feedback',
				placeholder:
					'Please enter your unique feedback including any bug report here (between 50 and 5000 characters)',
				required: true,
				type: 'textarea',
			},
		]
	}

	const reload = () =>
		rxSetState.next({
			...rxSetState.value,
			inputs: inputs(),
		})
	return {
		...rxSetState.value,
		header: 'Claim KAPEX',
		inputs: inputs(),
	}
}
export default function ClaimKAPEXForm(props) {
	const [state, setState] = iUseReducer(null, getInitialState)

	useEffect(() => { }, [])

	return (
		<FormBuilder {...{
			...props,
			onSubmit: async (e, values) => {
				const { onSubmit } = props
				setState({ submitInProgress: true })
				chatClient.rewardsClaimKAPEX.promise(values)

				setState({ submitInProgress: false })
				isFn(onSubmit) && onSubmit(true, values)
			},
			// inputs,
			...state,
		}} />
	)
}
