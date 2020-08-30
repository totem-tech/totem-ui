import React, { Component } from 'react'
import { Button, Icon, Embed, Step } from 'semantic-ui-react'
import { isDefined } from '../utils/utils'
// services
import { getUser } from '../services/chatClient'
import { getSelected } from '../services/identity'
import { translated } from '../services/language'
import { confirm, showForm } from '../services/modal'
import { addToQueue, QUEUE_TYPES } from '../services/queue'
import storage, { downloadBackup } from '../services/storage'
import { setToast } from '../services/toast'
import { createInbox, SUPPORT, TROLLBOX } from '../modules/chat/chat'
// forms
import IdentityForm from '../forms/Identity'
import RegisterForm from '../forms/Register'
import RestoreBackupForm from '../forms/RestoreBackup'

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
	confirmBackupTypes: 'history, identities, notifications, partners, recent chat messages, settings',
	confirmHeader: 'Are you sure?',
	confirmRestoreContent: `
		You are about to replace application data with the JSON file. 
		This is potentially dangerous and you can lose your identity, chat User ID and other data.
	`,
	faucetRequest: 'Faucet request',
	faucetRequestDetails: 'Transaction allocations to get you started',
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
const MODULE_KEY = 'getting-started'
// read/write to module settings
const rw = value => storage.settings.module(MODULE_KEY, value) || {}
// old localStorage key for active step 
const legacyKey = 'totem_getting-started-step-index'
try {
	// migrate to new location and remove legacy key
	if (localStorage.getItem(legacyKey) || (storage.settings.global(MODULE_KEY) || {}).activeStep) {
		localStorage.removeItem(legacyKey)
		storage.settings.global(MODULE_KEY, null)
		const activeStep = parseInt(localStorage.getItem(legacyKey) || storage.settings.global(MODULE_KEY).activeStep)
		rw({ activeStep })
	}
} catch (e) { }

export default class GetingStarted extends Component {
	constructor(props) {
		super(props)

		this.registerStepIndex = 1
		this.backupStepIndex = 2
		const isRegistered = !!(getUser() || {}).id
		const { activeStep = 0 } = rw()
		this.state = {
			activeStep: (isRegistered && activeStep <= 1) ? 2 : activeStep,
			steps: [
				{
					description: texts.step1Description,
					onClick: this.handleIdentity,
					title: texts.step1Title,
				},
				{
					description: texts.step2Description,
					onClick: this.handleRegister,
					title: texts.step2Title,
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
		content: (
			<div>
				{texts.confirmBackupContent}
				<ul>
					{texts.confirmBackupTypes.split(',').map((str, i) => <li key={i}>{str}</li>)}
				</ul>
			</div>
		),
		header: texts.confirmHeader,
		size: 'tiny',
		onConfirm: () => {
			let { activeStep } = this.state
			this.setIndex(++activeStep)
			console.log({ activeStep, saved: rw().activeStep })
			setTimeout(() => downloadBackup())
			// assume backup completed?
			// only way to confirm backup is complete is to force user to upload the downloaded file)
		},
	})

	handleIdentity = () => showForm(IdentityForm, {
		values: getSelected(),
		// automatically open register form only if user isn't already registered
		onSubmit: ok => ok && this.setIndex(1) === this.registerStepIndex && this.handleRegister()
	})

	handleRegister = () => showForm(RegisterForm, {
		closeOnSubmit: true,
		onSubmit: ok => {
			if (!ok) return
			this.setIndex(this.state.activeStep + 1)
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
			onSubmit: done => done && this.setIndex(this.backupStepIndex + 1)
		}),
	})

	requestFaucet = () => addToQueue({
		type: QUEUE_TYPES.CHATCLIENT,
		func: 'faucetRequest',
		title: texts.faucetRequest,
		description: texts.faucetRequestDetails,
		args: [getSelected().address]
	})

	setIndex(stepIndex) {
		const { id } = getUser() || {}
		if (stepIndex === this.registerStepIndex && id) {
			// user Already registered => mark register step as done
			stepIndex++
		}
		rw({ activeStep: stepIndex })
		this.setState({ activeStep: stepIndex })
		return stepIndex
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
										// positive: true,
										size: 'mini',
										style: styles.btnStyle,
									}} />
									<Button {...{
										content: texts.trollbox,
										icon: 'globe',
										onClick: () => createInbox([TROLLBOX], null, true),
										// positive: true,
										size: 'mini',
										style: styles.btnStyle,
									}} />
								</div>
							</div>
							{texts.supportChatDesc2}
							<div>
								<a href='https://discord.gg/Vx7qbgn' target='_blank'>
									<Icon name='discord' style={styles.appIconStyle} />
								</a>
								<a href='https://t.me/totemchat' target='_blank'>
									<Icon name='telegram' style={styles.appIconStyle} />
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