import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import { Step } from 'semantic-ui-react'
export default class GetingStarted extends ReactiveComponent {
	constructor() {
		super([])
		this.state = {}
		this.handleIdentityChange = this.handleIdentityChange.bind(this)
		this.handleChatUserCreate = this.handleChatUserCreate.bind(this)
		this.handleFaucetRequest = this.handleFaucetRequest.bind(this)
	}

	handleIdentityChange() {
		alert("To be implemented");
	}

	handleChatUserCreate() {
		alert("To be implemented");
	}

	handleFaucetRequest() {
		alert("To be implemented");
	}

	render() {
		const { active } = this.state
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
					<div>
						<Step.Group ordered>
							<Step
								completed
								disabled
								onClick={this.handleIdentityChange}>
								<Step.Content>
									<Step.Title>Edit Default Identity</Step.Title>
									<Step.Description>This Identities are only known to you.<br />You can create as many as you like in <br />the Identities Module.</Step.Description>
								</Step.Content>
							</Step>
							<Step
								active
								onClick={this.handleChatUserCreate}>
								<Step.Content>
									<Step.Title>Create Chat User ID</Step.Title>
									<Step.Description>Chat is how you communicate with <br />other Totem users. Choose a unique <br />name (preferably not your own name!)</Step.Description>
								</Step.Content>
							</Step>

							<Step
								disabled
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