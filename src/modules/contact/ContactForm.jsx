import React from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import FormBuilder, {
	checkFormInvalid,
	fillValues,
	findInput,
} from '../../components/FormBuilder'
import { closeModal, confirm } from '../../services/modal'
import { translated } from '../../utils/languageHelper'
import { iUseReducer } from '../../utils/reactHelper'
import storage from '../../utils/storageHelper'
import { arrSort, isFn, objSetPropUndefined } from '../../utils/utils'
import identities from '../identity/identity'
import { get, newId, remove, set as save, validationConf } from './contact'
import partners from '../partner/partner'

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
		update: 'update',
		usedByIdentites: 'this contact is used by the following identities:',
	},
	true
)[1]
export const inputNames = {
	email: 'email',
	id: 'id',
	partnerIdentity: 'partnerIdentity',
	name: 'name',
	phoneNumber: 'phoneNumber',
	phoneCode: 'phoneCode',
	phoneGroup: 'phoneGroup',
	removeBtn: 'removeBtn',
}

export default function ContactForm(props) {
	const [state = []] = iUseReducer(null, rxSetState => {
		let { autoSave, onChange, onSubmit, submitText, values = {} } = props
		// generate a random ID if not already provided
		objSetPropUndefined(values, inputNames.id, newId())
		const id = values[inputNames.id]
		let existingEntry = get(id)
		values = { ...existingEntry, ...values }
		const partnerIdentity = values[inputNames.partnerIdentity]
		autoSave = existingEntry && autoSave !== false
		const countryOptions = storage.countries
			.map(([_, country]) => {
				let { altSpellings = [], code, name, phoneCode } = country
				return {
					search: [phoneCode, name, ...altSpellings].join(' '),
					description: code,
					key: code,
					value: phoneCode,
					text: phoneCode,
					title: name,
				}
			})
			.filter(x => !!x.value)
		const getSubmitText = () => submitText || submitText === null 
			? submitText
			: !!existingEntry
				? textsCap.update
				: undefined
		const inputs = [
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
				options: Array.from(partners.getAll()).map(([address, p]) => ({
					text: p.name,
					value: address,
				})),
				selection: true,
				type: 'dropdown',
			},
			{
				...validationConf.email,
				label: textsCap.emailLabel,
				name: inputNames.email,
				placeholder: textsCap.emailPlaceholder,
				required: true,
			},
			{
				name: inputNames.phoneGroup,
				type: 'group',
				unstackable: true,
				inputs: [
					{
						autoComplete: 'off',
						input: <input autoComplete='off' />,
						label: textsCap.phoneCodeLabel,
						name: inputNames.phoneCode,
						options: arrSort(countryOptions, 'description'),
						placeholder: textsCap.phoneCodePlaceholder,
						search: ['search'],
						selection: true,
						style: { minWidth: 100 },
						styleContainer: { paddingRight: 0 },
						type: 'dropdown',
						width: 7,
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
						onChange: (_, values) => {
							const pccInput = findInput(
								state.inputs,
								inputNames.phoneCode
							)
							const required = !!values[inputNames.phoneNumber]
							if (pccInput.required === required) return
							pccInput.required = required
							rxSetState.next({ ...state })
						},
						placeholder: '123456',
						regex: /^[1-9][0-9\ ]+$/,
						styleContainer: { paddingLeft: 0 },
						type: 'text',
						width: 9,
					},
				],
			},
			{
				content: textsCap.removeContact,
				fluid: true,
				hidden: () => !existingEntry,
				icon: 'trash',
				name: inputNames.removeBtn,
				negative: true,
				onClick: () => {
					const { modalId } = props
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
					confirm({
						header: textsCap.removeContact,
						content: content,
						confirmButton: {
							content: textsCap.remove,
							negative: true,
						},
						onConfirm: () => {
							modalId && closeModal(modalId)
							remove(id)
						},
						size: 'mini',
					})
				},
				styleContainer: { textAlign: 'center' },
				type: 'button',
			},
		]

		const state = {
			header: !existingEntry
				? textsCap.headerCreate
				: textsCap.headerUpdate,
			inputs: fillValues(inputs, { ...existingEntry, ...values }),
			onChange: (...args) => {
				const [e, values, invalid] = args
				const id = values[inputNames.id]
				if (invalid) return

				isFn(onChange) && onChange(...args)

				if (!autoSave) return
				save(values)

				isFn(onSubmit) && onSubmit(!invalid, values, id)
				autoSave = props.autoSave
			},
			onSubmit: (e, values) => {
				existingEntry = values
				const id = values[inputNames.id]
				// save to separate local stoarge
				save(values)

				autoSave = props.autoSave
				const s = {
					...state,
					header: textsCap.headerUpdate,
					submitText: getSubmitText(),
					success: true,
				}
				console.log({state:s})
				rxSetState.next(s)
				isFn(onSubmit) && onSubmit(true, values, id)
			},
			submitText: getSubmitText(),
		}

		if (autoSave) {
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
	autoSave: true,
	closeOnSubmit: true,
	size: 'mini',
	submitText: textsCap.saveContact,
}

// showForm(ContactDetailsForm)
