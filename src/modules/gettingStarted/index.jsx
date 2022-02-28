import React from 'react'
import { BehaviorSubject } from 'rxjs'
import { Button, Icon, Step } from 'semantic-ui-react'
import { translated } from '../../utils/languageHelper'
import storage from '../../utils/storageHelper'
import { useRxSubject } from '../../utils/reactHelper'
import { isFn, isValidNumber } from '../../utils/utils'
// forms and components
import Invertible from '../../components/Invertible'
import RestoreBackupForm from './RestoreBackupForm'
// services
import { showForm } from '../../services/modal'
// import { addToQueue, QUEUE_TYPES } from '../services/queue'
import { setToast } from '../../services/toast'
import { setActive } from '../../services/sidebar'
// modules
import { createInbox, SUPPORT, TROLLBOX } from '../chat/chat'
import { getUser, rxIsRegistered } from '../chat/ChatClient'
import RegistrationForm from '../chat/RegistrationForm'
import { getSelected } from '../identity/identity'
import IdentityForm from '../identity/IdentityForm'
import BackupForm from './BackupForm'
import { MOBILE, rxLayout } from '../../services/window'


window.backup = () => showForm(BackupForm)
const texts = translated({
	backupTitle: 'Backup your account',
	backupDescription: `
		Creating a backup will help you make sure that you do not lose your account. 
		Additionally, you will also be able to restore your account on another device.
	`,
	// keep the commas. they will be used to generate an unordered list
	confirmBackupTypes: 'history, identities, locations, notifications, partners, recent chat messages, settings, user credentials',
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
	restoreTitle: 'Got a backup of an existing account?',
	restoreBtnTitle: 'Restore backup',
	step1Description: 'Identities are only known to you. You can create as many as you like in the Identities Module.',
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
	// videoGuidTitle: 'Further essential steps:',
	// video1Title: 'What am I looking at? Watch the video:',
	// video2Title: 'Backup your account. Watch the video:',
})[0]

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
	const [isMobile] = useRxSubject(rxLayout, l => l === MOBILE)
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
					fluid: isMobile,
					onClick: () => showForm(RestoreBackupForm),
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
								fluid: isMobile,
								icon: 'heartbeat',
								onClick: () => createInbox([SUPPORT], null, true),
								size: isMobile
									? undefined
									: 'mini',
								style: styles.btnStyle,
							},
							isRegistered && {
								content: texts.trollbox,
								fluid: isMobile,
								icon: 'globe',
								onClick: () => createInbox([TROLLBOX], null, true),
								size: isMobile
									? undefined
									: 'mini',
								style: styles.btnStyle,
							},
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

const handleBackup = (redirectTo) => showForm(
	BackupForm,
	{
		onSubmit: done => done && incrementStep(),
		values: { redirectTo },
	},
)

const handleUpdateIdentity = (redirectTo) => {
	const values = getSelected()
	// forces user to enter a new name for the identity
	if (values.name === 'Default') values.name = ''
	showForm(IdentityForm, {
		onClose: ()=> incrementStep(redirectTo),
		onSubmit: ()=> incrementStep(redirectTo),
		values: {
			...values,
			redirectTo: values.redirectTo || redirectTo,
		},
	})
}

const handleRegister = (redirectTo) => showForm(
	RegistrationForm,
	{
		closeOnSubmit: true,
		silent: false,
		onSubmit: ok => {
			if (!ok) return
			setToast({
				content: texts.registrationSuccess,
				status: 'success',
			})

			// open rewards module
			setActive('rewards')
		},
		values: { redirectTo }
	},
)

const incrementStep = (redirectTo) => setActiveStep(
	(rxActiveStep.value || 0) + 1,
	!redirectTo, 
	redirectTo,
)

export const setActiveStep = (nextStep = rxActiveStep.value, silent = false, redirectTo) => {
	const user = getUser()
	if (nextStep === registerStepIndex && user && user.id) {
		// user Already registered => mark register step as done
		nextStep++
	}
	saveActiveStep(nextStep)

	if (silent) return nextStep

	switch (nextStep) {
		case 0:
			handleRegister(redirectTo)
			break
		case 1:
			handleUpdateIdentity(redirectTo)
			break
		case 2:
			handleBackup(redirectTo)
			break
	}
	return nextStep
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