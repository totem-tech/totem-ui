import React, { Component } from 'react'
import { BehaviorSubject, Subject } from 'rxjs'
import { Table, Button } from 'semantic-ui-react'
import uuid from 'uuid'
import { ButtonDelayed } from '../../components/buttons'
import FormBuilder, { fillValues, findInput } from '../../components/FormBuilder'
import {
	closeModal,
	confirm,
	showForm,
} from '../../services/modal'
import { setToast } from '../../services/toast'

import { getUser, setUser } from '../../utils/chatClient'
import { rxForceUpdateCache } from '../../utils/DataStorage'
import { translated } from '../../utils/languageHelper'
import { statuses, subjectAsPromise } from '../../utils/reactjs'
import storage, { backup, essentialKeys } from '../../utils/storageHelper'
import {
	objClean,
	textCapitalize,
	isFn,
	isHex,
	objWithoutKeys,
	hasValue,
	textEllipsis,
	arrSort,
} from '../../utils/utils'
import { MOBILE, rxLayout } from '../../utils/window'
import BackupForm from './BackupForm'
import { decryptBackup } from '.'

const textsCap = {
	addFromBackup: 'add from backup',
	backupNow: 'backup now',
	backupValue: 'backup value',
	cancel: 'cancel',
	chatMessages: 'recent chat messages',
	chatUserId: 'Chat User ID',
	compare: 'compare',
	contacts: 'contacts',
	confirmRestoreContent: `
		You are about to replace or merge the following application data with the data from you backup JSON file. 
		This is potentially dangerous and you may lose your identity, chat User ID and other data if not done carefully.
		To avoid any loss of data it is best to create a backup of your existing data before attempting restore.
	`,
	confirmText: 'this action is irreversible',
	conflicts: 'conflicts',
	currentValue: 'current value',
	entries: 'entries',
	fileLabel: 'select your backup JSON file',
	formHeader: 'restore backup',
	history: 'history',
	identities: 'identities',
	ignore: 'ignore',
	invalidFileType: 'invalid file type selected',
	keepUnchanged: 'keep unchanged',
	locations: 'locations',
	merge: 'merge',
	notifications: 'notifications',
	partners: 'partners',
	passwordFailed: 'incorrect password',
	passwordFailed2: 'failed to enter a correct password after 3 attempts',
	passwordLabel: 'password',
	passwordPlaceholder: 'enter password for this backup',
	preserveUser: 'preserve current credentials',
	proceed: 'proceed',
	remove: 'remove',
	restore: 'restore',
	restoreFromBackup: 'restore from backup',
	restoreUser: 'restore credentials from backup',
	settings: 'settings',
	submitNoAction: 'no actionable item selected',
	success1: 'restored successfully!',
	success2: 'reloading page.',
	successRedirect: 'redirecting back to',
	titleConflict: 'you must make a choice to contiue',
	titleNoConflict: 'remove existing entry or keep unchanged',
	titleNew: 'from backup',
	userCredentials: 'user credentials',
}
translated(textsCap, true)
// data that can be merged (must be 2D array that represents a Map)
const MERGEABLES = [
	'totem_contacts',
	'totem_identities',
	'totem_partners',
	'totem_locations',
]
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
const inputNames = {
	confirmed: 'confirmed',
	confirmText: 'confirmText',
	file: 'file',
	redirectTo: 'redirectTo',
	restoreOpitons: 'restoreOptions',
	userId: 'userId', // dynamically created if backup contains a different User ID
}

export default class RestoreBackupForm extends Component {
	constructor(props) {
		super(props)

		this.backupData = null
		this.existingData = null
		const inputs = [
			{
				hidden: true,
				name: inputNames.confirmed,
				onChange: (_, values = {}) => this.setState({
					submitText: this.checkConfirmed(values)
						? textsCap.restore
						: textsCap.proceed,
				}),
				rxValue: new BehaviorSubject(''),
				type: 'hidden',
			},
			{
				hidden: this.checkConfirmed,
				name: inputNames.confirmText,
				type: 'html',
				content: (
					<div>
						{textsCap.confirmRestoreContent}

						{/* <div style={{ textAlign: 'center' }}> */}
						<Button {...{
							content: textsCap.backupNow,
							primary: true,
							size: 'mini',
							onClick: e => {
								e.preventDefault()
								showForm(BackupForm, {
									closeOnSubmit: true,
									values: { confirmed: 'yes' }
								})
							},
						}} />
						<ul>
							{[
								textsCap.contacts,
								textsCap.history,
								textsCap.identities,
								textsCap.locations,
								textsCap.notifications,
								textsCap.partners,
								textsCap.chatMessages,
								textsCap.settings,
								textsCap.userCredentials,
							]
								.sort()
								.map((str, i) =>
									<li key={i}>{str}</li>
								)}
						</ul>
					</div>
				)
			},
			{
				accept: '.json',
				hidden: values => !this.checkConfirmed(values),
				label: textsCap.fileLabel,
				multiple: false,
				name: inputNames.file,
				onChange: this.handleFileChange,
				required: true,
				type: 'file',
				useInput: true,
			},
			{
				hidden: values => !this.checkConfirmed(values),
				inputs: [],
				grouped: true, // forces full width child inputs
				name: inputNames.restoreOpitons,
				type: 'group',
			},
			{
				name: inputNames.redirectTo,
				type: 'hidden',
			}
		]
		this.state = {
			inputs,
			onClose: (...args) => {
				let { values: { redirectTo } = {} } = props
				isFn(props.onClose) && props.onClose(...args)
				try {
					redirectTo = new URL(redirectTo)
					window.location.href = redirectTo.href
				} catch (err) { }
			},
			onSubmit: this.handleSubmit,
			submitDisabled: { file: false },
		}

		fillValues(this.state.inputs, props.values)
	}

	checkConfirmed = values => (values[inputNames.confirmed] || '')
		.toLowerCase() === 'yes'

	generateInputs = str => {
		const { inputs } = this.state
		const restoreOptionsIn = findInput(inputs, inputNames.restoreOpitons)
		this.backupData = objClean(JSON.parse(str), essentialKeys)
		this.existingData = backup.generateData(null)
		const settings = new Map(this.backupData.totem_settings)
		const backupUser = ((settings.get('module_settings') || {}).messaging || {}).user || {}
		const user = getUser() || {}
		restoreOptionsIn.inputs = Object
			.keys(this.backupData)
			.map(key => {
				const exists = !!this.existingData[key]
				const numExists = (this.existingData[key] || []).length
				const allowMerge = exists && MERGEABLES.includes(key)
				const label = textCapitalize(
					key
						.split('totem_')
						.join('')
				)
				const options = [
					{
						label: !exists || numExists <= 0
							? textsCap.restoreFromBackup
							: textsCap.restore,
						value: OVERRIDE,
					},
					allowMerge && numExists > 0 && {
						label: textsCap.merge,
						value: MERGE,
					},
					{
						label: textsCap.ignore,
						value: IGNORE,
					}
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
			name: inputNames.userId,
			options: [
				{
					label: `${textsCap.preserveUser}: @${user.id}`,
					value: user,
				},
				backupUser.id && {
					label: `${textsCap.restoreUser}: @${backupUser.id}`,
					value: backupUser,
				}
			].filter(Boolean),
			required: true,
			radio: true,
			type: 'checkbox-group',
		})
		this.setState({ inputs })
		return restoreOptionsIn.inputs.length > 0
	}

	generateObjDiffHtml = (current = {}, backup = {}, ignoreKeys = [], maxLen = 24) => {
		const objDiff = Object
			.keys({ ...current, ...backup })
			.reduce((objDiff, key) => {
				objDiff[key] = [
					JSON.stringify(current[key], null, 4),
					JSON.stringify(backup[key], null, 4),
				]
				return objDiff
			}, {})

		return (
			<Table basic celled compact definition unstackable>
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell />
						<Table.HeaderCell>{textsCap.currentValue}</Table.HeaderCell>
						<Table.HeaderCell>{textsCap.backupValue}</Table.HeaderCell>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{Object.keys(objDiff)
						.sort()
						.map(key => {
							if (ignoreKeys.includes(key)) return undefined

							const values = objDiff[key]
							const conflict = values[0] !== values[1]
							return (
								<Table.Row key={key} positive={!conflict} negative={conflict}>
									<Table.Cell title={key}>
										<b>{textEllipsis(key, maxLen, 3, false)}</b>
									</Table.Cell>
									<Table.Cell title={values[0]}>
										{textEllipsis(values[0], maxLen, 3, true)}
									</Table.Cell>
									<Table.Cell title={values[1]}>
										{textEllipsis(values[1], maxLen, 3, true)}
									</Table.Cell>
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
		const isMobile = rxLayout.value === MOBILE
		const padding = '7px 15px'
		const margin = '-2px 0'
		const styleConflict = {
			border: '1px solid orange',
			borderRadius: 3,
			background: '#ffa5005e',
			margin,
			padding,
		}
		const styleNew = {
			border: '1px solid #00800037',
			borderRadius: 3,
			background: '#00800037',
			margin,
			padding,
		}
		const styleExisting = {
			border: '1px solid #80808040',
			borderRadius: 3,
			margin,
			padding,
		}
		const ILabel = props => (
			<span {...{
				...props,
				style: { fontSize: '110%' },
			}} />
		)
		const dataInputs = current
			.map(([keyC, valueC = {}]) => {
				const valueB = backupMap.get(keyC)
				const strC = JSON.stringify(objWithoutKeys(valueC, ignoredKeys))
				const strB = JSON.stringify(objWithoutKeys(valueB, ignoredKeys))
				const identical = strC === strB
				const conflict = valueB && !identical
				const value = conflict
					? null // forces make a selection if there is a conflict
					: valueC
				const options = [
					{
						name: 'current',
						label: textsCap.keepUnchanged,
						value: valueC,
					},
					{
						name: 'backup',
						disabled: !conflict,
						label: textsCap.restoreFromBackup,
						value: !conflict
							? ''
							: valueB,
					},
					{
						name: 'remove',
						label: textsCap.remove,
						value: REMOVE,
					}, // ignore option
				]
				processed[keyC] = true
				const label = valueC.name || valueB.name || keyC

				return {
					inline: !isMobile,
					label: <ILabel>{label}</ILabel>,
					name: keyC,
					options,
					radio: true,
					required: doMerge,
					rxValue: new BehaviorSubject(value),
					sort: label,
					styleContainer: conflict
						? styleConflict
						: styleExisting,
					title: conflict
						? textsCap.titleConflict
						: textsCap.titleNoConflict,
					type: 'checkbox-group',
					value,
				}
			})
			.concat( // find any remaining items in b
				backup.map(([keyB, valueB]) => !processed[keyB] && {
					inline: true,
					label: <ILabel>{valueB.name || keyB}</ILabel>,
					name: keyB,
					options: [
						// { disabled: true, label: textsCap.keepUnchanged, value: 'keep-input-disabled' },
						{ label: textsCap.addFromBackup, value: valueB },
						{ label: textsCap.ignore, value: REMOVE }, // ignore option
					],
					radio: true,
					required: doMerge,
					rxValue: new BehaviorSubject(valueB),
					sort: valueB.name || keyB,
					styleContainer: styleNew,
					title: textsCap.titleNew,
					type: 'checkbox-group',
					value: valueB,
				}).filter(Boolean)
			)

		const conflicts = arrSort(
			dataInputs
				.filter(x => x.value === null),
			'sort',
		).reduce((ar, input) => ([
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
			// place conflicts on top
			...conflicts,
			// new entries from backup
			...arrSort(
				dataInputs.filter(x => x.value !== null && x.options.length === 2),
				'sort',
			),
			// existing entries not in backup
			...arrSort(
				dataInputs.filter(x => x.value !== null && x.options.length > 2),
				'sort',
			),
		]
	}

	handleFileChange = async (e) => {
		const { inputs, submitDisabled } = this.state
		const fileIn = findInput(inputs, 'file')
		const rxError = new Subject()
		const [promise, unsubscribe] = subjectAsPromise(rxError)
		try {
			const file = e.target.files[0]
			const name = e.target.value
			var reader = new FileReader()
			if (name && !name.endsWith(fileIn.accept)) throw textsCap.invalidFileType

			submitDisabled.file = true
			this.setState({ submitDisabled })

			reader.onloadend = async (file) => {
				submitDisabled.file = false
				this.setState({ submitDisabled })
				// failed load file
				if (reader.error) return rxError.next(reader.error)

				let backup = file.target.result
				const startRestore = () => {
					if (this.generateInputs(backup)) return
					file.target.value = null
				}
				// process unencrypted legacy backup file
				if (!isHex(backup)) return startRestore()

				const modalId = 'decrypt-backup'
				let message
				// encrypted file selected
				let attemptCount = 0
				const _promptForPassword = () => showForm(FormBuilder, {
					header: textsCap.passwordPlaceholder,
					inputs: [{
						autoComplete: 'current-password',
						label: textsCap.passwordLabel,
						name: 'password',
						placeholder: textsCap.passwordPlaceholder,
						required: true,
						type: 'password',
					}],
					message,
					onSubmit: (_, { password }) => {
						// attempt to decrypt password
						const decrypted = decryptBackup(backup, password)
						if (!!decrypted) {
							backup = decrypted
							closeModal(modalId)
							return startRestore()
						}
						attemptCount++
						message = {
							content: textsCap.passwordFailed,
							status: statuses.ERROR,
						}
						if (attemptCount >= 3) {
							// user failed to enter a correct password after 3rd try
							// close the password prompt and reset the input
							file.target.value = null
							rxError.next(textsCap.passwordFailed2)
							return closeModal(modalId)
						}
						_promptForPassword()
					},
				}, modalId)
				_promptForPassword()
			}

			reader.readAsText(file)
			fileIn.message = null

			// wait until file is loaded and show any error if error occured
			const error = await promise
			if (error) throw new Error(error)
		} catch (err) {
			unsubscribe()
			rxError.complete()
			fileIn.message = {
				content: `${err}`.replace('Error: ', ''),
				icon: true,
				status: 'error'
			}
		}
		this.setState({ inputs })
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
		const valueInputs = this.generateValueOptions(
			dataC,
			dataB,
			input.name,
			values[input.name] === MERGE,
		)
		const numConflicts = valueInputs.filter(x => x.value === null).length
		const hasConflict = numConflicts > 0
		optionGroupIn.key = uuid.v1()
		optionGroupIn.hidden = values[input.name] !== MERGE
		optionGroupIn.accordion = {
			collapsed: !hasConflict
				|| [IGNORE, OVERRIDE]
					.includes(values[input.name]),
			styled: true, // enable/disable the boxed layout
		}
		optionGroupIn.grouped = true // forces full width child inputs
		optionGroupIn.groupValues = true // true => create an object with child input values
		optionGroupIn.inputs = valueInputs
		optionGroupIn.label = [
			input.label + ':',
			numConflicts,
			textsCap.conflicts.toLowerCase(),
			'/',
			valueInputs.length,
			textsCap.entries,
		].join(' ')


		optionGroupIn.name = optionGroupName
		optionGroupIn.type = 'group'
		restoreOptionsIn.inputs = exists
			? restoreOptionsIn.inputs
			: [
				...restoreOptionsIn.inputs
					.slice(0, childIndex + 1),
				optionGroupIn, // puts compare inputs right after the current input
				...restoreOptionsIn.inputs
					.slice(childIndex + 1),
			]
		this.setState({ inputs })
	}

	handleSubmit = (_, values) => {
		if (!this.checkConfirmed(values)) {
			const confirmedIn = findInput(
				this.state.inputs,
				inputNames.confirmed,
			)
			confirmedIn.rxValue.next('yes')
			return
		}
		const { onSubmit } = this.props
		const { redirectTo } = values
		// select only data categories and not ignored
		const dataKeys = Object
			.keys(this.backupData)
			.filter(key =>
				hasValue(values[key])
				&& values[key] !== IGNORE
			)
		const user = values[inputNames.userId]
		const noAction = !user && dataKeys.every(key => values[key] === IGNORE)
		if (noAction) return this.setState({
			message: {
				header: textsCap.submitNoAction,
				icon: true,
				status: 'warning',
			}
		})

		const execute = async () => {
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
			// --keep this before setUser()--
			// force update in-memory cache data by DataStorage
			rxForceUpdateCache.next(true)
			if (user) setUser(user)
			// wait for onSubmit to finish executing
			isFn(onSubmit) && await onSubmit(true, values)
			const message = {
				content: redirectTo
					? undefined
					: (
						<ButtonDelayed {...{
							children: textsCap.success2,
							El: 'span',
							style: {
								color: 'red'
							}
						}} />
					),
				header: redirectTo
					? textsCap.successRedirect
					: textsCap.success1,
				status: 'success',
			}
			this.setState({
				message,
				success: true,
			})
			// additionally show toast in case form message is out of sight (ie: on mobile)
			setToast(message, 5000, 'RestoreBackupForm')
			// reload page to reflect changes
			setTimeout(() => {
				// remove all non-essential data from localStorage
				storage.clearNonEssentialData()
				!redirectTo
					? window.location.reload(true)
					: window.location.href = redirectTo
			}, redirectTo ? 1000 : 3000)
		}

		confirm({
			cancelButton: <Button positive content={textsCap.cancel} />,
			confirmButton: <ButtonDelayed content={textsCap.restore} negative seconds={5} />,
			content: textsCap.confirmText,
			onConfirm: execute,
			size: 'mini',
		})
	}

	render = () => <FormBuilder {...{ ...this.props, ...this.state }} />
}
RestoreBackupForm.defaultProps = {
	header: textsCap.formHeader,
	size: 'tiny'
}