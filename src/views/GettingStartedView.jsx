import React, { Component } from 'react'
import { Button, Icon, Step } from 'semantic-ui-react'
import { generateHash, isDefined, isValidNumber } from '../utils/utils'
import FormBuilder from '../components/FormBuilder'
import Invertible from '../components/Invertible'

import { translated } from '../services/language'
import { closeModal, confirm, showForm } from '../services/modal'
import { addToQueue, QUEUE_TYPES } from '../services/queue'
import storage, { downloadBackup } from '../services/storage'
import { setToast } from '../services/toast'
import RestoreBackupForm from '../forms/RestoreBackup'
import NewsletteSignup from '../forms/NewsletterSignup'

import { createInbox, SUPPORT, TROLLBOX } from '../modules/chat/chat'
import { getUser } from '../modules/chat/ChatClient'
import RegistrationForm from '../modules/chat/RegistrationForm'
import { getSelected, rxIdentities } from '../modules/identity/identity'
import IdentityForm from '../modules/identity/IdentityForm'
import PromisE from '../utils/PromisE'

const [texts] = translated({
	backupTitle: 'Backup your account',
	backupDescription: `
		Creating a backup will help you make sure that you do not lose your account. 
		Additionally, you will also be able to restore your account on another device.
	`,
	confirmBackupContent: `
		You are about to download your Totem application data as a JSON file. 
		The following information will be included: 
	`,
	// keep the commas. they will be used to generate an unordered list
	confirmBackupTypes: 'history, identities, locations, notifications, partners, recent chat messages, settings, user credentials',
	confirmHeader: 'Are you sure?',
	confirmRestoreContent: `
		You are about to replace application data with the JSON file. 
		This is potentially dangerous and you can lose your identity, chat User ID and other data.
	`,
	faucetRequest: 'Faucet request',
	faucetRequestDetails: 'Transaction allocations to get you started',
	newsletterSignup: 'Signup For Announcements',
	registrationSuccess: `
		Registration successful! You will shortly receive an allocation of transactions to get you started.
	`,
	quickGuidePara1: `
		Totem is currently under heavy development, but you can already use the Identities, Partners, Activities 
		and Timekeeping Modules as well as make basic transfers of your transaction allocations balance using the Transfer Module.`,
	quickGuidePara2: `
		Most of what you do in Totem will consume transactions from your balance (XTX for short) but don't worry, 
		we are nice open source people, and we'll give you plenty to get you started.
	`,
	quickGuidePara3: 'If you use up your balance - no problemo! Simply request some more from our automated faucet.',
	quickGuideTitle: 'A quick guide to getting started with Totem Live Accounting.',
	restoreTitle: 'Got a backup of an existing account?',
	restoreTitle2: 'Want to restore an existing backup?',
	restoreBtnTitle: 'Restore backup',
	step1Description: `Identities are only known to you. You can create as many as you like in the Identities Module.`,
	step1Title: 'Edit Default Identity',
	stepsTitle: `Only 2 short steps to begin. Let's go!`,
	step2Description: `
		Chat is how you communicate with other Totem users. Choose a unique name (preferably not your own name!)
	`,
	step2Title: 'Create Chat User ID',
	supportChatHeader: 'Got any questions?',
	supportChatDesc1: `
		Now that you are registered with our chat service you can contact us anytime using the support chat channel.
	`,
	supportChatDesc2: 'You can also reach us over on the following applications:',
	supportContact: 'Contact Support',
	trollbox: 'Join Totem Global Conversation',
	videoGuidTitle: 'Further essential steps:',
	video1Title: 'What am I looking at? Watch the video:',
	video2Title: 'Backup your account. Watch the video:',
})
const textsCap = translated({
	backupNow: 'backup now',
	backupConfirmHeader: 'confirm backup',
	backupFileInvalid: `
		Uploaded file contents do not match the backup file contents!
		If you did not save the backup file, please click on the close icon and initiate the backup process again.
	`,
	backupFileinvalidType: 'please select the .json file you have just downloaded',
	backupFileLabel: 'backup file',
	backupFileLabelDetails: `
		Please select the file you have just downloaded.
		You can drag-and-drop the file in the file chooser below.
	`,
	backupSuccessContent: `
		Excellent! You have just downloaded your account data. 
		You can use this file to restore your account on any other devices you may have.
		Make sure to keep the downloaded file in a safe place. :)
	`,
	backupSuccessHeader: 'backup complete!'
}, true)[1]
const MODULE_KEY = 'getting-started'
// read/write to module settings
const rw = value => storage.settings.module(MODULE_KEY, value) || {}
/**
 * @name	setActiveStep
 * @summary	get/set active step
 * 
 * @param	{Number} stepNo (optional) if not supplied will return saved active step
 * 
 * @returns {Number}
 */
export const setActiveStep = stepNo => isValidNumber(stepNo) ? rw({activeStep: stepNo}) : rw().activeStep || 0
// old localStorage key for active step 
const legacyKey = 'totem_getting-started-step-index'
try {
	// migrate to new location and remove legacy key
	if (localStorage.getItem(legacyKey) || (storage.settings.global(MODULE_KEY) || {}).activeStep) {
		localStorage.removeItem(legacyKey)
		storage.settings.global(MODULE_KEY, null)
		const activeStep = parseInt(localStorage.getItem(legacyKey) || storage.settings.global(MODULE_KEY).activeStep)
		setActiveStep(activeStep)
	}
} catch (e) { }

export default class GetingStarted extends Component {
	constructor(props) {
		super(props)

		this.registerStepIndex = 0
		this.backupStepIndex = 2
		const isRegistered = !!(getUser() || {}).id
		const activeStep = setActiveStep() 
		this.state = {
			activeStep: (isRegistered && activeStep < 1) ? 1 : activeStep,
			steps: [
				{
					description: texts.step2Description,
					onClick: this.handleRegister,
					title: texts.step2Title,
				},
				{
					description: texts.step1Description,
					onClick: this.handleIdentity,
					title: texts.step1Title,
				},
				{
					disabled: false, // allow the user to backup even after step is completed
					description: texts.backupDescription,
					onClick: this.handleBackup,
					title: texts.backupTitle,
				},
			],
		}
	}

	handleBackup = () => confirm({
		confirmButton: textsCap.backupNow,
		content: (
			<div>
				{texts.confirmBackupContent}
				<ul>
					{texts.confirmBackupTypes
						.split(',')
						.map((str, i) => <li key={i}>{str}</li>)
					}
				</ul>
			</div>
		),
		header: texts.backupTitle,
		size: 'tiny',
		onConfirm: () => {
			let { activeStep } = this.state
			this.setStep(++activeStep)
			confirmBackup()
			// assume backup completed?
			// only way to confirm backup is complete is to force user to upload the downloaded file)
		},
	})

	handleIdentity = () => {
		const values = getSelected()
		// forces user to enter a new name for the identity
		if (values.name === 'Default') values.name = ''
		showForm(IdentityForm, {
			values,
			// automatically open register form only if user isn't already registered
			onSubmit: ok => {
				if (!ok) return
				this.setStep(this.state.activeStep + 1)
			}
		})
	}

	handleRegister = () => showForm(RegistrationForm, {
		closeOnSubmit: true,
		onSubmit: ok => {
			if (!ok) return
			this.setStep(this.state.activeStep + 1)
			setToast({ content: texts.registrationSuccess, status: 'success' })
			this.requestFaucet()
		}
	})

	handleRestore = () => confirm({
		content: (
			<div>
				{texts.confirmRestoreContent}
				<ul>
					{texts.confirmBackupTypes.split(',').map((str, i) => <li key={i}>{str}</li>)}
				</ul>
			</div>
		),
		header: texts.confirmHeader,
		size: 'tiny',
		onConfirm: () => showForm(RestoreBackupForm, {
			onSubmit: done => done && this.setStep(this.backupStepIndex + 1)
		}),
	})

	requestFaucet = () => addToQueue({
		type: QUEUE_TYPES.CHATCLIENT,
		func: 'faucetRequest',
		title: texts.faucetRequest,
		description: texts.faucetRequestDetails,
		args: [getSelected().address]
	})

	setStep(nextStep) {
		const { id } = getUser() || {}
		if (nextStep === this.registerStepIndex && id) {
			// user Already registered => mark register step as done
			nextStep++
		}
		setActiveStep(nextStep)
		this.setState({ activeStep: nextStep })

		switch (nextStep) {
			case 0:
				this.handleRegister()
				break
			case 1:
				this.handleIdentity()
				break
			case 2: 
				this.handleBackup()
				break
		}
		return nextStep
	}

	render() {
		const { activeStep, steps } = this.state

		return (
			<div>
				<h3>{texts.quickGuideTitle}</h3>
				<p>{texts.quickGuidePara1}</p>
				<p>{texts.quickGuidePara2}</p>
				<p>{texts.quickGuidePara3}</p>
				<h4>{texts.stepsTitle}</h4>
				<div style={{ overflowX: 'auto' }}>
					<Step.Group fluid ordered>
						{steps.map(({ description, disabled, onClick, title }, index) => (
							<Step {...{
								active: activeStep === index,
								completed: activeStep > index,
								disabled: isDefined(disabled) ? disabled : activeStep !== index,
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
				{// activeStep <= this.registerStepIndex &&
					(
						<div style={styles.space}>
							<h3>{texts.restoreTitle}</h3>
							<Button {...{
								content: texts.restoreBtnTitle,
								onClick: this.handleRestore,
							}} />
						</div>
					)
				}

				{// Once user is registered display links to social applications and buttons to support and trollbox
					activeStep >= this.registerStepIndex && (
						<div style={styles.space}>
							<h3>{texts.supportChatHeader}</h3>
							<div>
								{texts.supportChatDesc1}
								<div>
									<Button {...{
										content: texts.supportContact,
										icon: 'heartbeat',
										onClick: () => createInbox([SUPPORT], null, true),
										size: 'mini',
										style: styles.btnStyle,
									}} />
									<Button {...{
										content: texts.trollbox,
										icon: 'globe',
										onClick: () => createInbox([TROLLBOX], null, true),
										size: 'mini',
										style: styles.btnStyle,
									}} />
									<Button {...{
										content: texts.newsletterSignup,
										icon: 'mail',
										onClick: () => showForm(NewsletteSignup),
										size: 'mini',
										style: styles.btnStyle,
									}} />
								</div>
							</div>
							{texts.supportChatDesc2}
							<div>
								<a href='https://discord.gg/Vx7qbgn' target='_blank'>
									<Invertible El={Icon} name='discord' style={styles.appIconStyle} />
								</a>
								<a href='https://t.me/totemchat' target='_blank'>
									<Invertible El={Icon} name='telegram' style={styles.appIconStyle} />
								</a>
							</div>
						</div>
					)}
			</div >
		)
	}
}

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


/*
 * confrim backup by forcing user to upload the file user just downloaded
 */
/**
 * 
 * @param	{Boolean}	showSuccess whether to show success message after backup has been confirmed
 */
export const confirmBackup = (showSuccess = false) => new PromisE(resolve => {
	const [content, fileBackupTS] = downloadBackup()
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
				const onClose = () => resolve(true) | closeModal(modalId)

				!showSuccess
					? onClose()
					: confirm({
						content: textsCap.backupSuccessContent,
						confirmButton: null,
						header: textsCap.backupSuccessHeader,
						onClose,
						size: 'tiny',
					})
			}
			reader.readAsText(file)
		} catch (err) {
			resolveValidate(err)
		}
	})
	
    const props = {
        header: textsCap.backupConfirmHeader,
        size: 'tiny',
        submitText: null,
		closeText: null,
		// in case user doesnt confirm download
		onClose: () => resolve(false),
        inputs: [{
            accept: '.json',
            label: textsCap.backupFileLabel,
            labelDetails: textsCap.backupFileLabelDetails,
            name: 'file',
            type: 'file',
            validate: validateFile,
        }],
    }
	
	modalId = showForm(FormBuilder, props)
})

window.confirmBackup = confirmBackup