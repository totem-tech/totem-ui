import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { arrSort, deferred, isBool, isFn, objHasKeys } from '../../utils/utils'
import FormBuilder, { fillValues } from '../../components/FormBuilder'
import { translated } from '../../services/language'
import { closeModal, confirm } from '../../services/modal'
import storage from '../../services/storage'
import identities from '../identity/identity'
import partners from '../partner/partner'
import { get, remove, set } from './location'

const textsCap = translated(
	{
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
		nameLabel: 'location name',
		namePlaceholder: 'enter a name for this location',
		partnerIdentityLabel: 'partner user ID',
		partnerNameLabel: 'partner name',
		postcodeLabel: 'postcode or zip',
		postcodePlaceholder: 'enter your postcode or zip',
		remove: 'remove',
		removeLocation: 'remove location',
		saveLocation: 'save location',
		stateLabel: 'state or province',
		statePlaceholder: 'enter your state or province',
		usedByIdentities: 'this location is used by the following identities:',
		usedByPartners: 'this location is used by the following partners:',
	},
	true
)[1]

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
	groupCityPostcode: 'groupCityPostcode',
	groupStateCountry: 'groupStateCountry',
}

export default class LocationForm extends Component {
	constructor(props) {
		super(props)

		let {
			autoSave,
			closeOnDimmerClick,
			closeOnEscape,
			closeText,
			header,
			id,
			subheader,
			submitText,
			values,
		} = props
		const location = get(id)
		values = { ...location, ...values }
		const { partnerIdentity } = values
		this.isUpdate = !!location
		const partner = partners.get(partnerIdentity)
		const noFlags = [
			'aq',
			'bl',
			'bq',
			'cw',
			'gg',
			'im',
			'je',
			'mf',
			'ss',
			'sx',
			'xk',
		].map(x => x.toUpperCase())
		autoSave = isBool(autoSave) ? autoSave : this.isUpdate
		this.state = {
			closeOnDimmerClick: isBool(closeOnDimmerClick)
				? closeOnDimmerClick
				: autoSave,
			closeOnEscape: isBool(closeOnEscape) ? closeOnEscape : autoSave,
			closeText: closeText || (autoSave ? null : undefined),
			header:
				header ||
				(this.isUpdate
					? textsCap.formHeaderUpdate
					: textsCap.formHeaderCreate),
			onChange: this.handleChange,
			onSubmit: this.handleSubmit,
			subheader:
				subheader ||
				(!this.isUpdate || !autoSave ? (
					''
				) : (
					<span style={{ color: 'grey' }}>
						{' '}
						{textsCap.formSubheaderUpdate}
					</span>
				)),
			submitText:
				submitText === null || submitText
					? submitText
					: this.isUpdate && autoSave
					? null
					: textsCap.saveLocation,
			inputs: fillValues(
				[
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
						name: inputNames.groupCityPostcode,
						type: 'group',
						unstackable: true,
						// widths: 'equal',
						inputs: [
							{
								label: textsCap.cityLabel,
								minLength: 3,
								maxLength: 64,
								name: inputNames.city,
								placeholder: textsCap.cityPlaceholder,
								required: true,
								type: 'text',
								width: 8,
							},
							{
								label: textsCap.postcodeLabel,
								minLength: 3,
								maxLength: 16,
								name: inputNames.postcode,
								placeholder: textsCap.postcodePlaceholder,
								required: true,
								type: 'text',
								width: 8,
							},
						],
					},
					{
						name: inputNames.groupStateCountry,
						type: 'group',
						unstackable: true,
						// widths: 'equal',
						inputs: [
							{
								label: textsCap.stateLabel,
								minLength: 2,
								maxLength: 64,
								name: inputNames.state,
								placeholder: textsCap.statePlaceholder,
								required: true,
								type: 'text',
								width: 8,
							},
							{
								label: textsCap.countryLabel,
								name: inputNames.countryCode,
								options: arrSort(
									storage.countries.map(([_, c]) => ({
										altspellings: c.altSpellings.join(' '),
										// description: c.code,
										flag: !noFlags.includes(c.code)
											? c.code.toLowerCase()
											: '',
										key: c.code,
										name: c.name,
										text: c.code,
										value: c.code,
									})),
									'text'
								),
								placeholder: textsCap.countryPlaceholder,
								required: true,
								selection: true,
								search: ['name', 'altspellings'],
								style: {
									minWidth: 120,
								},
								type: 'dropdown',
								width: 8,
							},
						],
					},
					// show remove button if location is already saved
					this.isUpdate && {
						content: textsCap.removeLocation,
						fluid: true,
						icon: 'trash',
						name: inputNames.removeBtn,
						negative: true,
						style: { textTransform: 'capitalize' },
						type: 'button',
						onClick: () => {
							const { id, modalId } = this.props
							// find identities and partners that are associated with this locaiton
							const identityMatches = Array.from(
								identities.search({ locationId: id })
							)
							const partnerMatches = Array.from(
								partners.search({ locationId: id })
							)
							const content = (
								<div>
									{identityMatches.length && (
										<div>
											{textsCap.usedByIdentities}
											<ul>
												{identityMatches.map(
													([_, x]) => (
														<li key={x.address}>
															{x.name}
														</li>
													)
												)}
											</ul>
										</div>
									)}
									{partnerMatches.length && (
										<div>
											{textsCap.usedByPartners}
											<ul>
												{partnerMatches.map(
													([_, x]) => (
														<li key={x.address}>
															{x.name}
														</li>
													)
												)}
											</ul>
										</div>
									)}
								</div>
							)
							const handleConfirm = () => {
								const { onRemove } = this.props
								closeModal(modalId)
								remove(id)
								// remove location ID form associated identitites and partners
								identityMatches.forEach(([key, value]) =>
									identities.set(key, {
										...value,
										locationId: null,
									})
								)
								partnerMatches.forEach(([key, value]) =>
									partners.set({
										...value,
										locationId: null,
									})
								)
								isFn(onRemove) && onRemove(id)
							}
							confirm({
								content,
								confirmButton: {
									content: textsCap.remove,
									negative: true,
								},
								header: textsCap.areYouSure,
								onConfirm: handleConfirm,
								size: 'mini',
							})
						},
					},
				].filter(Boolean),
				values,
			),
		}
	}

	handleChange = (e, values, invalid) => {
		const { autoSave, onChange } = this.props
		isFn(onChange) && onChange(e, values)
		// auto save if update
		if (invalid || !this.isUpdate || !autoSave) return
		// prevent saving without required fields
		if (!objHasKeys(values, Object.keys(requiredFields), true)) return
		this.handleSubmit(e, values)
	}

	handleSubmit = deferred((_, values) => {
		let { id, onSubmit } = this.props
		id = set(values, id)
		// new location created
		!this.isUpdate &&
			this.setState({
				subheader: textsCap.formSubheaderUpdate,
				success: true,
				submitText: null,
			})
		isFn(onSubmit) && onSubmit(true, values, id)
	}, 300)

	render = () => <FormBuilder {...{ ...this.props, ...this.state }} />
}
LocationForm.propTypes = {
	autoSave: PropTypes.bool,
	id: PropTypes.string,
	// callback to be invoked when location is removed
	onRemove: PropTypes.func,
	values: PropTypes.object,
}
LocationForm.defaultProps = {
	closeOnSubmit: true,
	size: 'mini', // modal size
}
