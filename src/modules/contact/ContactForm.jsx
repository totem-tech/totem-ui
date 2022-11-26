import React from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import { translated } from '../../utils/languageHelper'
import { iUseReducer } from '../../utils/reactHelper'
import storage from '../../utils/storageHelper'
import FormBuilder, { fillValues, findInput } from '../../components/FormBuilder'
import FormInput from '../../components/FormInput'
import { statuses } from '../../components/Message'
import { closeModal, confirm } from '../../services/modal'
import {
	arrSort,
	deferred,
	isFn,
	objSetPropUndefined,
} from '../../utils/utils'
import identities from '../identity/identity'
import partners, { rxPartners } from '../partner/partner'
import PartnerIcon from '../partner/PartnerIcon'
import {
	get,
	newId,
	remove,
	set as save,
	validationConf,
} from './contact'
import getPartnerOptions from '../partner/getPartnerOptions'

const textsCap = translated(
	{
		emailLabel: 'email',
		emailPlaceholder: 'enter email address',
		headerCreate: 'new contact details',
		headerUpdate: 'update contact details',
		subheaderUpdate: 'changes will be auto-saved',
		nameLabel: 'contact name',
		namePlaceholder: 'enter a name for this contact',
		partnerIdentityLabel: 'associated partner',
		phoneCodeLabel: 'phone number',
		phoneCodePlaceholder: 'country',
		remove: 'remove',
		removeContact: 'remove contact',
		saveContact: 'save contact',
		saved: 'saved',
		update: 'update',
		usedByIdentites: 'this contact is used by the following identities:',
	},
	true
)[1]
export const inputNames = {
	autoSave: 'autoSave',
	email: 'email',
	id: 'id',
	isUpdate: 'isUpdate',
	partnerIdentity: 'partnerIdentity',
	name: 'name',
	phoneNumber: 'phoneNumber',
	phoneCode: 'phoneCode',
	phoneGroup: 'phoneGroup',
	removeBtn: 'removeBtn',
}

export default function ContactForm(props) {
	const [state = []] = iUseReducer(null, rxSetState => {
		let {
			autoSave,
			onChange,
			onSubmit,
			submitText,
			values = {},
		} = props
		// generate a random ID if not already provided
		objSetPropUndefined(
			values,
			inputNames.id,
			newId(),
		)
		const id = values[inputNames.id]
		let existingEntry = get(id)
		values = { ...existingEntry, ...values }
		const rxIsUpdate = new BehaviorSubject(!!existingEntry)
		const partnerIdentity = values[inputNames.partnerIdentity]
		const countryOptions = storage
			.countries
			.map(([_, c]) => ({
				search: [
					c.phoneCode,
					c.name,
					...c.altSpellings,
				].join(' '),
				description: c.code,
				key: c.code,
				value: c.phoneCode,
				text: c.phoneCode,
				title: c.name,
			}))
			.filter(x => !!x.value)
		const getSubmitText = () => submitText || submitText === null 
			? submitText
			: !!rxIsUpdate.value
				? textsCap.update
				: undefined
		const handleRemoveContact = () => {
			const { modalId, onRemove } = props
			const { id, partnerIdentity } = values
			let content
			if (!partnerIdentity) {
				// find identities that are associated with this contact
				const identityMatches = Array.from(
					identities.search({ contactId: id }, true)
				)
				content = (
					<div>
						{identityMatches.length > 0 && (
							<div>
								<b>{textsCap.usedByIdentites}</b>
								<ul>
									{identityMatches.map(([id, x]) => (
										<li key={id}>{x.name}</li>
									))}
								</ul>
							</div>
						)}
					</div>
				)
			}
			const handleConfirm = () => {
				// empty the form if not on a modal
				const autoSave = rxAutoSave.value
				const names2Empty = [
					[inputNames.autoSave, false],
					[inputNames.isUpdate, false],
					[inputNames.email],
					[inputNames.phoneCode],
					[inputNames.phoneNumber],
				]
				names2Empty.forEach(([name, value = '']) => {
					const { rxValue } = findInput(inputs, name)
					rxValue && rxValue.next(value)
				})
				autoSave && rxAutoSave.next(true)
				// close if on a modal
				modalId && closeModal(modalId)
				remove(id)
				isFn(onRemove) && onRemove(id, values)
			}
			confirm({
				header: textsCap.removeContact,
				content: content,
				confirmButton: {
					content: textsCap.remove,
					negative: true,
				},
				onConfirm: handleConfirm,
				size: 'mini',
			})
		}
		const rxPhoneCode = new BehaviorSubject()
		const rxAutoSave = new BehaviorSubject(!!autoSave)
		const inputs = [
			{
				hidden: true,
				name: inputNames.isUpdate,
				rxValue: rxIsUpdate,
			},
			{
				hidden: true,
				name: inputNames.autoSave,
				rxValue: rxAutoSave,
			},
			{
				...validationConf.name,
				label: textsCap.nameLabel,
				name: inputNames.name,
				placeholder: textsCap.namePlaceholder,
			},
			{
				hidden: true,
				name: inputNames.id,
			},
			{
				disabled: true,
				hidden: !partnerIdentity,
				label: textsCap.partnerIdentityLabel,
				name: inputNames.partnerIdentity,
				rxOptions: rxPartners,
				rxOptionsModifier: getPartnerOptions,
				selection: true,
				type: 'dropdown',
			},
			{
				...validationConf.email,
				label: textsCap.emailLabel,
				name: inputNames.email,
				placeholder: textsCap.emailPlaceholder,
				required: true,
				rxValue: new BehaviorSubject(),				
			},
			{
				name: inputNames.phoneGroup,
				type: 'group',
				unstackable: true,
				inputs: [
					{
						content: (
							<FormInput {...{
								autoComplete: 'off',
								clearable: true,
								input: <input autoComplete='off' />,
								label: textsCap.phoneCodeLabel,
								name: inputNames.phoneCode,
								options: arrSort(countryOptions, 'description'),
								placeholder: textsCap.phoneCodePlaceholder,
								rxValue: rxPhoneCode,
								search: ['search'],
								selection: true,
								style: { minWidth: 100 },
								styleContainer: { paddingRight: 0 },
								type: 'dropdown',
								width: 7,
							}} />
						),
						name: inputNames.phoneCode,
						type: 'html',
						rxValue: rxPhoneCode,
						validate: (e, { value: code }, values) => {
							const phone = values[inputNames.phoneNumber]
							return phone && !code
						},
					},
					{
						...validationConf.phoneNumber,
						customMessages: {
							lengthMin: null,
							regex: null,
						},
						label: <br />,
						maxLength: validationConf.phoneNumber.maxLength,
						name: inputNames.phoneNumber,
						placeholder: '123456',
						regex: /^[1-9][0-9\ ]+$/,
						rxValue: new BehaviorSubject(),
						styleContainer: { paddingLeft: 0 },
						type: 'text',
						validate: (e, { value: phone }, values) => {
							const code = values[inputNames.phoneCode]
							return code && !phone
						},
						width: 9,
					},
				],
			},
			{
				content: textsCap.removeContact,
				fluid: true,
				hidden: values => !values[inputNames.isUpdate],
				icon: 'trash',
				name: inputNames.removeBtn,
				negative: true,
				onClick: handleRemoveContact,
				styleContainer: { textAlign: 'center' },
				type: 'button',
			},
		]

		const state = {
			header: !rxIsUpdate.value
				? textsCap.headerCreate
				: textsCap.headerUpdate,
			inputs: fillValues(inputs, values, false),
			onChange: deferred((...args) => {
				const [e, values, invalid] = args
				if (invalid) return
				
				isFn(onChange) && onChange(...args)
				if (!rxAutoSave.value) return
				
				const id = values[inputNames.id]
				const saved = !!save(values, false, true)
				if (!saved) return

				isFn(onSubmit) && onSubmit(!invalid, values, id)
				!rxIsUpdate.value && rxIsUpdate.next(true)
			}, 300),
			onSubmit: (e, values) => {
				!rxIsUpdate.value && rxIsUpdate.next(true)
				const id = values[inputNames.id]
				// save to separate local stoarge
				save(values)

				const s = {
					...state,
					header: textsCap.headerUpdate,
					message: !rxAutoSave.value
						? undefined
						: { 
							header: textsCap.saved,
							status: statuses.SUCCESS,
						},
					submitText: rxAutoSave.value
						? null
						: getSubmitText(),
					success: true,
				}
				rxSetState.next(s)
				isFn(onSubmit) && onSubmit(true, values, id)
				rxAutoSave.value && setTimeout(() => rxSetState.next({
					...s,
					message: undefined,
				}), 2000)
			},
			submitText: getSubmitText(),
		}

		if (rxAutoSave.value) {
			state.closeText = null
			state.subheader = textsCap.subheaderUpdate
			state.submitText = null
		}
		return state
	})

	return <FormBuilder {...{ ...props, ...state }} />
}
ContactForm.propTypes = {
	autoSave: PropTypes.bool,
	values: PropTypes.shape({
		email: PropTypes.string,
		id: PropTypes.string,
		partnerIdentity: PropTypes.string,
		name: PropTypes.string,
		phoneCode: PropTypes.string,
		phoneNumber: PropTypes.string,
	}),
}
ContactForm.defaultProps = {
	autoSave: false,
	closeOnSubmit: true,
	size: 'mini',
}

// showForm(ContactDetailsForm)
