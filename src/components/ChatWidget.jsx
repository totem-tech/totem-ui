import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import { Button, Icon } from 'semantic-ui-react'
import {
	Widget,
	// addResponseMessage,
	// addLinkSnippet,
	addUserMessage,
	renderCustomComponent,
	// dropMessages,
	// isWidgetOpened,
	// toggleInputDisabled,
	// toggleMsgLoader
} from 'react-chat-widget'
import 'react-chat-widget/lib/styles.css'
import { addToHistory, getClient, getUser, getHistory, getHistoryLimit, onLogin } from '../services/ChatClient'
import { copyToClipboard, objCopy } from '../utils/utils'
import { getNow } from '../utils/time'
import TotemLogoCircle from '../assets/totem-button-grey.png';
import Register from '../forms/Register'
import { showForm } from '../services/modal'

const historyLimit = getHistoryLimit()
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
	<div style={objCopy(
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
const addResponseWithId = (message, id) => renderCustomComponent(MessageEntry, { message, id })
const MessageEntry = (props) => (
	<div>
		<span style={{ fontStyle: 'italic', color: 'gray' }}>
			@{props.id}
		</span>
		<div className="rcw-response">
			{props.message}
		</div>
	</div>
)

class ChatWidget extends ReactiveComponent {
	constructor() {
		super([])
		this.state = {
			unreadCount: 1,
			widgetOpen: false,
			showOfflineMsg: true,
			historyAdded: false,
			userId: ''
		}

		this.handleNewUserMessage = this.handleNewUserMessage.bind(this)
		this.login = this.login.bind(this)
		this.setupChatClient = this.setupChatClient.bind(this)

		onLogin(userId => this.setState({ userId }))
	}

	componentDidMount() {
		// Setup chat client 
		!this.client && this.setupChatClient()
		// attempt to login
		this.login()
	}

	setupChatClient() {
		this.client = getClient()

		// Attempt to log back in on reconnect
		this.client.onReconnect(this.login)

		this.client.onMessage((msg, id) => {
			id === this.state.userId ? addUserMessage(msg) : addResponseWithId(msg, id)
			addToHistory(msg, id)
			// !isWidgetOpened() && this.setState({unreadCount: this.state.unreadCount++})
		})

		this.client.onConnectError(err => {
			// Prevents showing 'offline' more than once until status changes back to online
			if (!this.state.showOfflineMsg) return;

			// addEventMsg('chat server offline at : ' + getNow())
			this.setState({ showOfflineMsg: false })
		})

	}

	handleNewUserMessage(msg) {
		this.client.message(msg, err => err ? addEventMsg(err) : addToHistory(msg, this.state.userId))
	}

	login() {
		const user = getUser()
		if (!user) return;

		this.client.login(user.id, user.secret, err => {
			if (err) return addEventMsg(<div>Login failed: <pre>{err}</pre></div>);
			if (!this.state.historyAdded) {
				getHistory().forEach(e => {
					e.id === user.id ? addUserMessage(e.message) : addResponseWithId(e.message, e.id)
				})
			}

			// addEventMsg('chat server online at : ' + getNow(), 1)
			this.setState({ userId: user.id, showOfflineMsg: true, historyAdded: true })
		})
	}

	render() {
		const { userId } = this.state
		return !userId ? '' : (
			<Widget
				titleAvatar={TotemLogoCircle}
				title="totem trollbox"
				subtitle={userId ? <h5>Logged in as {'@' + userId}</h5> : ''}
				senderPlaceHolder={"Say something nice..."}
				handleNewUserMessage={this.handleNewUserMessage}
				xbadge={this.state.unreadCount}
				autofocus={true}
			/>
		)
	}
}
export default ChatWidget

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