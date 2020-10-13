import React, { Component } from 'react'
import PropTypes from 'prop-types'
import FormBuilder, { fillValues } from '../../components/FormBuilder'
import { arrSort, deferred, isFn, isObj } from '../../utils/utils'
import { translated } from '../../services/language'
import { closeModal, confirm } from '../../services/modal'
import storage from '../../services/storage'
import { getAll as getIdentities, set as saveIdentity } from './identity'
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
	postcodeLabel: 'postcode or zip',
	postcodePlaceholder: 'enter your postcode or zip',
	remove: 'remove location',
	stateLabel: 'state or province',
	statePlaceholder: 'enter your state or province',
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
}
export const inputNames = { ...requiredFields, ...optionalFields }

export default class LocationForm extends Component {
	constructor(props) {
		super(props)

		const { header, id, subheader } = props
		const location = get(id)
		this.isUpdate = !!id && !!location
		
		this.state = {
			closeText: !this.isUpdate ? undefined : { negative: false },
			header: header || (this.isUpdate ? textsCap.formHeaderUpdate : textsCap.formHeaderCreate),
			onChange: this.handleChange,
			onSubmit: this.handleSubmit,
			subheader: subheader || (this.isUpdate ? textsCap.formSubheaderUpdate : undefined),
			submitText: this.isUpdate ? null : undefined,
			inputs: fillValues([
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
						storage.countries.toArray().map(([_, { code, name }]) => ({
							description: code,
							key: code,
							text: name,
							value: code,
						})),
						'text'
					),
					placeholder: textsCap.countryPlaceholder,
					required: true,
					selection: true,
					search: ['description', 'text'],
					type: 'dropdown',
				},
				{
					content: textsCap.remove,
					fluid: true,
					hidden: !this.isUpdate,
					icon: 'trash',
					name: 'removeBtn',
					negative: true,
					style: { textTransform: 'capitalize' },
					type: 'button',
					onClick: () => {
						const { id, modalId } = this.props
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
								closeModal(modalId)
								remove(id)
								identities.forEach(x => saveIdentity(
									x.address,
									{...x, locationId: null}
								))
							},
							size: 'mini',
						})
					},
				}
			], location)
		}
	}

	handleChange = (e, values) => {
		const { onChange } = this.props
		isFn(onChange) && onChange(e, values)
		// auto save if update
		this.isUpdate && this.handleSubmit(e, values)
	}

	handleSubmit = deferred((_, values) => {
		const { id, onSubmit } = this.props
		set(values, id)
		!this.isUpdate && this.setState({ success: true})
		isFn(onSubmit) && onSubmit(true, values)
	}, 300)

    render = () => <FormBuilder {...{ ...this.props, ...this.state}} />
}
LocationForm.propTypes = {
	id: PropTypes.string,
}
LocationForm.defaultProps = {
	size: 'tiny', // modal size
}