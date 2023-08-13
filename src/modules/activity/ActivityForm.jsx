import PropTypes from 'prop-types'
import React from 'react'
import { BehaviorSubject } from 'rxjs'
import { Button } from '../../components/buttons'
import FormBuilder, { fillValues } from '../../components/FormBuilder'
import {
	addToQueue,
	newId,
	QUEUE_TYPES
} from '../../services/queue'
import { translated } from '../../utils/languageHelper'
import {
	useRxState,
	useQueueItemStatus,
	statuses
} from '../../utils/reactjs'
import {
	deferred,
	generateHash,
	isFn,
	objClean,
} from '../../utils/utils'
import { getIdentityOptions } from '../identity/getIdentityOptions'
import { getSelected, rxIdentities } from '../identity/identity'
import { queueables } from './activity'
import ActivityTeamList from './ActivityTeamList'

const textsCap = {
	create: 'create',
	description: 'description',
	name: 'name',
	update: 'update',

	addTeamMembers: 'add/view team members',
	descLabel: 'activity Description',
	descPlaceholder: 'enter short description of the activity... (max 160 characters)',
	formHeaderCreate: 'create a new Activity',
	formHeaderUpdate: 'update Activity',
	nameLabel: 'activity Name',
	namePlaceholder: 'enter activity name',
	ownerLabel: 'select the owner Identity for this Activity ',
	ownerPlaceholder: 'select owner',
	saveBONSAIToken: 'save BONSAI auth token',
	saveDetailsTitle: 'save off-chain data',
	submitSuccessHeader: 'activity saved successfully',
	submitTitleCreate: 'create activity',
	submitTitleUpdate: 'update activity',
}
translated(textsCap, true)
export const inputNames = {
	description: 'description',
	name: 'name',
	ownerAddress: 'ownerAddress',
}
export const bonsaiKeys = [
	inputNames.description,
	inputNames.name,
	inputNames.ownerAddress,
]

// Create or update activity form
export default function ActivityForm(props) {
	const [state] = useRxState(getInitialState(props))
	const { rxQueueId, showTeamBtn } = state
	// when form is submitted rxQueueId & showTeamBtn is set and queue status (message) will be displayed automatically.
	const queueStatus = useQueueItemStatus(
		rxQueueId,
		message => message?.status !== 'success'
			? message
			: {
				// replace header and include a button below the success message to open the team list on a modal
				...message,
				content: showTeamBtn,
				header: textsCap.submitSuccessHeader,
			},
	)

	return (
		<FormBuilder {...{
			...props,
			...state,
			message: queueStatus || state.message
		}} />
	)
}
ActivityForm.propTypes = {
	activityId: PropTypes.string,
	values: PropTypes.shape({
		description: PropTypes.string.isRequired,
		name: PropTypes.string.isRequired,
		ownerAddress: PropTypes.string.isRequired,
	}),
}
ActivityForm.defaultProps = {
	size: 'tiny',
}

const getInitialState = props => rxState => {
	const {
		activityId,
		header,
		values = {}
	} = props
	const isCreate = !props.activityId
	values.ownerAddress ??= getSelected().address
	const inputs = [
		{
			label: textsCap.nameLabel,
			name: inputNames.name,
			maxLength: 64,
			minLength: 3,
			placeholder: textsCap.namePlaceholder,
			required: true,
			type: 'text',
		},
		{
			disabled: !!activityId,
			label: textsCap.ownerLabel,
			name: inputNames.ownerAddress,
			placeholder: textsCap.ownerPlaceholder,
			required: true,
			rxOptions: rxIdentities,
			rxOptionsModifier: getIdentityOptions,
			search: ['keywords'],
			selection: true,
			type: 'dropdown',
		},
		{
			label: textsCap.descLabel,
			name: inputNames.description,
			maxLength: 160,
			minLength: 3,
			placeholder: textsCap.descPlaceholder,
			required: true,
			type: 'textarea',
		},
	]
	const state = {
		header: header || (
			activityId
				? textsCap.formHeaderUpdate
				: textsCap.formHeaderCreate
		),
		inputs: fillValues(inputs, values),
		// disable submit button if either name or description is unchanged when updating the Activity
		onChange: deferred((_, newValues) => {
			if (isCreate) return

			const { submitDisabled } = rxState.value
			const changed = key => newValues[key] !== values[key]
			submitDisabled.changed = !changed(inputNames.description)
				&& !changed(inputNames.name)
			rxState.next({ submitDisabled })
		}, 150),
		onSubmit: handleSubmit(props, rxState),
		rxQueueId: new BehaviorSubject(),
		submitDisabled: {
			changed: false,
		},
		submitText: activityId
			? textsCap.update
			: textsCap.create,
	}
	return state
}

export const handleSubmit = (props, rxState) => async (_e, values) => {
	const {
		activityId: existingId,
		create = !existingId,
		onClose,
		onSubmit,
	} = props
	const { rxQueueId } = rxState?.value || {}
	const activityId = existingId || generateHash(values)
	const tokenData = objClean(values, bonsaiKeys)
	const token = generateHash(tokenData)
	const {
		description: desc,
		name: activityName,
		ownerAddress,
	} = values
	const title = create
		? textsCap.submitTitleCreate
		: textsCap.submitTitleUpdate
	const description = `${textsCap.name}: ${activityName}`
		+ '\n'
		+ `${textsCap.description}: ${desc}`

	// save auth token to blockchain and then store data to off-chain DB
	const updateTask = queueables.saveBONSAIToken(
		ownerAddress,
		activityId,
		token,
		{
			title: `${title}: ${textsCap.saveBONSAIToken}`,
			description: token,
			next: {
				type: QUEUE_TYPES.CHATCLIENT,
				func: 'project',
				title: `${title}: ${textsCap.saveDetailsTitle}`,
				description,
				args: [
					activityId,
					values,
					create,
				],
			},
		},
	)

	// update state and prevent re-submission unless execution is failed
	rxState.next({
		showTeamBtn: (
			<Button {...{
				content: textsCap.addTeamMembers,
				onClick: e => {
					// button is inside the form element.
					// this prevents form being submitted.
					e.preventDefault()
					// if on a modal, close it
					isFn(onClose) && onClose()
					return ActivityTeamList.asModal({
						activityId,
						subheader: activityName,
					})
				},
			}} />
		),
		submitInProgress: true,
		success: false,
	})

	const onComplete = status => {
		const success = status === statuses.success
		rxState.next({
			submitInProgress: false,
			success,
		})
		onSubmit?.(success, values)
	}
	const queueItem = !create
		? updateTask
		: queueables.add(ownerAddress, activityId, {
			title,
			description,
			next: updateTask,
		})
	// send to queue && set queue ID to display status message
	const queueId = addToQueue(queueItem, onComplete)
	rxQueueId?.next?.(queueId)
}