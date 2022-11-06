import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Button } from 'semantic-ui-react'
//utils
import storage from '../../utils/storageHelper'
import { copyToClipboard, isFn } from '../../utils/utils'
// components
import FormBuilder, {
	fillValues,
	findInput,
} from '../../components/FormBuilder'
// services
import { translated } from '../../services/language'
import { confirm } from '../../services/modal'
// modules
import Balance from './Balance'
import { get, getSelected, remove } from './identity'
import IdentityForm from './IdentityForm'

const textsCap = translated({
	advanced: 'advanced',
	availableBalance: 'available balance',
	autoSaved: 'changes will be auto-saved',
	close: 'close',
	copyAddress: 'copy address',
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
}, true)[1]

export const inputNames = {
	address: 'address',
	advanced: 'advanced',
	cryptoType: 'type',
	delete: 'delete',
	fileBackupTS: 'fileBackupTS',
	identityForm: 'identityForm',
	txAllocations: 'txAllocations',
	uri: 'uri',
}
// A read only form to display identity details including seed
class IdentityDetailsForm extends Component {
	constructor(props) {
		super(props)

		this.identity = get((props.values || {}).address) || {}
		const { address, tags } = this.identity
		this.showSeed = false
		this.state = {
			// closeText: { content: textsCap.close, negative: false },
			subheader: <i style={{ color: 'grey' }}>{textsCap.autoSaved}</i>,
			submitText: null, // hide submit button
			success: false, // sets true  when identity removed and modal will be auto closed
			inputs: [
				{
					content: (
						<IdentityForm {...{
							El: 'div',
							// auto save changes
							autoSave: true,
							submitText: null,
							values: this.identity,
						}} />
					),
					name: inputNames.identityForm,
					type: 'html',
				},
				{
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
							action: {
								icon: 'copy',
								onClick: e => e.preventDefault()
									| copyToClipboard(this.identity.address),
								style: { cursor: 'pointer' },
								title: textsCap.copyAddress,
							},
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
								onClick: () => {
									const toggle = () => {
										const { inputs } = this.state
										this.showSeed = !this.showSeed
										const uriIn = findInput(inputs, 'uri')
										uriIn.action = !this.showSeed
											? undefined
											: {
												icon: 'copy',
												onClick: e => e.preventDefault()
													| copyToClipboard(this.identity.uri),
												title: textsCap.copySeed,
											  }
										uriIn.inlineLabel.icon.name = `eye${this.showSeed ? ' slash' : ''}`
										uriIn.inlineLabel.title = `${
											this.showSeed
												? textsCap.hideSeed
												: textsCap.showSeed
										}`
										uriIn.value = this.getUri(this.identity.uri)
										this.setState({ inputs })
									}
									this.showSeed
										? toggle()
										: confirm({
												cancelButton: (
													<Button
														positive
														content={
															textsCap.noKeepItHidden
														}
													/>
												),
												confirmButton: (
													<Button
														negative
														content={textsCap.show}
													/>
												),
												header: textsCap.showSeed,
												onConfirm: toggle,
												size: 'mini',
										  })
								},
							},
							labelPosition: 'left', // for inlineLabel
							label: textsCap.seed,
							name: inputNames.uri,
							readOnly: true,
							type: 'text',
							useInput: true,
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
					name: inputNames.delete,
					negative: true,
					onClick: this.handleDelete,
					style: {
						marginTop: 15,
						textTransform: 'capitalize',
					},
					type: 'button',
				},
			],
		}

		fillValues(this.state.inputs, {
			[inputNames.fileBackupTS]: textsCap.never,
			...this.identity,
			uri: this.getUri(this.identity.uri),
		})
	}

	getUri = uri => (this.showSeed || !uri ? uri : '*'.repeat(uri.length))

	handleDelete = () => {
		const { onSubmit } = this.props
		const { address, name } = this.identity
		const isSelectedIdentity = getSelected().address === address
		const settings = storage.settings.module('messaging') || {}
		const { user: { address: rewardsIdentity } = {} } = settings
		const isRewardsIdentity = address === rewardsIdentity
		const denyDelete = isRewardsIdentity || isSelectedIdentity
		if (denyDelete) return confirm({
			cancelButton: textsCap.ok,
			confirmButton: null,
			content: isSelectedIdentity
				? textsCap.identityDeleteWarningSelected
				: textsCap.identityDeleteWarningReward,
			size: 'mini',
		})

		confirm({
			confirmButton: (
				<Button
					icon='trash'
					content={textsCap.removePermanently}
					negative
				/>
			),
			content: [
				<p key='1'>
					{textsCap.removeWarningPart1}: <br />
					<b>{name}</b>
				</p>,
				<p key='0'>
					<b>
						{textsCap.removeWarningPart2}
						{textsCap.removeWarningPart3}
					</b>
				</p>,
			],
			header: textsCap.removeIdentity,
			onConfirm: () => {
				remove(address)
				this.setState({ success: true })
				isFn(onSubmit) && onSubmit(true, this.identity)
			},
			size: 'tiny',
		})
	}

	render = () => <FormBuilder {...{ ...this.props, ...this.state }} />
}
IdentityDetailsForm.propTypes = {
	values: PropTypes.shape({
		address: PropTypes.string.isRequired,
	}).isRequired,
}
IdentityDetailsForm.defaultProps = {
	closeOnSubmit: true,
	closeOnDimmerClick: true,
	closeOnDocumentClick: true,
	closeOnEscape: true,
	closeText: null,
	header: textsCap.identityDetails,
	size: 'tiny',
}

export default IdentityDetailsForm