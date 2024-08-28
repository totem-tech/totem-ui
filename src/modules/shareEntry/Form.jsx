import React, { useState, Component } from 'react';
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
import { get, remove, set } from './shares'

const textsCap = {
	areYouSure: 'are you sure?',
	categoryLabel: 'share category',
	formHeaderCreate: 'add new share type',
	formHeaderUpdate: 'update share type',
	formSubheaderUpdate: 'changes will be auto-saved',
	partnerIdentityLabel: 'partner user ID',
	partnerNameLabel: 'partner name',
	priceLabel: 'price',
	quantityLabel: 'quantity of shares',
	remove: 'remove',
	removeShareType: 'remove share type',
	saved: 'saved',
	saveShareType: 'save share type',
	subCategoryLabel: 'share subcategory',
	typeLabel: 'type',
	typePlaceholder: 'give this share type a category name',
	usedByIdentities: 'this share type is used by the following identities:',
	usedByPartners: 'this share type is used by the following partners:',
	vestingLabel: 'vesting',
	votingLabel: 'voting',
}
translated(textsCap, true)

export const requiredFields = {
	type: 'type',
	category: 'category',
	quantity: 'quantity',
	voting: 'voting',
}
export const optionalFields = {
    price: 'price',
    subCategory: 'subcategory',
    vesting: 'vesting',
	partnerIdentity: 'partnerIdentity', // if owned by partner
}
export const inputNames = {
	...requiredFields,
	...optionalFields,
	autoSave: 'autoSave',
	partnerName: 'partnerName',
	removeBtn: 'removeBtn',
}

export default class ShareTypeFormOld extends Component {
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
		const share = get(id)
		values = { ...share, ...values }
		const { partnerIdentity } = values
		// const rxCountryCode = new BehaviorSubject()
		this.rxAutoSave = new BehaviorSubject(!!autoSave)
		this.isUpdate = !!share
		const partner = partners.get(partnerIdentity)
		// const noFlags = [
		// 	'aq',
		// 	'bl',
		// 	'bq',
		// 	'cw',
		// 	'gg',
		// 	'im',
		// 	'je',
		// 	'mf',
		// 	'ss',
		// 	'sx',
		// 	'xk',
		// ].map(x => x.toUpperCase())
		// const rxCountryDDOpen = new BehaviorSubject(false)
		const inputs = [
			// Partner Identity - text - hidden
			{
				hidden: true,
				name: inputNames.partnerIdentity,
				type: 'text',
				value: partnerIdentity,
			},
			// Autosave
			{
				hidden: true,
				name: inputNames.autoSave,
				rxValue: this.rxAutoSave,
			},
			// for display purposes only
			{
				hidden: !partner,
				label: textsCap.partnerNameLabel,
				name: inputNames.partnerName,
				readOnly: true,
				type: 'text',
				value: (partner || {}).name,
			},
			// share type - text - required - min 3 - max 64
			{
				label: textsCap.typeLabel,
				minLength: 3,
				maxLength: 64,
				type: inputNames.type,
				placeholder: textsCap.typePlaceholder,
				required: true,
				type: 'text',
			},
			// share quantity - number - required - min 3 - max 64
			{
				label: textsCap.quantityLabel,
				min: 0,
				maxLength: 18,
				name: inputNames.quantity,
				required: true,
				rxValue: new BehaviorSubject(),
				type: 'number',
			},
			// Share category - dropdown - required
			{
				label: textsCap.categoryLabel,
				// minLength: 3,
				// maxLength: 64,
				name: inputNames.category,
				onChange: this.handleShareCategoryChange,
				required: true,
				rxValue: new BehaviorSubject(),
				type: 'dropdown',
			},
			// Share subcategory - dropdown - required
			{
				label: textsCap.subCategoryLabel,
				// minLength: 3,
				// maxLength: 64,
				name: inputNames.subCategory,
				onChange: this.handleSubcategoryChange,
				required: true,
				rxValue: new BehaviorSubject(),
				type: 'dropdown',
			},
			// Share voting - dropdown - required
			{
				label: textsCap.votingLabel,
				// minLength: 3,
				// maxLength: 64,
				name: inputNames.voting,
				onChange: this.handleInputChange,
				required: true,
				rxValue: new BehaviorSubject(),
				type: 'dropdown',
			},
			// Share vesting - dropdown - required
			{
				label: textsCap.vestingLabel,
				// minLength: 3,
				// maxLength: 64,
				name: inputNames.vesting,
				onChange: this.handleInputChange,
				required: true,
				rxValue: new BehaviorSubject(),
				type: 'dropdown',
			},
			// show remove button if share is already saved
			{
				content: textsCap.removeShareType,
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
					: textsCap.saveShareType,
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
			// new share created
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
			identities.search({ shareId: id })
		)
		const partnerMatches = Array.from(
			partners.search({ shareId: id })
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

			// remove share from storage
			remove(id)

			// remove share ID from associated identitites and partners
			identityMatches
				.forEach(([key, value]) =>
					identities.set(key, {
						...value,
						shareId: null,
					})
				)
			partnerMatches
				.forEach(([key, value]) =>
					partners.set({
						...value,
						shareId: null,
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
			header: textsCap.removeShareType,
			onConfirm: handleConfirm,
			size: 'mini',
		})
	}

	handleSubmit = deferred((_, values) => {
		const { onSubmit } = this.props
		this.id = set(values, this.id)
		// new share created
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
ShareTypeFormOld.propTypes = {
	autoSave: PropTypes.bool,
	id: PropTypes.string,
	// callback to be invoked when share is removed
	onRemove: PropTypes.func,
	values: PropTypes.object,
}
ShareTypeFormOld.defaultProps = {
	closeOnSubmit: true,
	size: 'tiny', // modal size
}
