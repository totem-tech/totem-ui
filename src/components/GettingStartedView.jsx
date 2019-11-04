import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import { Step } from 'semantic-ui-react'
import storage from '../services/storage'
import { showForm } from '../services/modal'
import { setToast } from '../services/toast'
import { addToQueue, QUEUE_TYPES } from '../services/queue'
import { WalletUpdate } from '../forms/Wallet'
import RegisterForm from '../forms/Register'

export default class GetingStarted extends ReactiveComponent {
	constructor() {
		super([])
		this.state = {
			activeIndex: storage.gettingStartedStepIndex()
		}
		this.handleIdentityChange = this.handleIdentityChange.bind(this)
		this.handleChatUserCreate = this.handleChatUserCreate.bind(this)
		this.handleFaucetRequest = this.handleFaucetRequest.bind(this)
	}

	handleIdentityChange() {
		showForm(WalletUpdate, {
			index: storage.walletIndex(),
			onSubmit: success => success && this.setIndex(1)
		})
	}

	handleChatUserCreate() {
		showForm(RegisterForm, {
			onSubmit: success => success && this.setIndex(2),
			onSuccessOpenChat: false
		})
	}

	handleFaucetRequest() {		
		this.faucetMsgId = setToast({content: 'Faucet request sent', status: 'loading'}, null, this.faucetMsgId)
		const address = secretStore()._keys[storage.walletIndex()].address
		
		addToQueue({
			type: QUEUE_TYPES.CHATCLIENT,
			func: 'faucetRequest',
			args: [
				address,
				(err, txHash) => {
						this.faucetMsgId = setToast({
						content: err || `Faucet transfer complete. Transaction hash: ${txHash}`,
						status: !!err ? 'error' : 'success'
					}, null, this.faucetMsgId)
					!err && this.setIndex(999)
				},
			]
		}, null, this.faucetMsgId)
	}

	setIndex(index) {
		storage.gettingStartedStepIndex(index)
		setTimeout(()=> this.setState({activeIndex: index}))
	}

	render() {
		let { activeIndex } = this.state
		// Skip step 2 if user is already registered
		if (activeIndex === 1 && !!(storage.chatUser() || {}).id) {
			activeIndex = 2
		}
		return (
			<React.Fragment>
				<div>
					<h3>A quick guide to getting started with Totem Live Accounting.</h3>
					<p>
						It's currently under heavy development, but you can already use the Identities, Partners, Project and Timekeeping Modules as well as make basic transactions using the Payments Module.
					</p>
					<p>
						To use Totem, you need to spend transaction credits. We call them XTX for short. Generally it will cost you 1 XTX per activity - but don't worry, we are nice open source people, and we'll give you thousands! (Enough to get you started, because after all, we want you to use Totem!)
					</p>
					<h4>Only 3 short steps to begin. Let's go!</h4>
					<div style={{overflowX: 'auto'}}>
						<Step.Group ordered>
							<Step
								active={activeIndex === 0}
								completed={activeIndex > 0}
								disabled={activeIndex !== 0}
								onClick={this.handleIdentityChange}>
								<Step.Content>
									<Step.Title>Edit Default Identity</Step.Title>
									<Step.Description>This Identities are only known to you.<br />You can create as many as you like in <br />the Identities Module.</Step.Description>
								</Step.Content>
							</Step>

							<Step
								active={activeIndex === 1}
								completed={activeIndex > 1}
								disabled={activeIndex !== 1}
								onClick={this.handleChatUserCreate}>
								<Step.Content>
									<Step.Title>Create Chat User ID</Step.Title>
									<Step.Description>Chat is how you communicate with <br />other Totem users. Choose a unique <br />name (preferably not your own name!)</Step.Description>
								</Step.Content>
							</Step>

							<Step
								active={activeIndex === 2}
								completed={activeIndex > 2}
								disabled={activeIndex !== 2}
								onClick={this.handleFaucetRequest}>
								<Step.Content>
									<Step.Title>Request XTX</Step.Title>
									<Step.Description>To make transactions, you need to spend  <br />XTX transactions! Get some XTX from  <br />our faucet by clicking here!</Step.Description>
								</Step.Content>
							</Step>
						</Step.Group>
					</div>
					<h3>Further essential steps:</h3>
					<h5>What am I looking at? Watch the video:</h5>
					<p>
						{/*Video*/}
					</p>
					<h5>Backup your account. Watch the video:</h5>
				</div>
			</React.Fragment>
		)
	}
}