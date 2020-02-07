import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import { Step, Embed } from 'semantic-ui-react'
// services
import { getUser } from '../services/chatClient'
import identityService from '../services/identity'
import { showForm } from '../services/modal'
import { addToQueue, QUEUE_TYPES } from '../services/queue'
import storage from '../services/storage'
import { setToast } from '../services/toast'
// forms
import RegisterForm from '../forms/Register'
import IdentityForm from '../forms/Identity'

// const words = {}
// const wordsCap = textCapitalize(words)
const texts = {
	faucetRequestSent: 'Registration successful! You will shortly receive an allocation of transactions get you started.',
	faucetTransferComplete: 'Allocation complete.',
	quickGuidePara1: `Totem is currently under heavy development, but you can already use the Identities, Partners, Project 
		and Timekeeping Modules as well as make basic transfers of your transaction allocations balance using the Transfer Module.`,
	quickGuidePara2: `Most of what you do in Totem will consume transactions from your balance (XTX for short) but don't worry, 
		we are nice open source people, and we'll give you plenty to get you started.`,
	quickGuidePara3: 'If you use up your balance - no problemo! Simply request some more from our automated faucet.',
	quickGuideTitle: 'A quick guide to getting started with Totem Live Accounting.',
	step1Description: `This Identities are only known to you. You can create as many as you like in the Identities Module.`,
	step1Title: 'Edit Default Identity',
	stepsTitle: `Only 2 short steps to begin. Let's go!`,
	step2Description: `Chat is how you communicate with other Totem users. Choose a unique name (preferably not your own name!)`,
	step2Title: 'Create Chat User ID',
	videoGuidTitle: 'Further essential steps:',
	video1Title: 'What am I looking at? Watch the video:',
	video2Title: 'Backup your account. Watch the video:',
}

const moduleKey = 'getting-started'
export default class GetingStarted extends ReactiveComponent {
	constructor() {
		super([])
		this.state = {
			activeStep: storage.settings.global(moduleKey).activeStep || 0
		}
		this.registerStepIndex = 1
		this.completedIndex = 999
	}

	handleIdentity = () => showForm(IdentityForm, {
		values: identityService.getSelected(),
		onSubmit: success => success && this.setIndex(1)
	})

	handleRegister = () => showForm(RegisterForm, {
		onSubmit: ok => ok && this.setIndex(this.completedIndex) | this.requestFaucet()
	})

	requestFaucet() {
		this.faucetMsgId = setToast({ content: texts.faucetRequestSent, status: 'success' }, 10000, this.faucetMsgId)
		const { address } = identityService.getSelected()

		addToQueue({
			type: QUEUE_TYPES.CHATCLIENT,
			func: 'faucetRequest',
			args: [
				address,
				(err, txHash) => setToast({
					content: err || texts.faucetTransferComplete,
					status: !!err ? 'error' : 'success'
				}, 5000, this.faucetMsgId),
			]
		}, null, this.faucetMsgId)
	}

	setIndex(activeStep) {
		if (activeStep === this.registerStepIndex && !!(getUser() || {}).id) {
			// user Already registered
			activeStep = this.completedIndex
		}
		storage.settings.global(moduleKey, { activeStep })
		this.setState({ activeStep })
	}

	render() {
		const { activeStep } = this.state
		return (
			<React.Fragment>
				<div>
					<h3>{texts.quickGuideTitle}</h3>
					<p>{texts.quickGuidePara1}</p>
					<p>{texts.quickGuidePara2}</p>
					<p>{texts.quickGuidePara3}</p>
					<h4>{texts.stepsTitle}</h4>
					<div style={{ overflowX: 'auto' }}>
						<Step.Group fluid ordered>
							<Step
								active={activeStep === 0}
								completed={activeStep > 0}
								disabled={activeStep !== 0}
								onClick={this.handleIdentity}>
								<Step.Content>
									<Step.Title>{texts.step1Title}</Step.Title>
									<Step.Description style={styles.stepDescription}>
										{texts.step1Description}
									</Step.Description>
								</Step.Content>
							</Step>

							<Step
								active={activeStep === 1}
								completed={activeStep > 1}
								disabled={activeStep !== 1}
								onClick={this.handleRegister}>
								<Step.Content>
									<Step.Title>{texts.step2Title}</Step.Title>
									<Step.Description style={styles.stepDescription}>
										{texts.step2Description}
									</Step.Description>
								</Step.Content>
							</Step>
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
				</div>
			</React.Fragment>
		)
	}
}

const styles = {
	stepDescription: {
		maxWidth: 215,
	},
	videoContainer: {
		height: 225,
		width: 400,
		maxWidth: '100%'
	},
}