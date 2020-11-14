import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { arrSort, deferred, isFn, objHasKeys } from '../../utils/utils'
import FormBuilder, { fillValues } from '../../components/FormBuilder'
import { translated } from '../../services/language'
import { closeModal, confirm } from '../../services/modal'
import storage from '../../services/storage'
import { getAll as getIdentities, set as saveIdentity } from '../identity/identity'
import { get as getPartner } from '../partner/partner'
import { get, remove, set } from './location'

const textsCap = translated({
	addressLine1Label: 'address line 1',
	addressLine1Placeholder: 'Eg: 123A Street',
	addressLine2Label: 'address line 2',
	areYouSure: 'are you sure?',
	cityLabel: 'city',
	cityPlaceholder: 'enter your city',
	countryLabel: 'country',
	countryPlaceholder: 'select your country',
	formHeaderCreate: 'add new location',
	formHeaderUpdate: 'update location',
	formSubheaderUpdate: 'changes will be auto-saved',
	locationRemoveWarning: 'this location is used by the following identities:',
	nameLabel: 'location name',
	namePlaceholder: 'enter a name for this location',
	partnerIdentityLabel: 'partner user ID',
	partnerNameLabel: 'partner name',
	postcodeLabel: 'postcode or zip',
	postcodePlaceholder: 'enter your postcode or zip',
	remove: 'remove location',
	stateLabel: 'state or province',
	statePlaceholder: 'enter your state or province',
	successMsg: 'location created successfully'
}, true)[1]

export const requiredFields = {
	city: 'city',
	countryCode: 'countryCode',
	name: 'name',
	postcode: 'postcode',
	state: 'state',
	addressLine1: 'addressLine1',
}
export const optionalFields = {
	addressLine2: 'addressLine2',
	partnerIdentity: 'partnerIdentity', // if owned by partner
}
export const inputNames = {
	...requiredFields,
	...optionalFields,
	partnerName: 'partnerName',
	removeBtn: 'removeBtn',
}

export default class LocationForm extends Component {
	constructor(props) {
		super(props)

		let { autoSave, header, id, subheader, submitText, values } = props
		const location = get(id) || values || {}
		const { partnerIdentity } = location 
		this.isUpdate = !!id && !!location
		const partner = getPartner(partnerIdentity)
		const noFlags = ['aq', 'bl', 'bq', 'cw', 'gg', 'im', 'je', 'mf', 'ss', 'sx', 'xk']
			.map(x => x.toUpperCase())
		
		this.state = {
			closeText: !this.isUpdate ? undefined : { negative: false },
			header: header || (this.isUpdate ? textsCap.formHeaderUpdate : textsCap.formHeaderCreate),
			onChange: this.handleChange,
			onSubmit: this.handleSubmit,
			subheader: subheader || (!this.isUpdate || !autoSave ? '' : (
				<span style={{ color: 'grey' }}> {textsCap.formSubheaderUpdate}</span>
			)),
			submitText: submitText === null || submitText
				? submitText
				: this.isUpdate && autoSave
					? null
					: undefined,
			inputs: fillValues([
				{
					hidden: true,
					name: inputNames.partnerIdentity,
					type: 'text',
					value: partnerIdentity,
				},
				// for display purposes only
				{
					// action: {}// remove location
					hidden: !partner,
					label: textsCap.partnerNameLabel,
					name: inputNames.partnerName,
					readOnly: true,
					type: 'text',
					value: (partner || {}).name,
				},
				{
					label: textsCap.nameLabel,
					minLength: 3,
					maxLength: 64,
					name: inputNames.name,
					placeholder: textsCap.namePlaceholder,
					required: true,
					type: 'text',
				},
				{
					label: textsCap.addressLine1Label,
					minLength: 3,
					maxLength: 64,
					name: inputNames.addressLine1,
					placeholder: textsCap.addressLine1Placeholder,
					required: true,
					type: 'text',
				},
				{
					label: textsCap.addressLine2Label,
					minLength: 3,
					maxLength: 64,
					name: inputNames.addressLine2,
					required: false,
					type: 'text',
				},
				{
					name: 'group_city-postcode',
					type: 'group',
					inputs: [
						{
							label: textsCap.cityLabel,
							minLength: 3,
							maxLength: 64,
							name: inputNames.city,
							placeholder: textsCap.cityPlaceholder,
							required: true,
							type: 'text',
						},
						{
							label: textsCap.postcodeLabel,
							minLength: 3,
							maxLength: 16,
							name: inputNames.postcode,
							placeholder: textsCap.postcodePlaceholder,
							required: true,
							type: 'text',
						},
					],
				},
				{
					name: 'group_state-country',
					type: 'group',
					inputs: [
						{
							label: textsCap.stateLabel,
							minLength: 2,
							maxLength: 64,
							name: inputNames.state,
							placeholder: textsCap.statePlaceholder,
							required: true,
							type: 'text',
						},
						{
							label: textsCap.countryLabel,
							name: inputNames.countryCode,
							options: arrSort(
								storage.countries.map(([_, { code, name }]) => ({
									description: code,
									flag: !noFlags.includes(code) ? code.toLowerCase() : '',
									key: code,
									text: name,
									value: code,
								})),
								'text'
							),
							placeholder: textsCap.countryPlaceholder,
							required: true,
							selection: true,
							search: ['description', 'text', 'code3'],
							type: 'dropdown',
						},
					]
				},
				this.isUpdate && {
					content: textsCap.remove,
					fluid: true,
					icon: 'trash',
					name: inputNames.removeBtn,
					negative: true,
					style: { textTransform: 'capitalize' },
					type: 'button',
					onClick: () => {
						const { id, modalId } = this.props
						// find identities that are associated with this locaiton
						const identities = getIdentities().filter(x => x.locationId === id)
						confirm({
							content: !identities.length ? '' : (
								<div>
									{textsCap.locationRemoveWarning}
									<ul>
										{identities.map(({ address, name }) => <li key={address}>{name}</li>)}
									</ul>
								</div>
							),
							header: textsCap.areYouSure,
							onConfirm: () => {
								const { onRemove } = this. props
								closeModal(modalId)
								remove(id)
								// remove location ID form associated identitites
								identities.forEach(x => saveIdentity(x.address, { ...x, locationId: null }))
								isFn(onRemove) && onRemove(id)
							},
							size: 'mini',
						})
					},
				}
			].filter(Boolean), location)
		}
	}

	handleChange = (e, values) => {
		const { autoSave, onChange } = this.props
		isFn(onChange) && onChange(e, values)
		// auto save if update
		if (!this.isUpdate || !autoSave) return
		// prevent saving without required fields
		if (!objHasKeys(values, Object.keys(requiredFields), true)) return
		this.handleSubmit(e, values)
	}

	handleSubmit = deferred((_, values) => {
		let { id, onSubmit } = this.props
		id = set(values, id)
		// new location created
		!this.isUpdate && this.setState({
			message: {
				content: textsCap.successMsg,
				icon: true,
				status: 'success',
			},
			success: true,
		})
		isFn(onSubmit) && onSubmit(true, values, id)
	}, 300)

    render = () => <FormBuilder {...{ ...this.props, ...this.state}} />
}
LocationForm.propTypes = {
	autoSave: PropTypes.bool,
	id: PropTypes.string,
	// callback to be invoked when location is removed
	onRemove: PropTypes.func,
	values: PropTypes.object
}
LocationForm.defaultProps = {
	autoSave: false,
	closeOnSubmit: true,
	size: 'tiny', // modal size
}