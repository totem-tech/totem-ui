import React from 'react'
import {ReactiveComponent, If} from 'oo7-react'
import { runtimeUp } from 'oo7-substrate'
import { Card, Divider, Feed, Icon, Input } from 'semantic-ui-react'

class Chat extends ReactiveComponent {
  constructor(props) {
    super(props, {ensureRuntime: runtimeUp})
    this.state = {
      user: {
        id: 'Elliot',
        avatar: 'https://react.semantic-ui.com/images/avatar/small/elliot.jpg'
      },
      friend: {
        id: 'JohnDoe',
        avatar: 'https://react.semantic-ui.com/images/avatar/small/jenny.jpg'
      },
      draft: '',
      loading: false,
      messages: [
        {
          ts: new Date(),
          fromUser: 'Elliot',
          toUser: 'JohnDoe',
          text: 'Hi there!'
        },
        {
          ts: new Date(),
          fromUser: 'JohnDoe',
          toUser: 'Elliot',
          text: 'Hello'
        },
        {
          ts: new Date(),
          fromUser: 'Elliot',
          toUser: 'JohnDoe',
          text: 'How are you doing?'
        },
        {
          ts: new Date(),
          fromUser: 'JohnDoe',
          toUser: 'Elliot',
          text: 'I\'m doing great!'
        }
      ]
    }

    this.sendMessage = this.sendMessage.bind(this)
    this.handleInputChange = this.handleInputChange.bind(this)
  }

  sendMessage() {
    this.setState({ loading: true })
    const messages = [
      ...this.state.messages,
      {
        ts: new Date(),
        fromUser: this.state.user.id,
        toUser: this.state.friend.id,
        text: this.state.draft
      }
    ]
    const that = this
    setTimeout(function() {
      that.setState({ draft: '', loading: false, messages })

      setTimeout(function() {
        that.setState({
          messages: [
            ...that.state.messages,
            {
              ts: new Date(),
              fromUser: that.state.friend.id,
              toUser: that.state.user.id,
              text: 'This is a test reply!'
            }
          ]
        })
      }, 1000)
    }, 1000)
  }

  handleInputChange(e, data) {
    this.setState({ draft: data.value })
  }

  getMessages() {}

  render() {
    const feedEvents = this.state.messages.map((msg, i, arr) => (
      <React.Fragment key={i}>
        <Feed.Event>
          <Feed.Content style={{ marginTop: 0 }}>
            <Feed.Summary style={{ color: msg.fromUser === this.state.user.id ? 'red' : 'black' }}>
              {`@${msg.fromUser}: ${msg.text}`}
            </Feed.Summary>
          </Feed.Content>
        </Feed.Event>
        {i < arr.length - 1 && <Divider fitted />}
      </React.Fragment>
    ))

    return (
      <Card>
        <Card.Content>
          <Card.Header>
            <span>
              <Icon name="circle" color="green" size="small" />
              {this.props.title || 'Chat / Alert Messages'}
            </span>
          </Card.Header>
        </Card.Content>
        <Card.Content style={cardContentStyle}>
          <Feed id="chat-messages">
            {feedEvents}
          </Feed>
        </Card.Content>
        <Card.Content>
          <Input
            fluid
            action={{
              color: 'teal',
              icon: 'paper plane',
              loading: this.state.loading,
              onClick: this.sendMessage
            }}
            onChange={this.handleInputChange}
            value={this.state.draft}
            placeholder='enter text...'
            disabled={this.state.loading}
          />
        </Card.Content>
      </Card>
    )
  }
}

export default Chat

const cardContentStyle = {
  backgroundColor: 'rgba(241, 241, 241, 0.5)',
  maxHeight: 300,
  overflowY: 'auto'
}
