import React from 'react'
// const {Bond} = require('oo7');
import { ReactiveComponent } from 'oo7-react'
import {
  Widget,
  addResponseMessage,
  addLinkSnippet,
  addUserMessage,
  renderCustomComponent,
  dropMessages,
  isWidgetOpened,
  toggleInputDisabled
} from 'react-chat-widget';
import 'react-chat-widget/lib/styles.css';
import {getClient} from './ChatClient'

class ChatWidget extends ReactiveComponent {
  constructor() {
    super([]);
    this.state = {
      unreadCount: 1,
      widgetOpen: false,
      showOfflineMsg: true
    }

    this.handleNewUserMessage = this.handleNewUserMessage.bind(this)
    this.login = this.login.bind(this)
    this.setupChatClient = this.setupChatClient.bind(this)
  }

  componentDidMount() {
    addResponseMessage('So, you want to try Totem? Great! Just post your default address and I\'ll send you some funds - and then you can use it!')
    this.login()
  }

  setupChatClient() {
    this.client = getClient()
    this.client.onReconnect(this.login)
    
    // doesn't work
    // this.client.onDisconnect(() => {
    //   renderCustomComponent(EventEntry, {
    //     background: 'lightyellow',
    //     color: 'green',
    //     content: 'disconnected'
    //   })
    // })

    this.client.onMessage((msg, id) => id === this.state.userId ? addUserMessage(msg) : renderCustomComponent(
      MessageEntry,
      {message: msg, id}
    ))

    this.client.onConnectError(err => {
      console.log('Connection error: ', err)
      if (!this.state.showOfflineMsg) return;

      renderCustomComponent(EventEntry, {
        background: 'lightyellow',
        color: 'red',
        content: 'offline'
      })
      this.setState({showOfflineMsg: false})
    })
  }

  handleNewUserMessage(msg) {
    this.client.message(msg, (err)=> {
      err && renderCustomComponent(EventEntry, {
        background: 'lightyellow',
        color: 'red',
        content: (
          <div>
            Failed to send message:
            <pre style={{fontWeight: 'bold'}}>{msg}</pre>
            Message from server:
            <pre>{err}</pre>
          </div>
        )
      })
    })
    // dropMessages()
    return false
  }

  login() {
    !this.client && this.setupChatClient()
    const user = this.client.getUser()
    this.setState({userId: (user || {}).id})
    if (!user) return;

    this.client.login(user.id, user.secret, err => {
      renderCustomComponent(EventEntry, {
        background: 'lightyellow',
        color: err ? 'red' : 'green',
        content: !err ? 'online' : <div>Login failed: <pre>{err}</pre></div> 
      })
      !err && this.setState({showOfflineMsg: true})
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
      />
    )
  }
};

export default ChatWidget

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