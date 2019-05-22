// import React, { Component } from 'react';

const React = require('react');
const {Bond} = require('oo7');
const {ReactiveComponent} = require('oo7-react');
const {Widget} = require('react-chat-widget');

// import { Widget } from 'react-chat-widget';

// import 'react-chat-widget/lib/styles.css';


class ChatWidget extends ReactiveComponent {
  constructor() {
    super([]);
  }

  // handleNewUserMessage(newMessage) {
  //   console.log(`New message incomig! ${newMessage}`);
  //   // Now send the message throught the backend API
  // }

  render () {
    return (
      // <div className="App">
      <div>
        <Widget />
      </div>
    )
  }
};

module.exports = { ChatWidget };