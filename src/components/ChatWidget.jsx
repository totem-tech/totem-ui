import React from 'react'
// const {Bond} = require('oo7')
import { ReactiveComponent } from 'oo7-react'
import {
  Widget,
  // addResponseMessage,
  // addLinkSnippet,
  addUserMessage,
  renderCustomComponent,
  // dropMessages,
  isWidgetOpened,
  // toggleInputDisabled,
  toggleMsgLoader
} from 'react-chat-widget'
import 'react-chat-widget/lib/styles.css'
import { addToHistory, getClient, getUser, getHistory } from './ChatClient'

const eventTypes = [
  'red',   // error
  'green', // success
  'yellow' // warning
]

const addEventMsg = (messageContent, type) => renderCustomComponent(EventEntry, {
  background: 'lightyellow',
  color: eventTypes[type || 0],
  content: messageContent
})

const addResponseWithId = (message, id) => renderCustomComponent( MessageEntry, {message, id})

const EventEntry = (props) => (
  <div style={{
    width: props.width || 'auto',
    background: props.background,
    color: props.color,
    fontStyle: 'italic',
    margin: 'auto',
    padding: '0px 20px',
    borderRadius: '25px 0px'
  }}>
    {props.content}
  </div>
)

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
      !isWidgetOpened() && this.setState({unreadCount: this.state.unreadCount++})
    })

    this.client.onConnectError(err => {
      // Prevents showing 'offline' more than once until status changes back to online
      if (!this.state.showOfflineMsg) return;

      addEventMsg('offline')
      this.setState({showOfflineMsg: false})
    })
  }

  handleNewUserMessage(msg) {
    this.client.message(msg, err => err ? addEventMsg(err) : addToHistory(msg, this.state.userId))
  }

  login() {
    const user = getUser()
    if (!user) return addEventMsg('Please choose an ID to start chat.');
    

    this.client.login(user.id, user.secret, err => {
      if (err) {
        return addEventMsg(<div>Login failed: <pre>{err}</pre></div>)
      }
      if (!this.state.historyAdded) {
        getHistory().forEach(e => {
          e.id === user.id ? addUserMessage(e.message) : addResponseWithId(e.message, e.id)
        })
      }

      addEventMsg('online', 1)
      this.setState({userId: user.id, showOfflineMsg: true, historyAdded: true})
    })
  }

  render () {
    return (
      <Widget
        xtitleAvatar="https://react.semantic-ui.com/images/wireframe/image.png"
        title="Totem Messaging"
        subtitle="Welcome on board."
        senderPlaceHolder={"Let's go Toto..."}
        handleNewUserMessage={this.handleNewUserMessage}
        badge={this.state.unreadCount}
        autofocus={true}
      />
    )
  }
}
export default ChatWidget

