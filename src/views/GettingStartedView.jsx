import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import { Step, Embed } from 'semantic-ui-react'
import storage from '../services/storage'
import { showForm } from '../services/modal'
import { setToast } from '../services/toast'
import { addToQueue, QUEUE_TYPES } from '../services/queue'
import identityService from '../services/identity'
import RegisterForm from '../forms/Register'
import IdentityForm from '../forms/Identity'
// import { textCapitalize } from '../utils/utils'

// const words = {}
// const wordsCap = textCapitalize(words)
const texts = {
	faucetRequestSent: 'Registration successful! A faucet request has been sent to get you started.',
	faucetTransferComplete: 'Faucet transfer complete.',
	quickGuidePara1: `Totem is currently under heavy development, but you can already use the Identities, Partners, Project 
		and Timekeeping Modules as well as make basic transfers of your transaction allocations using the Transfer Module.`,
	quickGuidePara2: `Most of what you do in Totem will consume transaction allocations (XTX for short) but don't worry, 
		we are nice open source people, and we'll give you plenty to get you started.`,
	quickGuidePara3: 'If you use them up - no problem! Simply request some more from our automated faucet.',
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

export default class GetingStarted extends ReactiveComponent {
	constructor() {
		super([])
		this.state = {
			activeIndex: storage.gettingStartedStepIndex()
		}
		this.handleIdentity = this.handleIdentity.bind(this)
		this.handleRegister = this.handleRegister.bind(this)
		this.requestFaucet = this.requestFaucet.bind(this)
	}

	handleIdentity() {
		showForm(IdentityForm, {
			values: identityService.getSelected(),
			onSubmit: success => success && this.setIndex(1)
		})
	}

	handleRegister() {
		showForm(RegisterForm, { onSubmit: ok => ok && this.setIndex(999) | this.requestFaucet() })
	}

	requestFaucet() {
		this.faucetMsgId = setToast({ content: texts.faucetRequestSent, status: 'success' }, 10000, this.faucetMsgId)
		const { address } = identityService.getSelected()

		addToQueue({
			type: QUEUE_TYPES.CHATCLIENT,
			func: 'faucetRequest',
			args: [
				address,
				(err, txHash) => {
					!err && this.setIndex(999)
					setToast({
						content: err || texts.faucetTransferComplete,
						status: !!err ? 'error' : 'success'
					}, 5000, this.faucetMsgId)
				},
			]
		}, null, this.faucetMsgId)
	}

	setIndex(index) {
		storage.gettingStartedStepIndex(index)
		setTimeout(() => this.setState({ activeIndex: index }))
	}

	render() {
		const { activeIndex } = this.state
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
								active={activeIndex === 0}
								completed={activeIndex > 0}
								disabled={activeIndex !== 0}
								onClick={this.handleIdentity}>
								<Step.Content>
									<Step.Title>{texts.step1Title}</Step.Title>
									<Step.Description style={styles.stepDescription}>
										{texts.step1Description}
									</Step.Description>
								</Step.Content>
							</Step>

							<Step
								active={activeIndex === 1}
								completed={activeIndex > 1}
								disabled={activeIndex !== 1}
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

					<h3>{texts.videoGuidTitle}</h3>
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
					</div>
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