import React from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import { Icon } from 'semantic-ui-react'
import { ButtonDelayed } from '../../components/buttons'
import FormBuilder, {
	fillValues,
	findInput,
} from '../../components/FormBuilder'
import Text from '../../components/Text'
import {
	confirm,
	confirmAsPromise,
	showForm,
} from '../../services/modal'
import { setToast } from '../../services/toast'
import { getUser, rxIsRegistered } from '../../utils/chatClient'
import { translated } from '../../utils/languageHelper'
import {
	RxSubjectView,
	UseHook,
	statuses,
	useIsMobile,
	useRxState
} from '../../utils/reactjs'
import storage, { backup } from '../../utils/storageHelper'
import {
	copyToClipboard,
	deferred,
	generateHash,
	isFn,
	isHex,
} from '../../utils/utils'
import contact from '../contact/contact'
import identity from '../identity/identity'
import location from '../location/location'
import partner from '../partner/partner'
import {
	MODULE_KEY,
	saveActiveStep,
	stepIndexes,
} from './GettingStarted'
import { encryptBackup, generatePassword } from '.'

const textsCap = {
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
	goBack: 'go back',
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
	passwordCopiedToCB: 'your newly generated password has been copied to clipboard.',
	passwordCrHeader: 'Enter a password matching the following criteria:',
	passwordCrLength: 'between 8 and 64 characters',
	passwordCrLower: 'lowercase letters',
	passwordCrNum: 'numbers',
	passwordCrSpecial: 'special characters',
	passwordCrUpper: 'uppercase letters',
	passwordBtnTitle: 'generate a random password',
	passwordGenWarnContent: 'please make sure to save the newly generated password in a secure place, preferably a password manager.',
	passwordGenWarnHeader: 'have you saved your newly generated password?',
	passwordLabel: 'password',
	passwordPlaceholder: 'enter a password for this backup',
	proceed: 'proceed',
	reloadingPage: 'reloading page...',
	settings: 'settings',
	skipPasswordLabel: 'download without encryption',
	skipPasswordWarn0: 'caution advised',
	skipPasswordWarn1: 'we only recommend encrypted backups.',
	skipPasswordWarn2: 'you are about to download your entire Totem account data in plain text.',
	skipPasswordWarn3: 'this includes your identities, partners, chat history and other information.',
	skipPasswordWarn4: 'anyone who has access to the downloaded file will have complete access to your entire Totem account including identities and any funds you have in them!',
	skipPasswordWarn5: 'you can proceed at your own risk!',
	userCredentials: 'user credentials',
	warnBackupContent1: 'you are at risk of accidental data loss!',
	warnBackupContent2: 'the following items are not backed up:',
	warnBackupContent3: 'click proceed to download a backup of your account now.',
	warnBackupHeader: 'backup recommended!',
	warnCriticalA: 'you may be at risk of losing your account!',
	warnCriticalB: 'you may be at risk of losing your funds!',
	yesProceed: 'yes, proceed!',
}
translated(textsCap, true)
const inputNames = {
	step: 'confirmed',
	downloadData: 'downloadData',
	file: 'file',
	notes: 'notes',
	password: 'password',
	passwordConfirm: 'passwordConfirm',
	redirectTo: 'redirectTo',
	skipPassword: 'skipPassword',
}
export const steps = {
	unconfirmed: 'no', // initial state
	confirmed: 'yes', // user enters password
	download: 'download', // user is to verify downloaded backup
	verified: 'verified', // verification + backup complete
}

export default function BackupForm(props) {
	const [state] = useRxState(rxState => {
		const { values = {} } = props
		const rxPassword = new BehaviorSubject('')
		const rxPasswordGen = new BehaviorSubject('')
		if ((values.confirmed || '').toLowerCase() !== steps.confirmed) {
			values.confirmed = steps.unconfirmed
		}
		const rxFileName = new BehaviorSubject('')
		const elFileName = <RxSubjectView subject={rxFileName} />
		const rxStep = new BehaviorSubject(steps.unconfirmed)
		const rxUserName = new BehaviorSubject()
		rxIsRegistered.subscribe(() =>
			rxUserName.next(
				`${(getUser() || {}).id || ''}@${window.location.host}`
			)
		)
		const inputs = [
			{
				name: 'username',
				type: 'hidden',
				rxValue: rxUserName,
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
				hidden: values => values[inputNames.step] !== steps.confirmed
					|| values[inputNames.skipPassword] === true,
				inlineLabel: {
					color: 'green',
					icon: {
						className: 'no-margin',
						name: 'random',
					},
					onClick: handleGeneratePw(rxPassword, rxPasswordGen),
					style: { cursor: 'pointer' },
					title: textsCap.passwordBtnTitle,
				},
				label: textsCap.passwordLabel,
				name: inputNames.password,
				// trigger a change on the password confirm input to force re-validation
				onChange: (_, values) => {
					const pwConfirm = values[inputNames.passwordConfirm]
					if (!pwConfirm) return

					const pwConfirmIn = findInput(inputs, inputNames.passwordConfirm)
					// first set a placeholder password, otherwise, RxJS won't register it as a change
					pwConfirmIn.rxValue.next('-'.repeat(pwConfirm.length))
					// set back the original password
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
				hidden: values => values[inputNames.step] !== steps.confirmed
					|| values[inputNames.skipPassword] === true
					|| (rxPassword.value && rxPassword.value === rxPasswordGen.value),
				// || `${values[inputNames.password] || ''}`.length < 8
				label: textsCap.passwordConfirmLabel,
				name: inputNames.passwordConfirm,
				// onPaste: (e, d) => {
				// 	const pastedStr = `${e.clipboardData.getData('text/plain') || ''}`
				// 	// only allow pasting generated and/or medium to large passwords
				// 	if (pastedStr.length < 12) e.preventDefault()
				// },
				placeholder: textsCap.passwordConfirmPlaceholder,
				required: true,
				rxValue: new BehaviorSubject(''),
				type: 'password',
				validate: (e, _, values) => {
					const isConfirmed = values[inputNames.step] === steps.confirmed
					const pw = `${values[inputNames.password] || ''}`
					const pwConf = values[inputNames.passwordConfirm]

					return isConfirmed
						&& !!pwConf
						&& pw !== pwConf
						&& textsCap.passwordConfirmErr
				},
			},
			{
				label: textsCap.skipPasswordLabel,
				hidden: values => values[inputNames.step] !== steps.confirmed,
				name: inputNames.skipPassword,
				// update filename to include/exclude "encrypted" at the end
				onChange: (_, values) => rxFileName.next(
					backup.generateFilename(
						values[inputNames.skipPassword] !== true
					)
				),
				rxValue: new BehaviorSubject(false),
				toggle: true,
				type: 'checkbox',
			},
			{
				name: inputNames.step,
				onChange: handleConfirmChange(rxState, rxFileName),
				rxValue: rxStep,
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
				hidden: values => values[inputNames.step] !== steps.unconfirmed,
				name: inputNames.notes,
				type: 'html',
				content: (
					<div>
						{textsCap.confirmBackupContent1} {textsCap.confirmBackupContent2}
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
								.map((str, i) => (
									<li key={i}>{str}</li>
								))}
						</ul>
					</div>
				),
			},
			{
				accept: '.json',
				disabled: values => steps.verified === values[inputNames.step],
				hidden: values => ![steps.download, steps.verified]
					.includes(values[inputNames.step]),
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
							<b style={{ color: 'green' }}>{elFileName}</b>
						</p>

						<UseHook {...{
							hook: useIsMobile,
							render: isMobile => !isMobile && <p>{textsCap.backupFileLabelDetailsDesktop}</p>,
						}} />
					</div>
				),
				name: inputNames.file,
				type: 'file',
				validate: validateFileSelected(
					rxState,
					rxStep,
					props
				),
			},
			{
				content: textsCap.downloadFailed,
				hidden: values => values[inputNames.step] !== steps.download,
				name: 'download-text',
				negative: true,
				onClick: handleDownloadTextClick(rxState),
				type: 'button',
			},
		]

		return {
			...props,
			// close/cancel button
			closeText: values => ({
				content: values[inputNames] === steps.unconfirmed
					? textsCap.backupLater
					: textsCap.close,
				negative: false,
			}),
			inputs: fillValues(inputs, values || {}),
			onClose: (...args) => {
				let { values: { redirectTo } = {} } = props
				isFn(props.onClose) && props.onClose(...args)
				try {
					redirectTo = new URL(redirectTo)
					window.location.href = redirectTo.href
				} catch (err) { }
			},
			onSubmit: null, // trigger onSubmit manually in the getSubmitText()
			submitText: getSubmitText(rxStep, rxPassword, rxPasswordGen),
			values: { ...props.values },
		}
	})

	return <FormBuilder {...{ ...props, ...state }} />
}
BackupForm.propTypes = {
	redirectTo: PropTypes.oneOfType([
		PropTypes.string,
		PropTypes.instanceOf(URL),
	]),
	// whether to reload page after backup has been confirmed.
	// ONLY applicable if `redirectTo` is falsy.
	reload: PropTypes.bool,
	values: PropTypes.object,
}
BackupForm.defaultProps = {
	closeOnSubmit: false,
	header: textsCap.headerUnconfirmed,
	reload: true,
}
/**
 * @name	BackupForm.checkAndWarn
 * @summary check if any of the criticial and essential data has not been backed up and ask user to backup.
 * 
 * @param	{Boolean} criticalOnly	  (optional) warn only if one or more critical data (eg: user creds, identities) 
 * 									  is not backed up.
 * @param 	{Boolean} allowPageReload (optional) whether to allow BackupForm to reload to page in order to prompt user to save password by the password manager
 * 
 * @returns	{Boolean}	indicates whether a backup was downloaded & confirmed. `Undefined` means backup not required.
 */
BackupForm.checkAndWarn = async (
	criticalOnly = false,
	allowPageReload = true,
	closeOnSubmit = false
) => {
	return
	const { id, fileBackupTS } = getUser() || {}
	const query = { fileBackupTS: undefined }
	const warnContacts = contact.search(query)
	const warnIdentities = identity.search(query)
	const warnLocations = location.search(query)
	const warnPartners = partner.search(query)
	const warnUserCreds = new Map(!!id && !fileBackupTS ? [[]] : [])
	const total = warnContacts.size
		+ warnIdentities.size
		+ warnLocations.size
		+ warnPartners.size
		+ warnUserCreds.size
	// all backed up
	if (total === 0) return

	// set getting started step to backup
	saveActiveStep(stepIndexes.backup)

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
			<ul style={{ fontSize: 15 }}>
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
									{' - '}
									{subtitle}
								</span>
							)}
						</li>
					)
				}).filter(Boolean)}
			</ul>
		</div>
	)

	const confirmed = await confirmAsPromise({
		cancelButton: textsCap.backupLater,
		confirmButton: {
			content: textsCap.proceed,
			positive: true,
		},
		content,
		header: textsCap.warnBackupHeader,
		size: 'tiny',
	})
	return confirmed && new Promise(resolve => {
		showForm(BackupForm, {
			closeOnSubmit,
			onClose: () => resolve(false),
			onSubmit: ok => resolve(!!ok),
			// prevent reloading page?
			reload: allowPageReload,
			values: { confirmed: 'yes' },
		})
	})
}

const getSubmitText = (rxStep, rxPassword, rxPasswordGen) => (values, formProps, disabled) => {
	const { success } = formProps
	// hide submit button when download is completed
	if (success) return null

	const btn = { disabled }
	switch (values[inputNames.step]) {
		default:
		case steps.unconfirmed:
			// initial info text displayed
			btn.content = textsCap.backupNow
			btn.primary = true
			btn.onClick = () => rxStep.next(steps.confirmed)
			break
		case steps.confirmed:
			// user enters password
			btn.content = textsCap.proceed
			const skipPassword = values[inputNames.skipPassword] === true
			btn.primary = !skipPassword
			btn.negative = skipPassword
			btn.onClick = () => {
				const proceed = () => rxStep.next(steps.download)
				const skipPassword = values[inputNames.skipPassword] === true
				const shouldConfirm = rxPasswordGen.value
					&& rxPasswordGen.value === rxPassword.value
					|| skipPassword

				if (!shouldConfirm) return proceed()

				confirm({
					cancelButton: textsCap.goBack,
					confirmButton: (
						<ButtonDelayed {...{
							negative: skipPassword,
							seconds: skipPassword ? 15 : 10,
						}}>
							{textsCap.yesProceed}
						</ButtonDelayed>
					),
					content: (
						<div style={{ whiteSpace: 'pre-line' }}>
							<Text {...{
								color: 'red',
								invertedColor: 'orange',
								style: { fontWeight: 'bold' },
							}}>
								{!skipPassword
									? textsCap.passwordCopiedToCB
									: textsCap.skipPasswordWarn1}
							</Text>
							<br />
							<br />
							{!skipPassword
								? textsCap.passwordGenWarnContent
								: [
									textsCap.skipPasswordWarn2,
									textsCap.skipPasswordWarn3,
									'\n\n',
									textsCap.skipPasswordWarn4,
									textsCap.skipPasswordWarn5,
								].join(' ')}
						</div>
					),
					header: (
						<span {...{
							className: 'header',
							style: {
								// overrides the background color defined in the <Text /> component
								background: undefined,
								// overrides the text capitalization on modal header
								textTransform: 'initial',
							},
						}}>
							{!skipPassword
								? textsCap.passwordGenWarnHeader
								: textsCap.skipPasswordWarn0}
						</span>
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
			btn.onClick = () => rxStep.next(steps.unconfirmed)
			break
	}
	return btn
}

const handleConfirmChange = (rxState, rxFileName) => deferred((_, values) => {
	const { inputs = [] } = rxState.value
	const step = values[inputNames.step]
	const password = values[inputNames.password]
	const encrypted = values[inputNames.skipPassword] !== true
	const isDownload = step === steps.download
	const downloadData = isDownload && backup.download(
		rxFileName.value,
		data => !encrypted
			? data
			: encryptBackup(data, password),
		encrypted,
	)
	const ddIn = findInput(inputs, inputNames.downloadData)
	// store downloaded data for confirmation
	ddIn.rxValue.next(downloadData)

	// update form header
	const header = step === steps.unconfirmed
		? textsCap.headerUnconfirmed
		: step === steps.confirmed
			? textsCap.headerConfirmed
			: textsCap.headerDownload
	rxState.next({ header })
}, 50)

const handleDownloadTextClick = rxState => () => {
	const { inputs = [] } = rxState.value
	const downloadData = findInput(inputs, inputNames.downloadData).value
	const { data } = downloadData || {}
	if (!isHex(data)) throw new Error(textsCap.invalidData)

	// copy the entire backup string to clipboard so that user can save it to a file manually
	copyToClipboard(data)

	return confirmAsPromise({
		confirmButton: textsCap.done,
		content: (
			<div>
				{textsCap.manualBkp0}
				<ol>
					<li>{textsCap.manualBkp1}</li>
					<li>{textsCap.manualBkp2}</li>
					<li>
						{textsCap.manualBkp3} <br />
						<b>{elFileName}</b>
					</li>
				</ol>
			</div>
		),
		header: textsCap.manualBkpHeader,
		size: 'tiny',
	})
}

// generate a password, copy it to clipboard and show a toast message
const handleGeneratePw = (rxPassword, rxPasswordGen) => e => {
	e.preventDefault()
	e.stopPropagation()
	const pw = generatePassword()
	rxPasswordGen.next(pw)
	rxPassword.next(pw)
	copyToClipboard(pw)
	const msg = {
		content: textsCap.passwordCopiedToCB,
		status: statuses.SUCCESS,
	}
	setToast(
		msg,
		0,
		'generated-password', // use predefined ID to prevent showing same toast multiple times
	)
	return pw
}

// on file select, check if the uploaded file matches the downloaded file
const validateFileSelected = (
	rxState,
	rxStep,
	props
) => (e, _, values) => new Promise(resolve => {
	try {
		const { onSubmit, reload } = props
		const file = e.target.files[0]
		const name = e.target.value
		var reader = new FileReader()
		if (name && !name.endsWith('.json')) throw textsCap.invalidFileType

		reader.onload = file => {
			try {
				const { hash, timestamp } = values[inputNames.downloadData] || {}
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
				backup.updateFileBackupTS(timestamp)

				// set as verified
				rxStep.next(steps.verified)

				// update getting started active step if necessary
				!!rxIsRegistered.value && saveActiveStep(stepIndexes.backup + 1)

				const message = {
					content: (
						<div>
							{textsCap.backupSuccessContent}
							<br />
							<br />
							{reload && (
								<div style={{ color: 'red' }}>
									<big>
										<ButtonDelayed El='span'>
											{textsCap.reloadingPage}
										</ButtonDelayed>
									</big>
								</div>
							)}
						</div>
					),
					header: textsCap.backupSuccessHeader,
					status: statuses.SUCCESS,
				}
				rxState.next({ message, success: true })
				// additionally show toast in case form message is out of sight (ie: on mobile)
				setToast(message, 5000, 'BackupForm')
				isFn(onSubmit) && onSubmit(true, values)

				if (redirectTo) {
					window.location.href = redirectTo
				} else if (reload) {
					// reload page to make sure user's password is prompted to be saved/updated by browser
					setTimeout(() => window.location.reload(true), 3000)
				}
			} catch (err) {
				console.error(err)
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

setTimeout(() => {
	// prevent check if user is not registered
	if (!(getUser() || {}).id) return

	const key = 'autoCheckAndWarnTS'
	const last = (storage.settings.module(MODULE_KEY) || {})[key]
	const checkNow = !last || (
		// check if 24 hours has pass since the last unsuccessful warning
		(new Date() - new Date(last)) / 1000 / 60 / 60 > 24
	)
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