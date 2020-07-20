import React, { Component } from 'react'
import uuid from 'uuid'
import { Table } from 'semantic-ui-react'
import FormBuilder, { findInput, showMessage } from '../components/FormBuilder'
import { objClean, textCapitalize, isFn, objWithoutKeys, hasValue } from '../utils/utils'
import { getUser, setUser } from '../services/chatClient'
import { translated } from '../services/language'
import { confirm } from '../services/modal'
import { essentialKeys, generateBackupData } from '../services/storage'

const [_, textsCap] = translated({
	backupValue: 'backup value',
	chatUserId: 'Chat User ID',
	compare: 'compare',
	confirmText: 'This action is irreversible',
	conflicts: 'conflicts',
	currentValue: 'current value',
	fileLabel: 'restore file',
	formHeader: 'restore backup',
	ignore: 'ignore',
	keepUnchanged: 'keep unchanged',
	merge: 'merge',
	preserveUser: 'Preserve current credentials',
	remove: 'remove',
	restore: 'restore',
	restoreFromBackup: 'restore from backup',
	restoreUser: 'Restore credentials from backup',
	submitNoAction: 'No actionable item selected',
}, true)
// data that can be merged (must be 2D array that represents a Map)
const MERGEABLES = ['totem_identities', 'totem_partners']
// ignore meta data or unnecessary fields when comparing between current and backed up data
const diffIgnoreKeys = {
	totem_identities: ['address', 'cloudBackupStatus', 'cloudBackupTS', 'fileBackupTS'],
	totem_partners: ['address'],
}
// special values
const IGNORE = '__ignore__'
const MERGE = '__merge__'
const REMOVE = '__remove__'
const OVERRIDE = '__override__'
const VALUE_KEY_PREFIX = '__values__'

export default class RestoreBackup extends Component {
	constructor(props) {
		super(props)

		this.names = {
			file: 'file',
			restoreOpitons: 'restoreOptions',
			userId: 'userId', // dynamically created if backup contains a different User ID
		}
		this.backupData = null
		this.existingData = null
		this.state = {
			onSubmit: this.handleSubmit,
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

	handleSubmit = (_, values) => {
		const { onSubmit } = this.props
		// select only data categories and not ignored
		const dataKeys = Object.keys(this.backupData)
			.filter(key => hasValue(values[key]) && values[key] !== IGNORE)
		const user = values[this.names.userId]
		const noAction = !user && dataKeys.every(key => values[key] === IGNORE)
		if (noAction) return this.setState({
			message: {
				header: textsCap.submitNoAction,
				showIcon: true,
				status: 'warning',
			}
		})
		const execute = () => {
			dataKeys.forEach(key => {
				let value = this.backupData[key]
				if (values[key] === MERGE) {
					const valueObj = values[VALUE_KEY_PREFIX + key]
					// generate a 2D array for use with Map
					value = Object.keys(valueObj)
						.filter(key => valueObj[key] !== REMOVE)
						.map(key => [key, valueObj[key]])
				}
				localStorage.setItem(key, JSON.stringify(value))
			})
			if (user) setUser(user)
			this.setState({ success: true })
			isFn(onSubmit) && onSubmit(true, values)
			// reload page to reflect changes
			window.location.reload(true)
		}

		confirm({
			content: textsCap.confirmText,
			onConfirm: execute,
			size: 'mini',
		})
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
			const allowMerge = exists && MERGEABLES.includes(key)
			const label = textCapitalize(key.split('totem_').join(''))
			const options = [
				{ label: !exists || numExists <= 0 ? textsCap.restoreFromBackup : textsCap.restore, value: OVERRIDE },
				allowMerge && numExists > 0 && { label: textsCap.merge, value: MERGE },
				{ label: textsCap.ignore, value: IGNORE }
			].filter(Boolean)
			return {
				inline: true,
				key: uuid.v1(),
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
			label: textsCap.chatUserId,
			name: this.names.userId,
			options: [
				{ label: `${textsCap.preserveUser}: ${user.id}`, value: user },
				backupUser.id && { label: `${restoreUser}: ${backupUser.id}`, value: backupUser }
			].filter(Boolean),
			required: true,
			radio: true,
			type: 'checkbox-group',
		})
		this.setState({ inputs })
		return restoreOptionsIn.inputs.length > 0
	}

	generateObjDiffHtml = (current = {}, backup = {}, ignoreKeys = []) => {
		const objDiff = Object.keys({ ...current, ...backup }).reduce((objDiff, key) => {
			objDiff[key] = [
				JSON.stringify(current[key], null, 4),
				JSON.stringify(backup[key], null, 4),
			]
			return objDiff
		}, {})

		return (
			<Table basic celled compact definition>
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell />
						<Table.HeaderCell>{textsCap.currentValue}</Table.HeaderCell>
						<Table.HeaderCell>{textsCap.backupValue}</Table.HeaderCell>
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

	generateValueOptions = (current = [], backup = [], name, doMerge) => {
		const ignoredKeys = diffIgnoreKeys[name]
		const currentMap = new Map(current)
		const backupMap = new Map(backup)
		const processed = {}
		const dataInputs = current.map(([keyC, valueC = {}]) => {
			const valueB = backupMap.get(keyC)
			const strC = JSON.stringify(objWithoutKeys(valueC, ignoredKeys))
			const strB = JSON.stringify(objWithoutKeys(valueB, ignoredKeys))
			const identical = strC === strB
			const conflict = valueB && !identical
			const value = conflict ? null : valueC // forces make a selection if there is a conflict
			const options = [
				{ label: textsCap.keepUnchanged, value: valueC },
				{ disabled: !conflict, label: textsCap.restoreFromBackup, value: valueB },
				{ label: textsCap.remove, value: REMOVE }, // ignore option
			].filter(Boolean)
			processed[keyC] = true
			return {
				inline: true,
				label: valueC.name || valueB.name || keyC,
				name: keyC,
				options,
				radio: true,
				required: doMerge,
				type: 'checkbox-group',
				value,
			}
		}).concat( // find any remaining items in b
			backup.map(([keyB, valueB]) => !processed[keyB] && {
				inline: true,
				label: valueB.name || keyB,
				name: keyB,
				options: [
					{ disabled: true, label: textsCap.keepUnchanged, value: 'keep-input-disabled' },
					{ label: textsCap.restoreFromBackup, value: valueB },
					{ label: textsCap.remove, value: REMOVE }, // ignore option
				],
				radio: true,
				required: doMerge,
				type: 'checkbox-group',
				value: valueB,
			}).filter(Boolean)
		)
		const conflicts = dataInputs.filter(x => x.value === null)
			.reduce((ar, input) => ([
				...ar,
				input,
				{
					accordion: {
						collapsed: true,
						style: { marginBottom: 15, marginTop: -5 },
						styled: true,
					},
					label: textsCap.compare,
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
									currentMap.get(input.name),
									backupMap.get(input.name),
									ignoredKeys,
								)}
							</div>
						),
						name: '',
						type: 'html'
					}]
				}
			]), [])

		return [
			...conflicts, // place conflicts on top
			...dataInputs.filter(x => x.value !== null),
		]
	}

	handleRestoreOptionChange = (_, values, index, childIndex) => {
		const { inputs } = this.state
		const restoreOptionsIn = inputs[index]
		const input = restoreOptionsIn.inputs[childIndex]
		if (!MERGEABLES.includes(input.name)) return
		const dataB = this.backupData[input.name]
		const dataC = this.existingData[input.name]
		const optionGroupName = `${VALUE_KEY_PREFIX}${input.name}`
		const optionGroupIn = findInput(inputs, optionGroupName) || {}
		const exists = !!optionGroupIn.name
		const valueInputs = this.generateValueOptions(dataC, dataB, input.name, values[input.name] === MERGE)
		const numConflicts = valueInputs.filter(x => x.value === null).length
		const hasConflict = numConflicts > 0
		optionGroupIn.key = uuid.v1()
		optionGroupIn.hidden = values[input.name] !== MERGE
		optionGroupIn.accordion = {
			collapsed: !hasConflict || [IGNORE, OVERRIDE].includes(values[input.name]),
			styled: true, // enable/disable the boxed layout
		}
		optionGroupIn.grouped = true // forces full width child inputs
		optionGroupIn.groupValues = true // true => create an object with child input values
		optionGroupIn.inputs = valueInputs
		optionGroupIn.label = `${input.label}: ${numConflicts} / ${valueInputs.length} ${textsCap.conflicts}`
		optionGroupIn.name = optionGroupName
		optionGroupIn.type = 'group'
		restoreOptionsIn.inputs = exists ? restoreOptionsIn.inputs : [
			...restoreOptionsIn.inputs.slice(0, childIndex + 1),
			optionGroupIn, // puts compare inputs right after the current input
			...restoreOptionsIn.inputs.slice(childIndex + 1),
		]
		this.setState({ inputs })
	}

	render = () => <FormBuilder {...{ ...this.props, ...this.state }} />
}
RestoreBackup.defaultProps = {
	header: textsCap.formHeader,
	size: 'tiny'
}