import React, { useEffect } from 'react'
import { BehaviorSubject } from 'rxjs'
import { Button, Icon, Step } from 'semantic-ui-react'
import PromisE from '../../utils/PromisE'
import { generateHash, isFn, isValidNumber } from '../../utils/utils'
// forms and components
import FormBuilder from '../../components/FormBuilder'
import Invertible from '../../components/Invertible'
import RestoreBackupForm from './RestoreBackupForm'
import NewsletteSignup from '../../forms/NewsletterSignup'
// services
import { translated } from '../../services/language'
import { closeModal, confirm, showForm } from '../../services/modal'
// import { addToQueue, QUEUE_TYPES } from '../services/queue'
import { useRxSubject } from '../../services/react'
import storage, { downloadBackup } from '../../utils/storageHelper'
import { setToast } from '../../services/toast'
// modules
import { createInbox, SUPPORT, TROLLBOX } from '../chat/chat'
import { getUser, rxIsRegistered } from '../chat/ChatClient'
import RegistrationForm from '../chat/RegistrationForm'
import { getSelected, rxIdentities } from '../identity/identity'
import IdentityForm from '../identity/IdentityForm'
import LabelCopy from '../../components/LabelCopy'
import { setActive } from '../../services/sidebar'
import { MOBILE, rxLayout } from '../../services/window'
import BackupForm from './BackupForm'


window.backup = () => showForm(BackupForm)
const texts = translated({
	backupTitle: 'Backup your account',
	backupDescription: `
		Creating a backup will help you make sure that you do not lose your account. 
		Additionally, you will also be able to restore your account on another device.
	`,
	// confirmBackupContent: `
	// 	You are about to download your Totem application data as a JSON file. 
	// 	The following information will be included: 
	// `,
	// keep the commas. they will be used to generate an unordered list
	confirmBackupTypes: 'history, identities, locations, notifications, partners, recent chat messages, settings, user credentials',
	confirmHeader: 'Are you sure?',
	confirmRestoreContent: `
		You are about to replace application data with the data in the JSON file. 
		This is potentially dangerous and you can lose your identity, chat User ID and other data.
	`,
	// faucetRequest: 'Faucet request',
	// faucetRequestDetails: 'Transaction allocations to get you started',
	newsletterSignup: 'Signup For Announcements',
	registrationSuccess: `
		Registration successful! You will shortly receive an allocation of transactions to get you started.
	`,
	quickGuidePara1: `
		Totem is currently under heavy development, but you can already use the Identities, Partners, Activities 
		and Timekeeping Modules as well as make basic transfers of your transaction allocations balance using the Transfer Module.`,
	quickGuidePara2: `
		Most of what you do in the application will consume Totem Transactions ($TOTEM for short) from your balance but don't worry, we are nice open source people, and we'll give you plenty to get you started.
	`,
	quickGuideTitle: 'A quick guide to getting started with Totem Live Accounting.',
	referCopy: 'Copy your referral link',
	referDesc1: 'Totem works best when you have partners. Referring will get both you and your friends free tokens.',
	referDesc2: 'Invite your friends to join Totem using the following link:',
	referTitle: 'Refer to earn free tokens!',
	restoreTitle: 'Got a backup of an existing account?',
	restoreTitle2: 'Want to restore an existing backup?',
	restoreBtnTitle: 'Restore backup',
	step1Description: `Identities are only known to you. You can create as many as you like in the Identities Module.`,
	step1Title: 'Edit Default Identity',
	stepsTitle: `Only 3 short steps to begin. Let's go!`,
	step2Description: `
		Chat is how you communicate with other Totem users. Choose a unique name (preferably not your own name!)
	`,
	step2Title: 'Create Chat User ID',
	step2Title2: 'Your User ID',
	supportChatHeader: 'Got any questions?',
	supportChatDesc1: `
		Now that you are registered with our messaging service you can contact us anytime using the support chat channel.
	`,
	supportChatDesc2: 'You can also reach us over on the following applications:',
	supportContact: 'Contact Support',
	trollbox: 'Join Totem Global Conversation',
	videoGuidTitle: 'Further essential steps:',
	video1Title: 'What am I looking at? Watch the video:',
	video2Title: 'Backup your account. Watch the video:',
})[0]
const textsCap = translated({
	backupLater: 'backup later',
	backupNow: 'backup now',
	// backupConfirmHeader: 'confirm backup',
	backupFileInvalid: `
		Uploaded file contents do not match the backup file contents!
		If you did not save the backup file, please click on the close icon and initiate the backup process again.
	`,
	backupFileinvalidType: 'please select the .json file you have just downloaded',
	backupFileLabel: 'select backup file',
	backupFileLabelDetails: 'Please select the file you have just downloaded. This is to make sure your backup was successfully downloaded.',
	backupFileLabelDetailsLocation: 'Check for the following file in your default downloads folder (if you have NOT manually selected the download location).',
	backupFileLabelDetailsDesktop: 'You can drag-and-drop the backup file on the file chooser below.',
	backupSuccessContent: `
		Excellent! You have just downloaded your account data. 
		You can use this file to restore your account on any other devices you choose.
		Make sure to keep the downloaded file in a safe place.
		To keep your account safe, never ever share your backup file with anyone else.
		Totem team will never ask you to share your backup file.
	`,
	backupSuccessHeader: 'backup complete!',
	fileName: 'file name',
	invalidFileType: 'selected file name must end with .json extension.',
}, true)[1]
const MODULE_KEY = 'getting-started'
// read/write to module settings
const rw = value => storage.settings.module(MODULE_KEY, value) || {}
const rxActiveStep = new BehaviorSubject(rw().activeStep || 0)
export const registerStepIndex = 0
/**
 * @name	setActiveStep
 * @summary	get/set active step
 * 
 * @param	{Number} stepNo (optional) if not supplied will return saved active step
 * 
 * @returns {Number}
 */
export const saveActiveStep = stepNo => {
	const v = !isValidNumber(stepNo)
		? undefined
		: { activeStep: stepNo }
	stepNo = rw(v).activeStep || 0
	v && rxActiveStep.next(stepNo)
	return stepNo
}
// old localStorage key for active step 
const legacyKey = 'totem_getting-started-step-index'
try {
	// migrate global to module settings and remove legacy key
	if (localStorage.getItem(legacyKey) || (storage.settings.global(MODULE_KEY) || {}).activeStep) {
		localStorage.removeItem(legacyKey)
		storage.settings.global(MODULE_KEY, null)
		const activeStep = parseInt(localStorage.getItem(legacyKey) || storage.settings.global(MODULE_KEY).activeStep)
		setActiveStep(activeStep)
	}
} catch (e) { }

export default function GetingStarted() {
	const [[isRegistered, steps]] = useRxSubject(rxIsRegistered, isRegistered => {
		const steps = [
			{
				description: texts.step2Description,
				onClick: handleRegister,
				title: isRegistered
					? `${texts.step2Title2}: @${getUser().id}`
					: texts.step2Title,
			},
			{
				description: texts.step1Description,
				onClick: handleUpdateIdentity,
				title: texts.step1Title,
			},
			{
				// allow the user to backup even after step is completed
				disabled: activeStep => activeStep <= registerStepIndex,
				description: texts.backupDescription,
				onClick: handleBackup,
				title: texts.backupTitle,
			},
		]

		return [isRegistered, steps]
	})
	const [activeStep] = useRxSubject(rxActiveStep)

	return (
		<div>
			<h3>{texts.quickGuideTitle}</h3>
			<p>{texts.quickGuidePara1}</p>
			<p>{texts.quickGuidePara2}</p>
			<h4>{texts.stepsTitle}</h4>
			<div style={{ overflowX: 'auto' }}>
				<Step.Group fluid ordered>
					{steps.map(({ description, disabled, onClick, title }, index) => (
						<Step {...{
							active: activeStep === index,
							completed: activeStep > index,
							disabled: isFn(disabled)
								? disabled(activeStep, steps)
								: activeStep !== index,
							key: index,
							onClick,
						}}>
							<Step.Content>
								<Step.Title>{title}</Step.Title>
								<Step.Description style={styles.stepDescription}>
									{description}
								</Step.Description>
							</Step.Content>
						</Step>
					)).filter(Boolean)}
				</Step.Group>
			</div>

			{/* <h3>{texts.videoGuidTitle}</h3>
				<h5>{texts.video1Title}</h5>
				<div style={styles.videoContainer}>
					<Embed
						aspectRatio='16:9'
						id='1'
						source='vimeo'
					/>
				</div>
				<h5>{texts.video2Title}</h5>
				<div style={styles.videoContainer}>
					<Embed
						aspectRatio='16:9'
						id='1'
						source='vimeo'
					/>
				</div> */}

			{/* Restore backup section */}
			<div style={styles.space}>
				<h3>{texts.restoreTitle}</h3>
				<Button {...{
					content: texts.restoreBtnTitle,
					onClick: handleRestoreBackup,
				}} />
			</div>

			{/* Social links and support chat section */}
			<div style={styles.space}>
				<h3>{texts.supportChatHeader}</h3>
				<div>
					{texts.supportChatDesc1}
					<div>
						{[
							isRegistered && {
								content: texts.supportContact,
								icon: 'heartbeat',
								onClick: () => createInbox([SUPPORT], null, true),
								size: 'mini',
								style: styles.btnStyle,
							},
							isRegistered && {
								content: texts.trollbox,
								icon: 'globe',
								onClick: () => createInbox([TROLLBOX], null, true),
								size: 'mini',
								style: styles.btnStyle,
							},
							// {
							// 	content: texts.newsletterSignup,
							// 	icon: 'mail',
							// 	onClick: () => showForm(NewsletteSignup),
							// 	size: 'mini',
							// 	style: styles.btnStyle,
							// },
						]
							.filter(Boolean)
							.map((props, i) => <Button {...props} key={props.icon + i} />)
						}
					</div>
				</div>
				{texts.supportChatDesc2}
				<div>
					<a href='https://twitter.com/intent/follow?screen_name=Totem_Live_' target='_blank'>
						<Invertible El={Icon} name='twitter' style={styles.appIconStyle} />
					</a>
					<a href='https://discord.gg/Vx7qbgn' target='_blank'>
						<Invertible El={Icon} name='discord' style={styles.appIconStyle} />
					</a>
					<a href='https://t.me/totemchat' target='_blank'>
						<Invertible El={Icon} name='telegram' style={styles.appIconStyle} />
					</a>
					<a href='https://www.linkedin.com/company/totem-live-accounting' target='_blank'>
						<Invertible El={Icon} name='linkedin' style={styles.appIconStyle} />
					</a>
					<a href='https://medium.com/totemlive' target='_blank'>
						<Invertible {...{
							dynamicProps: inverted => ({ color: !inverted ? 'black' : undefined }),
							El: Icon,
							name: 'medium',
							style: styles.appIconStyle,
						}} />
					</a>
					<a href='https://www.youtube.com/channel/UCV0ZV3kCLfi3AnlNR1Eyr0A' target='_blank'>
						<Invertible {...{
							dynamicProps: inverted => ({
								className: !inverted ? 'red' : undefined,
							}),
							El: Icon,
							name: 'youtube',
							style: styles.appIconStyle,
						}} />
					</a>
					<a href='https://www.reddit.com/r/totemlive' target='_blank'>
						<Invertible {...{
							dynamicProps: inverted => ({
								style: {
									...styles.appIconStyle,
									color: inverted ? undefined : '#FF4500'
								},
							}),
							El: Icon,
							name: 'reddit',
						}} />
					</a>
				</div>
			</div>
		</div >
	)
}

const handleBackup = () => showForm(
	BackupForm,
	{
		onSubmit: done => done && incrementStep(),
	},
)

const handleUpdateIdentity = () => {
	const values = getSelected()
	// forces user to enter a new name for the identity
	if (values.name === 'Default') values.name = ''
	showForm(IdentityForm, {
		onClose: incrementStep,
		onSubmit: incrementStep,
		values,
	})
}

const handleRegister = () => showForm(RegistrationForm, {
	closeOnSubmit: true,
	silent: false,
	onSubmit: ok => {
		if (!ok) return
		setToast({
			content: texts.registrationSuccess,
			status: 'success',
		})
		setActive('rewards')
	}
})

const handleRestoreBackup = () => showForm(RestoreBackupForm)

// confirm({
// 	content: (
// 		<div>
// 			{texts.confirmRestoreContent}
// 			<ul>
// 				{texts.confirmBackupTypes.split(',').map((str, i) => <li key={i}>{str}</li>)}
// 			</ul>
// 		</div>
// 	),
// 	header: texts.confirmHeader,
// 	size: 'tiny',
// 	onConfirm: () => showForm(RestoreBackupForm),
// })

const incrementStep = () => {

	setActiveStep((rxActiveStep.value || 0) + 1)

}

export const setActiveStep = (nextStep = rxActiveStep.value, silent = false) => {
	const user = getUser()
	if (nextStep === registerStepIndex && user && user.id) {
		// user Already registered => mark register step as done
		nextStep++
	}
	saveActiveStep(nextStep)

	if (silent) return nextStep

	switch (nextStep) {
		case 0:
			handleRegister()
			break
		case 1:
			handleUpdateIdentity()
			break
		case 2:
			handleBackup()
			break
	}
	return nextStep
}

/*
 * confrim backup by forcing user to upload the file user just downloaded
 */
/**
 * 
 * @param	{Boolean}	showSuccess whether to show success message after backup has been confirmed
 */
export const confirmBackup = (showSuccess = true) => new PromisE(resolveConfirm => {
	const [content, fileBackupTS, fileName] = downloadBackup()
	const contentHash = generateHash(content)
	let modalId
	// update identities with the new backup timestamp
	const updateIdentities = () => {
		const arr = Array.from(rxIdentities.value)
			.map(([key, value]) => [
				key,
				{ ...value, fileBackupTS },
			])
		rxIdentities.next(new Map(arr))
	}
	const validateFile = e => new Promise(resolveValidate => {
		try {
			const file = e.target.files[0]
			const name = e.target.value
			var reader = new FileReader()
			if (name && !name.endsWith('.json')) throw textsCap.invalidFileType

			reader.onload = file => {
				const match = contentHash === generateHash(file.target.result)
				resolveValidate(!match && textsCap.backupFileInvalid)
				if (!match) {
					file.target.value = null // reset file
					return
				}
				updateIdentities()
				closeModal(modalId)

				if (!showSuccess) return resolveConfirm(true)
				confirm({
					content: textsCap.backupSuccessContent,
					confirmButton: null,
					header: textsCap.backupSuccessHeader,
					onCancel: () => resolveConfirm(true),
					size: 'tiny',
				})
			}
			reader.readAsText(file)
		} catch (err) {
			resolveValidate(err)
		}
	})

	const isMobile = rxLayout.value === MOBILE
	const props = {
		header: textsCap.backupConfirmHeader,
		size: 'tiny',
		submitText: null,
		closeText: null,
		// in case user doesnt confirm download
		onClose: () => resolveConfirm(false),
		inputs: [{
			accept: '.json',
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
						<b style={{ color: 'green' }}>{fileName}</b>
					</p>

					{!isMobile && <p>{textsCap.backupFileLabelDetailsDesktop}</p>}
				</div>
			),
			name: 'file',
			type: 'file',
			validate: validateFile,
		}],
	}

	modalId = showForm(FormBuilder, props)
})

const styles = {
	appIconStyle: {
		fontSize: 32,
		lineHeight: '40px',
	},
	btnStyle: { marginTop: 5, marginBottom: 5 },
	space: { marginTop: 25 },
	stepDescription: {
		maxWidth: 215,
	},
	videoContainer: {
		height: 225,
		width: 400,
		maxWidth: '100%'
	},
}