import React from 'react'
import PropTypes from 'prop-types'
import { Button } from '../../components/buttons'
import FormBuilder, { fillValues } from '../../components/FormBuilder'
import { translated } from '../../utils/languageHelper'
import { closeModal, confirm } from '../../services/modal'
import { addToQueue, QUEUE_TYPES } from '../../services/queue'
import { iUseReducer } from '../../utils/reactjs'
import {
	generateHash,
	isFn,
	objClean,
} from '../../utils/utils'
import { getSelected, rxIdentities } from '../identity/identity'
import { getIdentityOptions } from '../identity/getIdentityOptions'
import { getProjects, queueables } from './activity'
import ActivityTeamList from './ActivityTeamList'

let textsCap = {
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
	projectTeam: 'activity team',
	saveBONSAIToken: 'save BONSAI auth token',
	saveDetailsTitle: 'save Activity details to messaging service',
	submitErrorHeader: 'request failed',
	submitQueuedMsg: 'your request has been added to background queue. You may close the dialog now.',
	submitQueuedHeader: 'activity has been queued',
	submitSuccessHeader: 'activity saved successfully',
	submitTitleCreate: 'create activity',
	submitTitleUpdate: 'update activity',
}
textsCap = translated(textsCap, true)[1]

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
// Create or update project form
export default function ActivityForm(props) {
	const [state] = iUseReducer(null, rxState => {
		const { hash, header, values = {} } = props
		values.ownerAddress = values.ownerAddress || getSelected().address
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
				disabled: !!props.hash,
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
			onSubmit: handleSubmit(props, rxState),
			success: false,
			header: header || (
				hash
					? textsCap.formHeaderUpdate
					: textsCap.formHeaderCreate
			),
			submitText: hash
				? textsCap.update
				: textsCap.create,
			inputs: fillValues(inputs, values),
		}
		return state
	})

	return <FormBuilder {...{ ...props, ...state }} />
}
ActivityForm.propTypes = {
	// Project hash
	hash: PropTypes.string,
	values: PropTypes.shape({
		description: PropTypes.string.isRequired,
		name: PropTypes.string.isRequired,
		ownerAddress: PropTypes.string.isRequired,
	}),
}
ActivityForm.defaultProps = {
	size: 'tiny',
}

const handleSubmit = (props, rxState) => (e, values) => {
	const { onSubmit, hash: existingHash } = props
	const create = !existingHash
	const hash = existingHash || generateHash(values)
	const tokenData = objClean(values, bonsaiKeys)
	const token = generateHash(tokenData)
	const {
		description: desc,
		name: projectName,
		ownerAddress,
	} = values
	const title = create
		? textsCap.submitTitleCreate
		: textsCap.submitTitleUpdate
	const description = `${textsCap.name}: ${projectName}`
		+ '\n'
		+ `${textsCap.description}: ${desc}`
	const message = {
		content: textsCap.submitQueuedMsg,
		header: textsCap.submitQueuedHeader,
		status: 'loading',
		icon: true,
	}
	const handleTxError = (ok, err) => !ok && rxState.next({
		message: {
			content: `${err}`,
			header: textsCap.submitErrorHeader,
			icon: true,
			status: 'error',
		},
		submitDisabled: false,
	})

	rxState.next({
		message,
		submitDisabled: true,
		submitInProgress: true,
	})

	const handleOffChainResult = (ok, err) => {
		err = !ok && err
		isFn(onSubmit) && onSubmit(ok, values)
		rxState.next({
			message: {
				content: err || (
					<Button {...{
						content: textsCap.addTeamMembers,
						onClick: e => {
							e.preventDefault()
							const { modalId } = props
							closeModal(modalId)
							confirm({
								cancelButton: null,
								confirmButton: null,
								content: <ActivityTeamList projectHash={hash} />,
								header: `${textsCap.projectTeam} - ${title}`,
							})
						},
					}} />
				),
				header: err
					? textsCap.submitErrorHeader
					: textsCap.submitSuccessHeader,
				icon: true,
				status: !err
					? 'success'
					: 'warning',
			},
			submitDisabled: false,
			submitInProgress: false,
			success: !err,
		})
		// trigger cache update
		!err && getProjects(true)
	}

	// save auth token to blockchain and then store data to off-chain DB
	const updateTask = queueables.saveBONSAIToken(
		ownerAddress,
		hash,
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
					hash,
					values,
					create,
				],
			},
		},
	)

	// Send transaction to blockchain first, then add to external storage
	const createTask = queueables.add(ownerAddress, hash, {
		title,
		description,
		then: handleTxError,
		next: updateTask,
	})

	addToQueue(create ? createTask : updateTask)
}