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
import { getUser } from '../../utils/chatClient'
import { translated } from '../../utils/languageHelper'
import storage, { backup } from '../../utils/storageHelper'
import { iUseReducer } from '../../utils/reactHelper'
import {
	copyToClipboard,
	deferred,
	generateHash,
	isFn,
	isStr,
} from '../../utils/utils'
import identity from '../identity/identity'
import partner from '../partner/partner'
import location from '../location/location'
import contact from '../contact/contact'
import { Icon } from 'semantic-ui-react'
import Text from '../../components/Text'
import { MODULE_KEY } from './GettingStarted'
import { encryptBackup } from '.'
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
	invalidFileType: 'selected file name must end with .json extension.',
	header: 'backup your account',
	headerConfirmed: 'confirm backup',
	headerPassword: 'protect your backup',
	locations: 'locations',
	manualBkp0: 'backup file contents have been copied to clipboard. Follow the instructions below:',
	manualBkp1: 'open a text editor and create a new file',
	manualBkp2: 'paste the backup file contents (press CTRL+V or CMD+V on an Apple computer)',
	manualBkp3: 'save the copied text with the following filename:',
	manualBkpHeader: 'save file manually',
	notifications: 'notifications',
	partners: 'partners',
	passwordLabel: 'password',
	passwordPlaceholder: 'enter a password for this backup',
	proceed: 'proceed',
	settings: 'settings',
	userCredentials: 'user credentials',
	warnBackupContent1: 'you are at risk of accidantal data loss!',
	warnBackupContent2: 'the following items are not backed up:',
	warnBackupContent3: 'click proceed to download a backup of your account now.',
	warnBackupHeader: 'backup recommended!',
	warnCriticalA: 'you maybe at risk of losing your account!',
	warnCriticalB: 'you maybe at risk of losing your funds!',
}, true)[1]
const inputNames = {
	confirmed: 'confirmed',
	downloadData: 'downloadData',
	file: 'file',
	notes: 'notes',
	password: 'password',
	redirectTo: 'redirectTo',
}
export const steps = {
	unconfirmed: 'no',
	confirmed: 'yes',
	download: 'download',
	verified: 'verified',
}

export default function BackupForm(props) {
	const [state] = iUseReducer(null, rxState => {
		const { onSubmit, values = {} } = props
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
			const confirmed = values[inputNames.confirmed]
			const isConfirmed = confirmed === steps.confirmed
			const isDownload = confirmed === steps.download
			const downloadData = isDownload && backup.download(
				filename,
				data => encryptBackup(data, values[inputNames.password]),
			)
			const ddIn = findInput(inputs, inputNames.downloadData)
			// store downloaded data for confirmation
			ddIn && ddIn.rxValue.next(downloadData)

			// update form header
			const header = isConfirmed
				? textsCap.headerPassword
				: isConfirmed
				? textsCap.headerConfirmed
				: textsCap.header
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

						findInput(inputs, inputNames.confirmed)
							.rxValue
							.next(steps.verified)
						
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
				hidden: values => values[inputNames.confirmed] !== steps.confirmed,
				label: textsCap.passwordLabel,
				maxLength: 64,
				minLength: 8,
				name: inputNames.password,
				placeholder: textsCap.passwordPlaceholder,
				// regex: new RegExp(//),
				required: true,
				rxValue: new BehaviorSubject(''),
				type: 'password',

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
					const downloadData = JSON.stringify(
						findInput(inputs, inputNames.downloadData).value
					)
					copyToClipboard(downloadData)
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
						btn.content = textsCap.backupNow
						btn.primary = true
						btn.onClick = () => confirmedIn.rxValue.next(steps.confirmed)
						break
					case steps.confirmed:
						btn.content = textsCap.proceed
						btn.primary = true
						btn.onClick = () => confirmedIn.rxValue.next(steps.download)
						break
					case steps.download: 
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
	header: textsCap.header,
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