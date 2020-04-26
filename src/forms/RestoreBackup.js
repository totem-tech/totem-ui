import React from 'react'
import { Accordion, Icon, Table } from 'semantic-ui-react'
import FormBuilder, { findInput, showMessage } from '../components/FormBuilder'
import { objClean, textCapitalize, arrSort } from '../utils/utils'
import { getUser } from '../services/chatClient'
import { translated } from '../services/language'
import { essentialKeys, generateBackupData } from '../services/storage'

const [_, textsCap] = translated({
	fileLabel: 'restore file',
	formHeader: 'restore backup',
}, true)
// data that can be merged (must be 2D array that represents a Map)
const mergeables = ['totem_identities', 'totem_partners']
const diffIgnoreKeys = {
	totem_identities: ['address'],
	totem_partners: ['address'],
}

export default class RestoreBackup extends FormBuilder {
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
				if (this.generateInputs(file.target.result)) return
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
			const allowMerge = exists && mergeables.includes(key)
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

	generateObjDiffHtml = (a = {}, b = {}, ignoreKeys = []) => {
		const objDiff = Object.keys({ ...a, ...b }).reduce((objDiff, key) => {
			objDiff[key] = [
				JSON.stringify(a[key], null, 4),
				JSON.stringify(b[key], null, 4),
			]
			return objDiff
		}, {})

		return (
			<Table basic celled compact definition>
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell />
						<Table.HeaderCell>Current Value</Table.HeaderCell>
						<Table.HeaderCell>Backup Value</Table.HeaderCell>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{Object.keys(objDiff).sort().map(key => {
						if (ignoreKeys.includes(key)) return undefined
						const values = objDiff[key]
						const conflict = values[0] !== values[1]
						return (
							<Table.Row key={key} positive={!conflict} negative={conflict}>
								<Table.Cell><b>{key}</b></Table.Cell>
								<Table.Cell>{values[0]}</Table.Cell>
								<Table.Cell>{values[1]}</Table.Cell>
							</Table.Row>
						)
					})}
				</Table.Body>
			</Table>
		)
	}

	generateRadiosForMerging = (a = [], b = [], name) => {
		const aMap = new Map(a)
		const bMap = new Map(b)
		const processed = {}
		const addOption = (value = {}) => ({
			label: value === null ? 'Ignore' : value.name,
			value,
		})
		const dataInputs = a.map(([keyA, valueA = {}]) => {
			const valueB = bMap.get(keyA)
			const identical = JSON.stringify(valueA) === JSON.stringify(valueB)
			const conflict = valueB && !identical
			const value = conflict ? null : valueA // null value indicates conflict
			const options = [
				addOption(valueA),
				conflict && addOption(valueB),
				addOption(null), // ignore option
			].filter(Boolean)
			processed[keyA] = true
			return {
				inline: true,
				label: keyA,
				name: keyA,
				options,
				radio: true,
				required: true,
				type: 'checkbox-group',
				value,
			}
			// return !conflict ? input : [
			// 	input,
			// 	{
			// 		accordion: {
			// 			collapsed: true,
			// 			style: { marginBottom: 15, marginTop: -5 },
			// 			styled: true,
			// 		},
			// 		label: 'Compare',
			// 		name: 'compare-' + keyA,
			// 		type: 'group',
			// 		inputs: [{
			// 			content: (
			// 				<div style={{
			// 					marginBottom: -25,
			// 					marginTop: -18,
			// 					overflowX: 'auto',
			// 					width: '100%',
			// 				}}>
			// 					{this.generateObjDiffHtml(valueA, valueB, diffIgnoreKeys[name])}
			// 				</div>
			// 			),
			// 			name: '',
			// 			type: 'html'
			// 		}]
			// 	},
			// ]
		}).concat( // find any remaining items in b
			b.map(([keyB, valueB]) => !processed[keyB] && {
				inline: true,
				label: keyB,
				name: keyB,
				options: [
					addOption(valueB),
					addOption(null), // ignore option
				],
				radio: true,
				required: true,
				type: 'checkbox-group',
				value: valueB,
			}).filter(Boolean)
		)
		const conflicts = dataInputs.filter(x => x.value === null)
			.map(input => [
				input,
				{
					accordion: {
						collapsed: true,
						style: { marginBottom: 15, marginTop: -5 },
						styled: true,
					},
					label: 'Compare',
					name: 'compare-' + input.name,
					type: 'group',
					inputs: [{
						content: (
							<div style={{
								marginBottom: -25,
								marginTop: -18,
								overflowX: 'auto',
								width: '100%',
							}}>
								{this.generateObjDiffHtml(
									aMap.get(input.name),//valueA,
									bMap.get(input.name),//valueB,
									diffIgnoreKeys[name],
								)}
							</div>
						),
						name: '',
						type: 'html'
					}]
				}
			])
			.flat()
		return [
			...conflicts, // place conflicts on top
			...dataInputs.filter(x => x.value != null),
		]
	}

	handleRestoreOptionChange = (_, values, index, childIndex) => {
		const { inputs } = this.state
		const restoreOptionsIn = inputs[index]
		const input = restoreOptionsIn.inputs[childIndex]
		if (!mergeables.includes(input.name)) return
		const dataB = this.backupData[input.name]
		const dataC = this.existingData[input.name]
		const childInputs = this.generateRadiosForMerging(dataB, dataC, input.name)
		const hasConflict = !!childInputs.find(x => !x.hidden)
		const optionGroupName = `${input.name}-group`
		const optionGroupIn = findInput(inputs, optionGroupName) || {}
		const exists = !!optionGroupIn.name

		optionGroupIn.accordion = !hasConflict ? undefined : {
			collapsed: ['ignore', 'override'].includes(values[input.name]),
			styled: true, // enable/disable the boxed layout
		}
		optionGroupIn.grouped = true // forces full width child inputs
		optionGroupIn.mergeValues = false // false => create an object with child input values
		optionGroupIn.inputs = childInputs
		const numConflicts = childInputs.filter(x => x.value === null).length
		optionGroupIn.label = !hasConflict ? undefined
			: `${input.label}: ${numConflicts} / ${childInputs.length} conflicts`
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

RestoreBackup.defaultProps = {
	...FormBuilder.defaultProps,
	header: textsCap.formHeader,
	size: 'tiny'
}
