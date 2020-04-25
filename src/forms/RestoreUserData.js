import React, { Component } from 'react'
import { Icon } from 'semantic-ui-react'
import FormBuilder, { findInput, showMessage } from '../components/FormBuilder'
import { objClean, textCapitalize, isValidNumber } from '../utils/utils'
import { getUser } from '../services/chatClient'
import { translated } from '../services/language'
import { essentialKeys, generateBackupData } from '../services/storage'

const [_, textsCap] = translated({
	fileLabel: 'restore file',
	formHeader: 'restore backup',
}, true)
export default class RestoreUserData extends FormBuilder {
	constructor(props) {
		super(props)

		this.names = {
			file: 'file',
			restoreOpitons: 'restoreOptions',
		}
		this.backupData = null
		this.existingData = null
		this.state = {
			onSumbit: this.handleSumbitFile,
			submitDisabled: true,
			values: {},
			inputs: [
				{
					accept: '.json',
					label: textsCap.fileLabel,
					multiple: false,
					name: this.names.file,
					onChange: this.handleFileChange,
					required: true,
					type: 'file',
					useInput: true,
				},
				{
					inputs: [],
					grouped: true, // forces full width child inputs
					name: this.names.restoreOpitons,
					type: 'group',
				},
			],
		}
	}

	handleFileChange = (e) => {
		try {
			const file = e.target.files[0]
			var reader = new FileReader()
			reader.onload = file => {
				if (!this.generateInputs(file.target.result))
					file.target.value = null
			}
			reader.readAsText(file)
		} catch (err) {
			showMessage.call(this, this.names.file, err, 'error')
		}
	}

	handleSumbit = (_, values) => {
		// show a list of supported data types to be restored
		// if there is a conflict, include a check box to override or merge
		// for identity and partner, show individual merge/override
		console.log({ _, values })
	}

	generateInputs = str => {
		const { inputs } = this.state
		const restoreOptionsIn = findInput(inputs, this.names.restoreOpitons)
		this.backupData = objClean(JSON.parse(str), essentialKeys)
		this.existingData = generateBackupData()
		const settings = new Map(this.backupData.totem_settings)
		const backupUser = ((settings.get('module_settings') || {}).messaging || {}).user || {}
		const user = getUser() || {}
		restoreOptionsIn.inputs = Object.keys(this.backupData).map(key => {
			const exists = !!this.existingData[key]
			const numExists = (this.existingData[key] || []).length
			const allowMerge = exists && ['totem_identities', 'totem_partners'].includes(key)
			const label = textCapitalize(key.split('totem_').join(''))
			const options = [
				{ label: !exists || numExists <= 0 ? 'Restore' : 'Override', value: 'override' },
				allowMerge && numExists > 0 && { label: 'Merge', value: 'merge' },
				{ label: 'Ignore', value: 'ignore' }
			].filter(Boolean)
			return {
				inline: true,
				label,
				name: key,
				onChange: this.handleRestoreOptionChange,
				options,
				radio: true,
				required: true,
				type: 'checkbox-group',
			}
		})
		// add options whether to keep existing user credentials
		if (user.id && user.id !== backupUser.id) restoreOptionsIn.inputs.push({
			label: 'Chat User ID',
			name: 'userId',
			options: [
				{ label: `Preserve current User ID: ${user.id}`, value: user.id },
				backupUser.id && { label: `User ID from backup: ${backupUser.id}`, value: backupUser.id }
			].filter(Boolean),
			required: true,
			radio: true,
			type: 'checkbox-group',
		})
		this.setState({ inputs })
		console.log({ backedUpData: this.backupData, existingData: this.existingData, inputs: restoreOptionsIn.inputs })
		return restoreOptionsIn.inputs.length > 0
	}

	generateRadiosForMerging = (a, b, parentName) => {
		const bMap = new Map(b)
		const processed = {}
		const labelWithTitle = value => (
			<label title={JSON.stringify(value, null, 4)}>
				{value.name} <Icon name='info circle' color='yellow' />
			</label>
		)
		return a.map(([keyA, valueA = {}]) => {
			const valueB = bMap.get(keyA)
			const identical = JSON.stringify(valueA) === JSON.stringify(valueB)
			const show = valueB && !identical
			const options = [
				{ label: labelWithTitle(valueA), value: valueA },
				show && { label: labelWithTitle(valueB), value: valueB }
			].filter(Boolean)
			processed[keyA] = true
			return {
				inline: true,
				hidden: !show, // hide unique items
				label: keyA,
				name: keyA,
				options,
				radio: true,
				required: true,
				type: 'checkbox-group',
				value: !show ? valueA : undefined,
			}
		}).concat( // find any remaining items in b
			b.map(([keyB, valueB]) => !processed[keyB] && {
				hidden: true, // hide unique items
				label: keyB,
				name: keyB,
				options: [{ label: labelWithTitle(valueB), value: keyB }],
				radio: true,
				required: true,
				type: 'checkbox-group',
				value: valueB,
			}).filter(Boolean)
		)
	}

	handleRestoreOptionChange = (e, values, index, childIndex) => {
		const { inputs } = this.state
		const restoreOptionsIn = inputs[index]
		const input = restoreOptionsIn.inputs[childIndex]
		if (values[input.name] !== 'merge') return
		const dataB = this.backupData[input.name]
		const dataC = this.existingData[input.name]
		const childInputs = this.generateRadiosForMerging(dataB, dataC, input.name)
		const hasConflict = !!childInputs.find(x => !x.hidden)
		const optionGroupName = `${input.name}-group`
		const optionGroupIn = findInput(inputs, optionGroupName) || {}
		const exists = !!optionGroupIn.name

		optionGroupIn.accordion = !hasConflict ? undefined : {
			collapsed: false,
			styled: true, // enable/disable the boxed layout
		}
		optionGroupIn.grouped = true // forces full width child inputs
		optionGroupIn.mergeValues = false // false => create an object with child input values
		optionGroupIn.inputs = childInputs
		optionGroupIn.label = !hasConflict ? undefined : `Merge conflicts for ${input.label}`
		optionGroupIn.name = optionGroupName
		optionGroupIn.type = 'group'
		if (!exists) {
			restoreOptionsIn.inputs = [
				...restoreOptionsIn.inputs.slice(0, childIndex + 1),
				optionGroupIn,
				...restoreOptionsIn.inputs.slice(childIndex + 1),
			]
		}
		this.setState({ inputs })
	}
}

RestoreUserData.defaultProps = {
	...FormBuilder.defaultProps,
	header: textsCap.formHeader,
	size: 'tiny'
}
