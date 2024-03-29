import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import FormBuilder, { fillValues, findInput } from '../../components/FormBuilder'
import FormInput from '../../components/FormInput'
import { translated } from '../../utils/languageHelper'
import { closeModal, confirm } from '../../services/modal'
import { statuses } from '../../utils/reactjs'
import storage from '../../utils/storageHelper'
import {
	arrSort,
	deferred,
	isBool,
	isFn,
} from '../../utils/utils'
import identities from '../identity/identity'
import partners from '../partner/partner'
import { get, remove, set } from './location'

const textsCap = {
	addressLine1Label: 'address line 1',
	addressLine1Placeholder: 'Eg: 123A Street',
	addressLine2Label: 'address line 2',
	areYouSure: 'are you sure?',
	cityLabel: 'city',
	cityPlaceholder: 'enter your city',
	countryLabel: 'country code',
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
	saved: 'saved',
	saveLocation: 'save location',
	stateLabel: 'state or province',
	statePlaceholder: 'enter your state or province',
	usedByIdentities: 'this location is used by the following identities:',
	usedByPartners: 'this location is used by the following partners:',
}
translated(textsCap, true)

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
	autoSave: 'autoSave',
	groupCityPostcode: 'groupCityPostcode',
	groupStateCountry: 'groupStateCountry',
	partnerName: 'partnerName',
	removeBtn: 'removeBtn',
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
		this.id = id
		const location = get(id)
		values = { ...location, ...values }
		const { partnerIdentity } = values
		const rxCountryCode = new BehaviorSubject()
		this.rxAutoSave = new BehaviorSubject(!!autoSave)
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
		const rxCountryDDOpen = new BehaviorSubject(false)
		const inputs = [
			{
				hidden: true,
				name: inputNames.partnerIdentity,
				type: 'text',
				value: partnerIdentity,
			},
			{
				hidden: true,
				name: inputNames.autoSave,
				rxValue: this.rxAutoSave,
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
				rxValue: new BehaviorSubject(),
				type: 'text',
			},
			{
				label: textsCap.addressLine2Label,
				minLength: 3,
				maxLength: 64,
				name: inputNames.addressLine2,
				required: false,
				rxValue: new BehaviorSubject(),
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
						rxValue: new BehaviorSubject(),
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
						rxValue: new BehaviorSubject(),
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
						rxValue: new BehaviorSubject(),
						type: 'text',
						width: 8,
					},
					{
						hidden: true,
						name: inputNames.countryCode,
						rxValue: rxCountryCode,
					},
					{
						content: (
							<FormInput {...{
								label: textsCap.countryLabel,
								name: inputNames.countryCode,
								onClose: () => rxCountryDDOpen.next(false),
								onOpen: () => rxCountryDDOpen.next(true),
								options: arrSort(
									storage.countries.map(([_, c]) => ({
										altspellings: c.altSpellings.join(' '),
										description: c.name,
										flag: !noFlags.includes(c.code)
											? c.code.toLowerCase()
											: '',
										key: c.code,
										name: c.name,
										text: c.code,
										// text: (
										// 	<Reveal {...{
										// 		content: c.code,
										// 		contentHidden: ` - ${c.name}`,
										// 		El: 'div',
										// 		style: {
										// 			display: 'inline-block',
										// 			whiteSpace: 'pre-wrap'
										// 		},
										// 	}} />
										// ),
										value: c.code,
									})),
									'text'
								),
								placeholder: textsCap.countryPlaceholder,
								required: true,
								rxValue: rxCountryCode,
								selection: true,
								search: ['name', 'altspellings'],
								style: {
									minWidth: 120,
								},
								type: 'dropdown',
								width: 8,
							}} />
						),
						name: inputNames.countryCode + '-html',
						type: 'html',
					},
				],
			},
			// show remove button if location is already saved
			{
				content: textsCap.removeLocation,
				fluid: true,
				hidden: () => !this.isUpdate,
				icon: 'trash',
				name: inputNames.removeBtn,
				negative: true,
				style: { textTransform: 'capitalize' },
				type: 'button',
				onClick: this.handleRemove,
			},
		].filter(Boolean)
		this.state = {
			closeOnDimmerClick: isBool(closeOnDimmerClick)
				? closeOnDimmerClick
				: autoSave,
			closeOnEscape: isBool(closeOnEscape)
				? closeOnEscape
				: autoSave,
			closeText: closeText || closeText === null
				? closeText
				: autoSave
					? null
					: undefined,
			header: header || (
				this.isUpdate
					? textsCap.formHeaderUpdate
					: textsCap.formHeaderCreate
			),
			onChange: this.handleChange,
			onSubmit: this.handleSubmit,
			subheader: subheader || (
				!this.isUpdate || !autoSave
					? ''
					: (
						<span style={{ color: 'grey' }}>
							{' ' + textsCap.formSubheaderUpdate}
						</span>
					)
			),
			submitText: submitText === null || submitText
				? submitText
				: autoSave
					? null
					: textsCap.saveLocation,
			inputs: fillValues(inputs, values),
		}
	}

	handleChange = (e, values, invalid) => {
		if (invalid) return

		this.values = values
		const { onChange, onSubmit } = this.props
		isFn(onChange) && onChange(e, values)
		if (!this.rxAutoSave.value) return

		const saved = !!set(values, this.id)
		if (!saved) return

		if (!this.isUpdate) {
			// new location created
			this.isUpdate = true
			this.setState({
				subheader: textsCap.formSubheaderUpdate,
				success: true,
				submitText: null,
			})
		}
		isFn(onSubmit) && onSubmit(true, values, this.id)
	}

	handleRemove = () => {
		const { id, modalId, onRemove } = this.props
		// find identities and partners that are associated with this locaiton
		const identityMatches = Array.from(
			identities.search({ locationId: id })
		)
		const partnerMatches = Array.from(
			partners.search({ locationId: id })
		)
		const total = identityMatches.length + partnerMatches.length
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
			const autoSave = this.rxAutoSave.value
			this.isUpdate = false
			const names2Empty = [
				[inputNames.autoSave, false],
				[inputNames.addressLine1],
				[inputNames.addressLine2],
				[inputNames.city],
				[inputNames.postcode],
				[inputNames.state],
				[inputNames.countryCode],
			]
			names2Empty.forEach(x => {
				const [name, value = ''] = x
				const { rxValue } = findInput(this.state.inputs, name)
				rxValue && rxValue.next(value)
			})
			autoSave && this.rxAutoSave.next(true)

			// close if on a modal
			modalId && closeModal(modalId)

			// remove location from storage
			remove(id)

			// remove location ID from associated identitites and partners
			identityMatches
				.forEach(([key, value]) =>
					identities.set(key, {
						...value,
						locationId: null,
					})
				)
			partnerMatches
				.forEach(([key, value]) =>
					partners.set({
						...value,
						locationId: null,
					})
				)
			isFn(onRemove) && onRemove(id, this.values)
		}
		confirm({
			content: !total
				? textsCap.areYouSure
				: content,
			confirmButton: {
				content: textsCap.remove,
				negative: true,
			},
			header: textsCap.removeLocation,
			onConfirm: handleConfirm,
			size: 'mini',
		})
	}

	handleSubmit = deferred((_, values) => {
		const { onSubmit } = this.props
		this.id = set(values, this.id)
		// new location created
		!this.isUpdate && this.setState({
			message: !this.rxAutoSave.value
				? undefined
				: {
					header: textsCap.saved,
					status: statuses.SUCCESS,
				},
			subheader: textsCap.formSubheaderUpdate,
			success: true,
			submitText: null,
		})
		isFn(onSubmit) && onSubmit(true, values, this.id)
		!this.isUpdate
			&& this.rxAutoSave.value
			&& setTimeout(() => this.setState({
				message: undefined,
			}), 2000)
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
	size: 'tiny', // modal size
}
