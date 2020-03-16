import React, { Component } from 'react'
import { Step, Embed } from 'semantic-ui-react'
// services
import { getUser } from '../services/chatClient'
import identityService, { getSelected } from '../services/identity'
import { translated } from '../services/language'
import { showForm } from '../services/modal'
import { addToQueue, QUEUE_TYPES } from '../services/queue'
import storage from '../services/storage'
import { setToast } from '../services/toast'
// forms
import RegisterForm from '../forms/Register'
import IdentityForm from '../forms/Identity'

const [texts] = translated({
	faucetRequest: 'Faucet request',
	faucetRequestDetails: 'Transaction allocations to get you started',
	registrationSuccess: 'Registration successful! You will shortly receive an allocation of transactions to get you started.',
	quickGuidePara1: `Totem is currently under heavy development, but you can already use the Identities, Partners, Activities 
		and Timekeeping Modules as well as make basic transfers of your transaction allocations balance using the Transfer Module.`,
	quickGuidePara2: `Most of what you do in Totem will consume transactions from your balance (XTX for short) but don't worry, 
		we are nice open source people, and we'll give you plenty to get you started.`,
	quickGuidePara3: 'If you use up your balance - no problemo! Simply request some more from our automated faucet.',
	quickGuideTitle: 'A quick guide to getting started with Totem Live Accounting.',
	step1Description: `Identities are only known to you. You can create as many as you like in the Identities Module.`,
	step1Title: 'Edit Default Identity',
	stepsTitle: `Only 2 short steps to begin. Let's go!`,
	step2Description: `Chat is how you communicate with other Totem users. Choose a unique name (preferably not your own name!)`,
	step2Title: 'Create Chat User ID',
	videoGuidTitle: 'Further essential steps:',
	video1Title: 'What am I looking at? Watch the video:',
	video2Title: 'Backup your account. Watch the video:',
})

const MODULE_KEY = 'getting-started'
export default class GetingStarted extends Component {
	constructor(props) {
		super(props)
		this.state = {
			activeStep: storage.settings.global(MODULE_KEY).activeStep || 0
		}
		this.registerStepIndex = 1
		this.completedIndex = 999
	}

	handleIdentity = () => showForm(IdentityForm, {
		values: getSelected(),
		onSubmit: success => success && this.setIndex(1) | this.handleRegister()
	})

	handleRegister = () => showForm(RegisterForm, {
		onSubmit: ok => {
			if (!ok) return
			this.setIndex(this.state.activeStep + 1)
			setToast({ content: texts.registrationSuccess, status: 'success' })
			this.requestFaucet()
		}
	})

	requestFaucet = () => addToQueue({
		type: QUEUE_TYPES.CHATCLIENT,
		func: 'faucetRequest',
		title: texts.faucetRequest,
		description: texts.faucetRequestDetails,
		args: [getSelected().address]
	})

	setIndex(activeStep) {
		if (activeStep === this.registerStepIndex && !!(getUser() || {}).id) {
			// user Already registered
			activeStep++
		}
		storage.settings.global(MODULE_KEY, { activeStep })
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