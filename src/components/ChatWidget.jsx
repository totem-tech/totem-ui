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

// For todays date;
Date.prototype.today = function () { 
  return ((this.getDate() < 10)?"0":"") + this.getDate() +"/"+(((this.getMonth()+1) < 10)?"0":"") + (this.getMonth()+1) +"/"+ this.getFullYear();
}

// For the time now
Date.prototype.timeNow = function () {
   return ((this.getHours() < 10)?"0":"") + this.getHours() +":"+ ((this.getMinutes() < 10)?"0":"") + this.getMinutes() +":"+ ((this.getSeconds() < 10)?"0":"") + this.getSeconds();
}

function getNow() {
  var datetime = new Date().today() + " @ " + new Date().timeNow();
  return datetime;
}

const eventTypes = [
  'red',   // error
  'green', // success
  'yellow' // warning
]

const addEventMsg = (messageContent, type) => renderCustomComponent(EventEntry, {
  // background: 'lightyellow',
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
    borderRadius: '1px 0px'
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

      addEventMsg('chat server offline at : ' + getNow())
      this.setState({showOfflineMsg: false})
    })
  }

  handleNewUserMessage(msg) {
    this.client.message(msg, err => err ? addEventMsg(err) : addToHistory(msg, this.state.userId))
  }

  login() {
    const user = getUser()
    if (!user) return addEventMsg('Please choose a unique ID.');
    

    this.client.login(user.id, user.secret, err => {
      if (err) {
        return addEventMsg(<div>Login failed: <pre>{err}</pre></div>)
      }
      if (!this.state.historyAdded) {
        getHistory().forEach(e => {
          e.id === user.id ? addUserMessage(e.message) : addResponseWithId(e.message, e.id)
        })
      }

      addEventMsg('chat server online at : ' + getNow(), 1)
      this.setState({userId: user.id, showOfflineMsg: true, historyAdded: true})
    })
  }

  render () {
    return (
      <Widget
        xtitleAvatar="/assets/totem-logo-white-inner.png"
        title="Totem Chatter"
        subtitle="Your chat history is not saved on the server, up to 100 messages are saved locally."
        senderPlaceHolder={"Let's go Toto..."}
        handleNewUserMessage={this.handleNewUserMessage}
        xbadge={this.state.unreadCount}
        autofocus={true}
      />
    )
  }
}
export default ChatWidget

