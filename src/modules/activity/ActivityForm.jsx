import React from 'react'
import PropTypes from 'prop-types'
import { Button } from '../../components/buttons'
import FormBuilder, { fillValues } from '../../components/FormBuilder'
import { translated } from '../../utils/languageHelper'
import { addToQueue, getById, QUEUE_TYPES, rxOnSave } from '../../services/queue'
import { iUseReducer, useRxState } from '../../utils/reactjs'
import {
	deferred,
	generateHash,
	isFn,
	objClean,
} from '../../utils/utils'
import { getSelected, rxIdentities } from '../identity/identity'
import { getIdentityOptions } from '../identity/getIdentityOptions'
import { queueables } from './activity'
import ActivityTeamList from './ActivityTeamList'
import { rxForceUpdate } from './useActivities'
import QueueItemStatus, { useQueueItemStatus } from '../../utils/reactjs/components/QueueItemStatus'
import { BehaviorSubject } from 'rxjs'
import { rxOnline } from '../../utils/window'

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
	saveDetailsTitle: 'save activity details',
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
	const message = useQueueItemStatus(
		rxQueueId,
		// replace header and include a button below the success message to open the team list on a modal
		message => message?.status !== 'success'
			? message
			: {
				...message,
				content: showTeamBtn,
				header: textsCap.submitSuccessHeader,
			},
	)

	if (message) state.message = message

	return (
		<FormBuilder {...{
			...props,
			...state,
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
		success: false,
	}
	return state
}

const handleSubmit = (props, rxState) => (e, values) => {
	const {
		activityId: existingId,
		modalId,
		onSubmit,
	} = props
	const { rxQueueId } = rxState?.value || {}
	const create = !existingId
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

	const handleTxError = ok => !ok && rxState.next({
		...!ok && { showTeamBtn: null },
		submitInProgress: false
	})

	const handleOffChainResult = (ok, err) => {
		err = !ok && err
		isFn(onSubmit) && onSubmit(ok, values)
		handleTxError(ok)
		if (!!err) return

		rxState.next({ success: true })
		// trigger cache update
		rxForceUpdate.next(`${ownerAddress}`)
	}

	// save auth token to blockchain and then store data to off-chain DB
	const updateTask = queueables.saveBONSAIToken(
		ownerAddress,
		activityId,
		token,
		{
			title: textsCap.saveBONSAIToken,
			description: token,
			then: handleTxError,
			next: {
				type: QUEUE_TYPES.CHATCLIENT,
				func: 'project',
				title: textsCap.saveDetailsTitle,
				description,
				// address: ownerAddress,
				then: handleOffChainResult,
				args: [
					activityId,
					values,
					create,
				],
			},
		},
	)

	// Send transaction to blockchain first, then add to external storage
	const createTask = queueables.add(ownerAddress, activityId, {
		title,
		description,
		then: handleTxError,
		next: updateTask,
	})

	rxState.next({
		showTeamBtn: (
			<Button {...{
				content: textsCap.addTeamMembers,
				onClick: e => {
					// button is inside the form element.
					// this prevents form being submitted.
					e.preventDefault()
					return ActivityTeamList.asModal({
						activityId,
						modalId,
						subheader: activityName,
					})
				},
			}} />
		),
		submitInProgress: true
	})

	const queueId = addToQueue(
		create
			? createTask
			: updateTask
	)
	rxQueueId.next(queueId)

}