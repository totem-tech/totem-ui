import React from 'react'
// const {Bond} = require('oo7');
import { ReactiveComponent } from 'oo7-react'
import {Widget, addResponseMessage, addLinkSnippet, addUserMessage} from 'react-chat-widget';
import 'react-chat-widget/lib/styles.css';


class ChatWidget extends ReactiveComponent {
  constructor() {
    super([]);
  }

  componentDidMount() {
    addResponseMessage('So, you want to try Totem? Great! Just post your default address and I\'ll send you some funds - and then you can use it!');
  }

  handleNewUserMessage(newMessage) {
    console.log(newMessage)
    // Send to backend
    setTimeout(() => addResponseMessage('Test reply'), 100)
  }

  render () {
    return (
      <Widget 
        title="Totem Messaging"
        subtitle="Welcome on board."
        senderPlaceHolder="Let's go Toto..."
        handleNewUserMessage={this.handleNewUserMessage}
        badge={1}
      />
    )
  }
};

export default ChatWidget