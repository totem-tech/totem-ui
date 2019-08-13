import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import { Button, Step } from 'semantic-ui-react'
// import Register from '../forms/Register'
// import FormBuilder from '../components/FormBuilder'
// import { showForm, closeModal } from '../services/modal'
// import storageService from '../services/storage'

export default class GetingStarted extends ReactiveComponent {
    constructor() {
		super([])
		this.state = {}
		this.handleClick = this.handleClick.bind(this)
	}
	
	handleClick() {
		 alert("Hello there!");
	}

    render () {
		const { active } = this.state	
		return (
			<React.Fragment>
				<div>
				<h3>Here's a quick guide to getting started with Totem Live Accounting.</h3>
						<p>
						It's basically free for small businesses and personal use. Totem is private and secure, and easy to use.
						<br/>
						We want every small, medium and large business on the planet to use Totem. 	
						</p>
					<h4>There are 3 quick steps to get you started...</h4>
					<div>
					<Step.Group ordered>
 		<Step
		  active={true}
          link
          onClick={this.handleClick}
        //   title='Edit Account Name'
		  />
		  <Step.Content>
        <Step.Title>Edit Account Name</Step.Title>
		  <Step.Description>Choose a better account name. <br/>This name is only known to you.<br/>Change it at any time, in the wallet.'
		  </Step.Description>  
      </Step.Content>
    <Step disabled>
      <Step.Content>
        <Step.Title>Create chat user</Step.Title>
        <Step.Description>Chat is how you communicate with  <br/>other Totem users, and request  <br/>transaction funding.</Step.Description>
      </Step.Content>
    </Step>

    <Step disabled>
      <Step.Content>
        <Step.Title>Request transaction funding!</Step.Title>
		<Step.Description>As soon as your account has <br/> funds you can use Totem.</Step.Description>
      </Step.Content>
    </Step>
  </Step.Group>
  </div>
						<p>
							To use Totem, you need to spend transaction credits. We call them TTXs for short. Generally it will cost you 1 ttx per transaction - but don't worry, we are nice open source people, and we'll give you enough to get you started, because after all, we want you to use Totem!	
						</p>
						<p>
							Let's start by giving your default account a better name. You see that dropdown at the top right with the word "Default" in it? That needs changing. Click the button below to rename the account that was created for you. 
						</p>
						<h5>Rename your account:</h5>
							<Button size='small' style={styles.buttonColor} onClick={() => alert('TODO Rename account modal')}>Change the default account name</Button>
							{/* Put a button here which triggers a modal with one field containing the name of the wallet (usually default, but in case they come back to this screen again it should be the name of the currently selected wallet)*/
							}
			</div> 
			<div>
				<p>
					Great! You can change this account name at any time by using the actions drop down menu on the top right of your screen. Do you see it? It's right next to that new name you just entered a circle with an arrow.<br/>
					Whilst you are there, click on that great new name, and you will see the number of transactions you have (your TTX balance). Sadly you have none. So, let's fix that.
				</p>
				<h4>Nearly there! Two steps away from using Totem.</h4>
					{/* When the name change is executed, and the modal closes, now display the following:*/}		
				<p>
					The way you request funds is via a chatbox, but before you can use that you need to create a unique username.
				</p>
				<h5>Create a unique chat username:</h5>
					<Button size='small' style={styles.buttonColor} onClick={() => alert('TODO Create chatuser modal')}>Create unique chat username</Button>				
				<p>
				{/* Put a button here which triggers a modal to register the chat name.*/}
				</p>
				<h5>Request some transaction credits:</h5>
				<h5>Further essential steps:</h5>				
				<h5>Backup your account:</h5>
				<h5>What am I looking at? - Take the tour:</h5>				
				<p>
					{/*Video*/}
				</p>
			</div>
			<div>
					{/* 
					// Button "Request funds".

					// What happened? If you open the chat box you will see that a message that says that you requested some funds...
					*/}

             </div>
			</React.Fragment>   
        )
    }
}

const styles = {
    buttonColor: { 
        backgroundColor: '#2077B4', 
		color: 'white', 
		marginBottom: 30
        // fontWeight: 'bold', 
        // fontSize: '1em'
    }
}