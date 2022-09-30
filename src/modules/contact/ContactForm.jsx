import React from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import FormBuilder, {
	checkFormInvalid,
	fillValues,
	findInput,
} from '../../components/FormBuilder'
import { showForm } from '../../services/modal'
import { translated } from '../../utils/languageHelper'
import { iUseReducer } from '../../utils/reactHelper'
import storage from '../../utils/storageHelper'
import { arrSort, isBool, isFn, objSetPropUndefined } from '../../utils/utils'
import { get, newId, set as save, validationConf } from '.'

const textsCap = translated(
	{
		emailLabel: 'email',
		emailPlaceholder: 'enter email address',
		headerCreate: 'new contact details',
		headerUpdate: 'update contact details',
		subheaderUpdate: 'changes will be auto-saved',
		nameLabel: 'name',
		namePlaceholder: 'enter a name',
		phoneCodeLabel: 'phone number',
		phoneCodePlaceholder: 'country',
		update: 'update',
	},
	true
)[1]
export const inputNames = {
	email: 'email',
	id: 'id',
	partnerAddress: 'partnerAddress',
	name: 'name',
	phoneNumber: 'phoneNumber',
	phoneCode: 'phoneCode',
	phoneGroup: 'phoneGroup',
}

export default function ContactDetailsForm(props) {
	const [state = []] = iUseReducer(null, rxSetState => {
		let { autosave, onChange, onSubmit, values = {} } = props
		// generate a random ID if not already provided
		objSetPropUndefined(values, 'id', newId())
		const { id } = values
		const existingEntry = get(id)
		autosave = existingEntry && autosave !== false
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
				hidden: true,
				name: inputNames.partnerAddress,
			},
			{
				...validationConf.email,
				label: textsCap.emailLabel,
				name: inputNames.email,
				placeholder: textsCap.emailPlaceholder,
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
		]

		const state = {
			header: !existingEntry
				? textsCap.headerCreate
				: textsCap.headerUpdate,
			inputs: fillValues(inputs, { ...existingEntry, ...values }),
			onChange: (...args) => {
				const [e, values, invalid] = args
				if (invalid) return
				if (autosave) {
					save(values)
					isFn(onSubmit) && onSubmit(e, values)
					autosave = props.autosave
				}
				isFn(onChange) && onChange(...args)
			},
			onSubmit: (...args) => {
				const [_, values] = args
				isFn(onSubmit) && onSubmit(...args)
				// save to separate local stoarge
				save(values)

				rxSetState.next({
					...state,
					header: textsCap.headerUpdate,
					submitText: textsCap.update,
				})
			},
		}

		if (autosave) {
			state.closeText = null
			state.subheader = textsCap.subheaderUpdate
			state.submitText = null
		}
		return state
	})

	return <FormBuilder {...{ ...props, ...state }} />
}
ContactDetailsForm.propTypes = {
	autosave: PropTypes.bool,
	values: PropTypes.shape({
		email: PropTypes.string,
		id: PropTypes.string,
		partnerAddress: PropTypes.string,
		name: PropTypes.string,
		phoneCode: PropTypes.string,
		phoneNumber: PropTypes.string,
	}),
}
ContactDetailsForm.defaultProps = {
	autosave: true,
	// values: { id: '3a6c4ea06ba9' },
	size: 'mini',
}

// showForm(ContactDetailsForm)
