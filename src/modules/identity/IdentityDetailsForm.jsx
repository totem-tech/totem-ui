import PropTypes from 'prop-types'
import React from 'react'
import LabelCopy from '../../components/LabelCopy'
import FormBuilder, { fillValues, findInput } from '../../components/FormBuilder'
import { confirmAsPromise } from '../../services/modal'
import { translated } from '../../utils/languageHelper'
import { useRxState } from '../../utils/reactjs'
import storage from '../../utils/storageHelper'
import { isFn, objClean } from '../../utils/utils'
import Balance from './Balance'
import {
	get,
	getSelected,
	remove,
} from './identity'
import IdentityForm from './IdentityForm'
import IdentityIcon from './IdentityIcon'

const textsCap = {
	advanced: 'advanced',
	availableBalance: 'available balance',
	autoSaved: 'changes will be auto-saved',
	close: 'close',
	copySeed: 'copy seed',
	cryptoType: 'identity type',
	hideSeed: 'hide seed',
	identity: 'identity',
	identityDetails: 'identity details',
	lastBackup: 'last backup',
	loadingBalance: 'loading account balance',
	never: 'never',
	noKeepItHidden: 'no, keep it hidden',
	ok: 'OK',
	removeIdentity: 'remove identity',
	removePermanently: 'remove permanently',
	removeWarningPart1: 'you are about to remove the following identity',
	removeWarningPart2: 'if not backed up, this action is irreversible.',
	removeWarningPart3: 'you will lose access to all activity/data related to this identity.',
	identityDeleteWarningSelected: 'cannot remove identity you are currently using',
	identityDeleteWarningReward: 'cannot remove your rewards identity',
	show: 'show',
	showSeed: 'show seed phrase',
	seed: 'seed',
}
translated(textsCap, true)

export const inputNames = {
	address: 'address',
	advanced: 'advanced',
	btnDelete: 'btnDelete',
	cryptoType: 'type',
	fileBackupTS: 'fileBackupTS',
	identityForm: 'identityForm',
	txAllocations: 'txAllocations',
	uri: 'uri',
}
// A read only form to display identity details including seed
const IdentityDetailsForm = props => {
	const [state] = useRxState(getInitialState(props))

	return <FormBuilder {...{ ...props, ...state }} />
}
IdentityDetailsForm.defaultProps = {
	closeOnSubmit: true,
	closeOnDimmerClick: true,
	closeOnDocumentClick: true,
	closeOnEscape: true,
	closeText: null,
	header: textsCap.identityDetails,
	size: 'mini',
}
IdentityDetailsForm.propTypes = {
	values: PropTypes.shape({
		address: PropTypes.string.isRequired,
	}).isRequired,
	// other modal props
}
export default IdentityDetailsForm

const getInitialState = props => rxState => {
	const identity = get((props.values || {}).address) || {}
	const {
		address,
		uri = '',
		usageType
	} = identity

	const inputs = [
		{
			content: (
				<IdentityForm {...{
					...objClean(props, [
						'onChange',
						'onClose',
						'onSubmit',
					]),
					// auto save changes
					autoSave: true,
					El: 'div',
					submitText: null,
					values: identity,
				}} />
			),
			name: inputNames.identityForm,
			type: 'html',
		},
		{ // advanced section
			accordion: {
				collapsed: true,
				styled: true,
			},
			grouped: true,
			label: textsCap.advanced,
			name: inputNames.advanced,
			type: 'group',
			widths: 16,
			inputs: [
				{
					action: (
						<LabelCopy {...{
							content: null,
							icon: {
								style: {
									fontSize: 14,
									paddingTop: 5,
								},
							},
							style: {
								borderBottomLeftRadius: 0,
								borderTopLeftRadius: 0,
								marginLeft: 1,
							},
							value: address,
						}} />
					),
					label: textsCap.identity,
					name: inputNames.address,
					readOnly: true,
					type: 'text',
				},
				{
					inlineLabel: {
						icon: { className: 'no-margin', name: 'eye' },
						style: { cursor: 'pointer' },
						title: textsCap.showSeed,
						onClick: handleToggleSeed(rxState),
					},
					labelPosition: 'left', // for inlineLabel
					label: textsCap.seed,
					name: inputNames.uri,
					readOnly: true,
					type: 'text',
					// useInput: true,
				},
				{
					label: textsCap.cryptoType,
					name: inputNames.cryptoType,
					readOnly: true,
				},
			],
		},
		{
			label: textsCap.lastBackup,
			name: inputNames.fileBackupTS,
			readOnly: true,
			type: 'text',
			// value: textsCap.never,
		},
		{
			content: (
				<Balance {...{
					address: address,
					EL: 'label',
					emptyMessage: textsCap.loadingBalance,
					prefix: `${textsCap.availableBalance}: `,
					showDetailed: true,
					style: {
						fontWeight: 'bold',
						margin: '0 0 0 3px',
					},
				}} />
			),
			name: inputNames.txAllocations,
			type: 'html',
		},
		{
			content: textsCap.removePermanently,
			icon: 'trash',
			fluid: true,
			name: inputNames.btnDelete,
			negative: true,
			onClick: handleDelete(props, rxState),
			style: {
				marginTop: 15,
				textTransform: 'capitalize',
			},
			type: 'button',
		},
	]

	const state = {
		headerIcon: (
			<IdentityIcon {...{
				address,
				formProps: null,
				size: 'large',
				usageType,
			}} />
		),
		identity,
		inputs: fillValues(inputs, {
			[inputNames.fileBackupTS]: textsCap.never,
			...identity,
			uri: '*'.repeat(uri.length),
		}),
		// closeText: { content: textsCap.close, negative: false },
		seedVisible: false,
		subheader: <i style={{ color: 'grey' }}>{textsCap.autoSaved}</i>,
		submitText: null, // hide submit button
		success: false, // sets true  when identity removed and modal will be auto closed
	}

	return state
}

const handleDelete = (props, rxState) => async () => {
	const { onSubmit } = props
	const { identity } = rxState.value
	const { address, name } = identity
	const isSelectedIdentity = getSelected().address === address
	const settings = storage.settings.module('messaging') || {}
	const {
		user: {
			address: rewardsIdentity
		} = {}
	} = settings
	const isRewardsIdentity = address === rewardsIdentity
	const denyDelete = isRewardsIdentity || isSelectedIdentity
	if (denyDelete) return await confirmAsPromise({
		cancelButton: textsCap.ok,
		confirmButton: null,
		content: isSelectedIdentity
			? textsCap.identityDeleteWarningSelected
			: textsCap.identityDeleteWarningReward,
		size: 'mini',
	})

	const confirmed = await confirmAsPromise({
		confirmButton: {
			icon: 'trash',
			content: textsCap.removePermanently,
			negative: true
		},
		content: (
			<>
				<p>
					{textsCap.removeWarningPart1}: <br />
					<b>{name}</b>
				</p>
				<p>
					<b>
						{textsCap.removeWarningPart2 + ' ' + textsCap.removeWarningPart3}
					</b>
				</p>
			</>
		),
		header: textsCap.removeIdentity,
		size: 'mini',
	})
	if (!confirmed) return


	remove(address)
	rxState.next({ success: true })
	isFn(onSubmit) && onSubmit(true, identity)
}

const handleToggleSeed = rxState => async () => {
	let {
		identity,
		inputs,
		seedVisible
	} = rxState.value
	const confirmed = seedVisible || await confirmAsPromise({
		cancelButton: {
			positive: true,
			content: textsCap.noKeepItHidden,
		},
		confirmButton: {
			negative: true,
			content: textsCap.show,
		},
		header: textsCap.showSeed,
		size: 'mini',
	})
	if (!confirmed) return

	const { uri = '' } = identity
	seedVisible = !seedVisible
	const uriIn = findInput(inputs, inputNames.uri)
	uriIn.action = !seedVisible
		? undefined
		: (
			<LabelCopy {...{
				content: null,
				icon: {
					style: {
						fontSize: 14,
						// paddingTop: 2,
					},
				},
				style: {
					borderBottomLeftRadius: 0,
					borderTopLeftRadius: 0,
					marginLeft: 1
				},
				value: uri,
			}} />
		)
	uriIn.inlineLabel.icon.name = seedVisible
		? 'eye slash'
		: 'eye'
	uriIn.inlineLabel.title = seedVisible
		? textsCap.hideSeed
		: textsCap.showSeed
	uriIn.value = seedVisible || !uri
		? uri
		: '*'.repeat(uri.length)
	rxState.next({ inputs, seedVisible })
}