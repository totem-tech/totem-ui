import React from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import FormBuilder, {
	checkFormInvalid,
	fillValues,
	findInput,
} from '../../components/FormBuilder'
import { MOBILE, rxLayout } from '../../services/window'
import { confirm, confirmAsPromise, showForm } from '../../services/modal'
import { getUser, rxIsRegistered } from '../../utils/chatClient'
import { translated } from '../../utils/languageHelper'
import storage, { backup } from '../../utils/storageHelper'
import { iUseReducer } from '../../utils/reactHelper'
import {
	copyToClipboard,
	deferred,
	generateHash,
	isFn,
	isHex,
	isStr,
	isValidNumber,
	randomInt,
} from '../../utils/utils'
import identity, { addFromUri, generateUri } from '../identity/identity'
import partner from '../partner/partner'
import location from '../location/location'
import contact from '../contact/contact'
import { Icon } from 'semantic-ui-react'
import Text from '../../components/Text'
import { getActiveStep, MODULE_KEY, saveActiveStep, stepIndexes } from './GettingStarted'
import { encryptBackup, generatePassword } from '.'
import { statuses } from '../../components/Message'

const textsCap = translated({
	backupLater: 'backup later',
	backupNow: 'backup now',
	backupConfirmHeader: 'confirm backup',
	backupFileInvalid: `uploaded file contents do not match the backup file contents!
	If you did not save the backup file, please click on the close icon and initiate the backup process again.`,
	backupFileinvalidType: 'please select the .json file you have just downloaded',
	backupFileLabel: 'upload the file you just downloaded',
	backupFileLabelDetails: 'please select the file you have just downloaded. This is to make sure your backup was successfully downloaded.',
	backupFileLabelDetailsLocation: 'Check for the following file in your default downloads folder (if you have NOT manually selected the download location).',
	backupFileLabelDetailsDesktop: 'you can drag-and-drop the backup file on the file chooser below.',
	backupSuccessContent: `
	Excellent! You have just downloaded your account data. 
	You can use this file to restore your account on any other devices you choose.
	Make sure to keep the downloaded file in a safe place.
	To keep your account safe, never ever share your backup file with anyone else.
	Totem team will never ask you to share your backup file.`,
	backupSuccessHeader: 'backup complete!',
	chatMessages: 'recent chat messages',
	close: 'close',
	contacts: 'contacts',
	confirmBackupContent1: 'you are about to download your Totem application data as a JSON file.',
	confirmBackupContent2: 'The following information will be included:',
	critical: 'critical',
	done: 'done',
	downloadAgain: 'download again',
	downloadFailed: 'download not working?',
	fileName: 'file name',
	history: 'history',
	identities: 'identities',
	invalidData: 'invalid data',
	invalidFileType: 'selected file name must end with .json extension.',
	headerUnconfirmed: 'backup your account',
	headerConfirmed: 'encrypt your backup',
	headerDownload: 'download and verify your backup',
	locations: 'locations',
	manualBkp0: 'backup file contents have been copied to clipboard. Follow the instructions below:',
	manualBkp1: 'open a text editor and create a new file',
	manualBkp2: 'paste the backup file contents (press CTRL+V or CMD+V on an Apple computer)',
	manualBkp3: 'save the copied text with the following filename:',
	manualBkpHeader: 'save file manually',
	notifications: 'notifications',
	partners: 'partners',
	passwordConfirmErr: 'passwords do not match!',
	passwordConfirmLabel: 'confirm password',
	passwordConfirmPlaceholder: 're-enter your password',
	passwordCrHeader: 'Enter a password matching the following criteria:',
	passwordCrLength: 'between 8 and 64 characters',
	passwordCrLower: 'lowercase letters',
	passwordCrNum: 'numbers',
	passwordCrSpecial: 'special characters',
	passwordCrUpper: 'uppercase letters',
	passwordBtnTitle: 'generate a random password',
	passwordGenWarnContent: 'please make sure to save the newly generated password in a secure place, preferably a password manager.',
	passwordGenWarnHeader: 'have you saved your newly generated password?',
	passwordGenWarnBtn: 'yes, proceed!',
	passwordGenWarnClose: 'go back',
	passwordLabel: 'password',
	passwordPlaceholder: 'enter a password for this backup',
	proceed: 'proceed',
	settings: 'settings',
	userCredentials: 'user credentials',
	warnBackupContent1: 'you are at risk of accidental data loss!',
	warnBackupContent2: 'the following items are not backed up:',
	warnBackupContent3: 'click proceed to download a backup of your account now.',
	warnBackupHeader: 'backup recommended!',
	warnCriticalA: 'you may be at risk of losing your account!',
	warnCriticalB: 'you may be at risk of losing your funds!',
}, true)[1]
const inputNames = {
	confirmed: 'confirmed',
	downloadData: 'downloadData',
	file: 'file',
	notes: 'notes',
	password: 'password',
	passwordConfirm: 'passwordConfirm',
	redirectTo: 'redirectTo',
}
export const steps = {
	unconfirmed: 'no', // initial state
	confirmed: 'yes', // user enters password
	download: 'download', // user is to verify downloaded backup
	verified: 'verified', // verification + backup complete
}

export default function BackupForm(props) {
	const [state] = iUseReducer(null, rxState => {
		const { onSubmit, values = {} } = props
		const rxPassword = new BehaviorSubject('')
		const rxPasswordGen = new BehaviorSubject('')
		if ((values.confirmed || '').toLowerCase() !== steps.confirmed) {
			values.confirmed = steps.unconfirmed
		}
		const filename = backup.generateFilename()
		const isMobile = rxLayout.value === MOBILE
		const confirmBackupTypes = [
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

		const handleConfirmChange = deferred((_, values) => {
			const step = values[inputNames.confirmed]
			const isDownload = step === steps.download
			const downloadData = isDownload && backup.download(
				filename,
				data => encryptBackup(data, values[inputNames.password]),
			)
			const ddIn = findInput(inputs, inputNames.downloadData)
			// store downloaded data for confirmation
			ddIn && ddIn.rxValue.next(downloadData)

			// update form header
			const header = step === steps.unconfirmed
				? textsCap.headerUnconfirmed
				: step === steps.confirmed
					? textsCap.headerConfirmed
					: textsCap.headerDownload
			rxState.next({ header })
		}, 50)

		// on file select, check if the uploaded file matches the downloaded file
		const handleFileSelected = (e, _, values) => new Promise(resolve => {
			try {
				const file = e.target.files[0]
				const name = e.target.value
				var reader = new FileReader()
				if (name && !name.endsWith('.json')) throw textsCap.invalidFileType

				reader.onload = file => {
					try {
						const { data, hash, timestamp } = values[inputNames.downloadData] || {}
						window.data = data
						// return console.log({data})
						const redirectTo = values[inputNames.redirectTo]
						const hashUpload = generateHash(
							file.target.result,
							'blake2',
							256,
						)
						const matched = hash === hashUpload

						setTimeout(() => resolve(!matched && textsCap.backupFileInvalid))

						if (!matched) {
							file.target.value = null // reset file
							return
						}

						// update timestamp of identities and partners
						backup.updateFileBackupTS(data, timestamp)

						// set as verified
						findInput(inputs, inputNames.confirmed)
							.rxValue
							.next(steps.verified)
						
						// update getting started active step if necessary
						!!rxIsRegistered.value && saveActiveStep(stepIndexes.backup + 1)
						
						rxState.next({
							message: {
								content: textsCap.backupSuccessContent,
								header: textsCap.backupSuccessHeader,
								status: statuses.SUCCESS,
							},
							success: true,
						})
						isFn(onSubmit) && onSubmit(true, values)
						if (redirectTo) window.location.href = redirectTo
					} catch (err) {
						rxState.next({
							message: {
								content: `${err}`,
								status: statuses.ERROR,
							}
						})
					}
				}
				reader.readAsText(file)
			} catch (err) {
				resolve(err)
			}
		})

		const inputs = [
			{
				name: 'username',
				type: 'hidden',
				value: `${(getUser() || {}).id || ''}@${window.location.host}`,
			},
			{
				action: {
					icon: 'eye',
					// toggle password view
					onClick: e => {
						e.preventDefault()
						const pwIn = findInput(inputs, inputNames.password)
						const show = pwIn.action.icon === 'eye'
						pwIn.action.icon = `eye${show ? ' slash' : ''}`
						pwIn.type = show 
							? 'text'
							: 'password'
						rxState.next({ inputs })
					},
				},
				autoComplete: 'new-password',
				criteria: [
					{
						regex: /^.{8,64}$/,
						text: textsCap.passwordCrLength,
					},
					{
						regex: /[A-Z]/,
						text: textsCap.passwordCrUpper,
					},
					{
						regex: /[a-z]/,
						text: textsCap.passwordCrLower,
					},
					{
						regex: /[0-9]/,
						text: textsCap.passwordCrNum,
					},
					{
						regex: /[\W|_]/,
						text: textsCap.passwordCrSpecial,
					},
				],
				criteriaHeader: textsCap.passwordCrHeader,
				// hide regex error message
				customMessages: { regex: true },
				// // delay before showing error message
				// defer: 500,
				hidden: values => values[inputNames.confirmed] !== steps.confirmed,
				inlineLabel: {
					color: 'green',
					icon: {
						className: 'no-margin',
						name: 'random',
					},
					onClick: e => {
						e.preventDefault()
						e.stopPropagation()
						const pw = generatePassword()
						rxPassword.next(pw)
						rxPasswordGen.next(pw)
					},
					style: { cursor: 'pointer' },
					title: textsCap.passwordBtnTitle,
				},
				label: textsCap.passwordLabel,
				// maxLength: 64,
				// minLength: 8,
				name: inputNames.password,
				// trigger a change on the password confirm input to force re-validation
				onChange: (_, values) => {
					const pwConfirm = values[inputNames.passwordConfirm]
					if (!pwConfirm) return
					
					const pwConfirmIn = findInput(inputs, inputNames.passwordConfirm)
					// first set a placeholder password, otherwise, RxJS won't register it as a change
					pwConfirmIn.rxValue.next('-'.repeat(pwConfirm.length))
					// set back the original value
					setTimeout(() => pwConfirmIn.rxValue.next(pwConfirm), 100)
				},
				placeholder: textsCap.passwordPlaceholder,
				// regex: new RegExp(/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[\W|_]).{4,32}$/),
				required: true,
				rxValue: rxPassword,
				type: 'password',

			},
			{
				autoComplete: 'new-password',
				hidden: values => values[inputNames.confirmed] !== steps.confirmed
					|| `${values[inputNames.password] || ''}`.length < 8,
				label: textsCap.passwordConfirmLabel,
				name: inputNames.passwordConfirm,
				onPaste: (e, d) => {
					const pastedStr = e.clipboardData.getData('text/plain')
					// only allow pasting generated and/or medium to large passwords
					if (pastedStr < 12) e.preventDefault()
				},
				placeholder: textsCap.passwordConfirmPlaceholder,
				required: true,
				rxValue: new BehaviorSubject(),
				type: 'password',
				validate: (e, _, values) => {
					const isConfirmed = values[inputNames.confirmed] === steps.confirmed
					const pw = `${values[inputNames.password] || ''}`
					const pwConf = values[inputNames.passwordConfirm]
					
					return isConfirmed
						&& !!pwConf
						&& pw !== pwConf
						&& textsCap.passwordConfirmErr
				},
			},
			{
				name: inputNames.confirmed,
				onChange: handleConfirmChange,
				rxValue: new BehaviorSubject('no'),
				type: 'hidden',
			},
			{
				name: inputNames.redirectTo,
				type: 'hidden',
			},
			{
				hidden: true,
				name: inputNames.downloadData,
				rxValue: new BehaviorSubject(),
				type: 'hidden',
			},
			{
				hidden: values => values[inputNames.confirmed] !== steps.unconfirmed,
				name: inputNames.notes,
				type: 'html',
				content: (
					<div>
						{textsCap.confirmBackupContent1} {textsCap.confirmBackupContent2}
						<ul>
							{confirmBackupTypes
								.sort()
								.map((str, i) => (
									<li key={i}>{str}</li>
								))}
						</ul>
					</div>
				),
			},
			{
				accept: '.json',
				disabled: values => steps.verified === values[inputNames.confirmed],
				hidden: values => ![steps.download, steps.verified]
					.includes(values[inputNames.confirmed]),
				label: textsCap.backupFileLabel,
				labelDetails: (
					<div>
						<p>
							{textsCap.backupFileLabelDetails}
							<b style={{ color: 'red' }}>
								{' ' + textsCap.backupFileLabelDetailsLocation}
							</b>
						</p>

						<p>
							{textsCap.fileName}:
							<br />
							<b style={{ color: 'green' }}>{filename}</b>
						</p>

						{!isMobile && (
							<p>{textsCap.backupFileLabelDetailsDesktop}</p>
						)}
					</div>
				),
				name: inputNames.file,
				type: 'file',
				validate: handleFileSelected,
			},
			{
				content: textsCap.downloadFailed,
				hidden: values => values[inputNames.confirmed] !== steps.download,
				name: 'download-text',
				negative: true,
				onClick: () => {
					const downloadData = findInput(inputs, inputNames.downloadData).value
					const { data } = downloadData || {}
					if (!isHex(data)) throw new Error(textsCap.invalidData)

					copyToClipboard(data)
					confirm({
						confirmButton: textsCap.done,
						content: (
							<div>
								{textsCap.manualBkp0}
								<ol>
									<li>{textsCap.manualBkp1}</li>
									<li>{textsCap.manualBkp2}</li>
									<li>
										{textsCap.manualBkp3} <br />
										<b>{filename}</b>
									</li>
								</ol>
							</div>
						),
						header: textsCap.manualBkpHeader,
						size: 'tiny',
					})
				},
				type: 'button',
			},
		]

		return {
			...props,
			inputs: fillValues(inputs, values || {}),
			onClose: (...args) => {
				let { values: { redirectTo } = {} } = props
				isFn(props.onClose) && props.onClose(...args)
				try {
					redirectTo = new URL(redirectTo)
					window.location.href = redirectTo.href
				} catch (err) {}
			},
			onSubmit: null, // trigger onSubmit locally
			values: { ...props.values },
			closeText: values => ({
				content: values[inputNames] === steps.unconfirmed
					? textsCap.backupLater
					: textsCap.close,
				negative: false,
			}),
			submitText: (values, formProps, disabled) => {
				const { success } = formProps
				// hide submit button when download is completed
				if (success) return null

				const btn = { disabled }
				const confirmedIn = findInput(inputs, inputNames.confirmed)
				switch (values[inputNames.confirmed]) {
					default:
					case steps.unconfirmed:
						// initial info text displayed
						btn.content = textsCap.backupNow
						btn.primary = true
						btn.onClick = () => confirmedIn.rxValue.next(steps.confirmed)
						break
					case steps.confirmed:
						// user enters password
						btn.content = textsCap.proceed
						btn.primary = true
						btn.onClick = () => {
							const proceed = () => confirmedIn.rxValue.next(steps.download)
							const isGenerated = rxPasswordGen.value === rxPassword.value
							if (!isGenerated) return proceed()

							confirm({
								cancelButton: textsCap.passwordGenWarnClose,
								confirmButton: textsCap.passwordGenWarnBtn,
								content: textsCap.passwordGenWarnContent,
								header: (
									<Text {...{
										className: 'header',
										color: 'red',
										invertedColor: 'orange',
										style: {
											// overrides the background color defined in the <Text /> component
											background: undefined, 
											// overrides the text capitalization on modal header
											textTransform: 'initial',
										},
									}}>
										
										{textsCap.passwordGenWarnHeader}
									</Text>
								),
								onConfirm: proceed,
								size: 'mini',
							})
						}
						break
					case steps.download: 
						// download and verify
						btn.content = textsCap.downloadAgain
						btn.icon = 'download'
						btn.positive = false
						btn.onClick = () => confirmedIn.rxValue.next('no')
						break
				}
				return btn
			},
		}
	})

	return <FormBuilder {...{ ...props, ...state }} />
}
BackupForm.defaultProps = {
	closeOnSubmit: false,
	header: textsCap.headerUnconfirmed,
	values: {
		// confirmed: 'yes'
	},
}
BackupForm.propTypes = {
	values: PropTypes.object,
}
/**
 * @name	BackupForm.checkAndWarn
 * @summary check if any of the criticial and essential data has not been backed up and ask user to backup.
 * 
 * @param	{Boolean}	criticalOnly	warn only if critical data (eg: user creds, identities) is not backed up.
 */
BackupForm.checkAndWarn = async (criticalOnly = false) => {
	const { id, fileBackupTS } = getUser() || {}
	const query = { fileBackupTS: undefined }
	const warnContacts = contact.search(query)
	const warnIdentities = identity.search(query)
	const warnLocations = location.search(query)
	const warnPartners = partner.search(query)
	const warnUserCreds =  new Map(!!id && !fileBackupTS ? [[]]: [])
	const total = warnContacts.size
		+ warnIdentities.size
		+ warnLocations.size
		+ warnPartners.size
		+ warnUserCreds.size
	// all backed up
	if (total === 0) return

	const styleCritical = { color: 'orange', fontWeight: 'bold' }
	const iconWarning = (
		<Text {...{
			color: 'red',
			El: Icon,
			invertedColor: 'yellow',
			name: 'warning sign'
		}} />
	)
	const items = [
		{
			critical: true,
			hideCount: true,
			map: warnUserCreds, 
			style: styleCritical,
			subtitle: textsCap.warnCriticalA,
			title: textsCap.userCredentials,
		},
		{
			critical: true,
			map: warnIdentities,
			style: styleCritical,
			subtitle: textsCap.warnCriticalB,
			title: textsCap.identities,
		},
		{
			map: warnPartners, 
			title: textsCap.partners,
		},
		{
			map: warnContacts, 
			title: textsCap.contacts,
		},
		{
			map: warnLocations, 
			title: textsCap.locations,
		},
	]

	if (criticalOnly && !items.find(x => !!x.critical && !!x.map.size)) return

	const content = (
		<div>
			<Text {...{
				color: 'red',
				children: textsCap.warnBackupContent1,
				invertedColor: 'orange',
				style: {
					fontSize: 18,
					fontWeight: 'bold',
				}
			}} />
			<p>
				{textsCap.warnBackupContent2}
			</p>
			<ul style={{fontSize: 15}}>
				{items.map((item, i) => {
					const {
						critical,
						hideCount,
						map = new Map(),
						style,
						subtitle,
						title,
					} = item
					return map.size && (
						<li key={i} style={style}>
							{critical && iconWarning}{title} {!hideCount && `(${map.size})`}
							{subtitle && (
								<span>
									{' - '}{subtitle}
								</span>
							)}
						</li>
					)
				}).filter(Boolean)}
			</ul>
		</div>
	)
	const backupAsPromise = () => new Promise(resolve => {
		showForm(BackupForm, {
			onClose: () => resolve(false),
			onSubmit: ok => resolve(!!ok),
			values: { confirmed: 'yes' },
		})
	})
	return await confirmAsPromise({
		cancelButton: textsCap.backupLater,
		confirmButton: {
			content: textsCap.proceed,
			positive: true,
		},
		content,
		header: textsCap.warnBackupHeader,
		onConfirm: backupAsPromise,
		size: 'tiny',
	})
}

setTimeout(() => { 
	// prevent check if user is not registered
	if (!(getUser() || {}).id) return

	const key = 'autoCheckAndWarnTS'
	const last = (storage.settings.module(MODULE_KEY) || {})[key]
	// wait 24 hours if user closed without completing backup
	const checkNow = !last || ((new Date() - new Date(last)) / 1000 / 60 / 60 > 24)
	checkNow && BackupForm
		.checkAndWarn(true)
		.then(done => {
			storage
				.settings
				.module(MODULE_KEY, {
					[key]: new Date().toISOString(),
				})
		})
})