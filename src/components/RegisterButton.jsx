import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import { Button } from 'semantic-ui-react'
// import {
// 	Widget,
// 	// addResponseMessage,
// 	// addLinkSnippet,
// 	addUserMessage,
// 	renderCustomComponent,
// 	// dropMessages,
// 	// isWidgetOpened,
// 	// toggleInputDisabled,
// 	// toggleMsgLoader
// } from 'react-chat-widget'
// import 'react-chat-widget/lib/styles.css'
import { getUser onLogin } from '../services/ChatClient'
import { objCopy } from '../utils/utils'
// import TotemLogoCircle from '../assets/totem-button-grey.png';
import Register from '../forms/Register'

// const historyLimit = getHistoryLimit()
const eventTypes = [
	'red',    // error
	'green',  // success
	'yellow', // warning
	'black'   // normal text
]

// Show error, waring, connection status etc
const addEventMsg = (messageContent, type) => renderCustomComponent(EventEntry, {
	// background: 'lightyellow',
	color: eventTypes[type || 0],
	content: messageContent
})

const EventEntry = (props) => (
	<div style={ objCopy(
		styles.eventEntry, 
		{
			width: props.width || '100%',
			background: props.background,
			color: props.color
		}
	)}>
		{props.content}
	</div>
)

// Message sent by other users
const addResponseWithId = (message, id) => renderCustomComponent( MessageEntry, {message, id})
const MessageEntry = (props) => (
	<div>
		<span style={{ fontStyle:'italic', color: 'gray'}}>
			@{props.id}
		</span>
		<div className="rcw-response">
			{props.message}
		</div>
	</div>
)


class RegisterStep extends ReactiveComponent {
	constructor() {
		super([])
		this.state = {
			// unreadCount: 1,
			// widgetOpen: false,
			// showOfflineMsg: true,
			// historyAdded: false,
			userId: ''
		}

		// this.handleNewUserMessage = this.handleNewUserMessage.bind(this)
		this.login = this.login.bind(this)
		// this.setupChatClient = this.setupChatClient.bind(this)
		// this.addFaucetEntry = this.addFaucetEntry.bind(this)

		onLogin( userId => this.setState({userId}))
	}

	componentDidMount() {
		// Setup chat client 
		// !this.client && this.setupChatClient()
		// attempt to login
		this.login()
	}

	// setupChatClient() {
	// 	this.client = getClient()

	// 	// Attempt to log back in on reconnect
	// 	this.client.onReconnect(this.login)

	// 	this.client.onMessage((msg, id) => {
	// 		id === this.state.userId ? addUserMessage(msg) : addResponseWithId(msg, id)
	// 		addToHistory(msg, id)
	// 		// !isWidgetOpened() && this.setState({unreadCount: this.state.unreadCount++})
	// 	})

	// 	this.client.onConnectError(err => {
	// 		// Prevents showing 'offline' more than once until status changes back to online
	// 		if (!this.state.showOfflineMsg) return;

	// 		addEventMsg('chat server offline at : ' + getNow())
	// 		this.setState({showOfflineMsg: false})
	// 	})

	// 	this.client.onFaucetRequest(this.addFaucetEntry)
	// }

	// addFaucetEntry(userId, address) {
	// 	const fromMe = userId === this.state.userId
	// 	const addArr = address.split('')
	// 	const addressShort = addArr.slice(0, 4).join('') + '...' + addArr.slice(addArr.length - 4, addArr.length).join('') + ' '
	// 	const content = (
	// 		<div>
	// 			<h4 style={styles.faucetRequestTitle}>
	// 				{fromMe ? 'You made a request for funds' : 'Funds requested for @' + userId}
	// 			</h4>
	// 			<div>Address: {addressShort}
	// 				<Icon
	// 					link
	// 					title="Copy address"
	// 					name="copy outline"
	// 					onClick={() => copyToClipboard(address)}
	// 				/>
	// 			</div>
	// 		</div>
	// 	)

	// 	const props = {
	// 		background: fromMe ? 'grey' : '#f4f7f9',
	// 		color: fromMe ? 'white' : 'black',
	// 		content
	// 	}
	// 	renderCustomComponent(EventEntry, props)
	// }

	// handleNewUserMessage(msg) {
	// 	this.client.message(msg, err => err ? addEventMsg(err) : addToHistory(msg, this.state.userId))
	// }

	login() {
		const user = getUser()
		if (!user) return;

		this.client.login(user.id, user.secret, err => {
			if (err) return addEventMsg(<div>Login failed: <pre>{err}</pre></div>);
			// if (!this.state.historyAdded) {
			// 	getHistory().forEach(e => {
			// 		e.id === user.id ? addUserMessage(e.message) : addResponseWithId(e.message, e.id)
			// 	})
			// }

			// addEventMsg('chat server online at : ' + getNow(), 1)
			this.setState({userId: user.id})
		})
	}

	render () {
		const { userId } = this.state
		const subtitle = (
			<div>
				{userId ? <h5>Logged in as {'@' + userId}</h5> : (
					<Register
						modal={true}
						trigger={<Button as="a" basic inverted size="tiny" content="Register chat user id" />}
					/>
				)}
				{/* <p>Your chat history is not saved on the server. Up to {historyLimit} messages are saved locally.</p> */}
			</div>
		)
		return (
            // This is where we process the handler
            
            // <Widget
			// 	titleAvatar={TotemLogoCircle}
			// 	title="Totem live chat"
			// 	subtitle={subtitle}
			// 	senderPlaceHolder={"Let's chat totem..."}
			// 	handleNewUserMessage={this.handleNewUserMessage}
			// 	// badge={this.state.unreadCount}
			// 	autofocus={true}
			// />
		)
	}
}
export default RegisterStep

const styles = {
	eventEntry: {
		textAlign: 'center',
		fontStyle: 'light',
		margin: 'auto',
		padding: '5px 0px 5px 0px',
		borderRadius: '5px 5px',
		textSize: '0.75rem'
	},
	faucetRequestTitle: {
		margin: 0
	}
}