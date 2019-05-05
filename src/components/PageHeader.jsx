import React, { Component } from 'react';
import {
  Container,
  Header,
  Image,
  Input,
  Rail,
  Dropdown
} from 'semantic-ui-react';

import { secretStore } from 'oo7-substrate';
import Chat from './Chat';

class PageHeader extends Component {
  constructor(props) {
    super(props);
    const index = props.accounts.length > 0 ? 0 : -1;

    this.state = {
      index: index,
      name: (this.props.accounts[index] || {}).name
    };

    this.handleSelection = this.handleSelection.bind(this);
    this.handleNameChange = this.handleNameChange.bind(this);
    this.saveName = this.saveName.bind(this);
  }

  handleSelection(e, data) {
    const num = eval(data.value);
    const index = num < this.props.accounts.length ? num : 0;
    this.setState({
      index: index,
      name: this.props.accounts[index].name
    });
  }

  handleNameChange(e, data) {
    this.setState({ name: data.value || 'default' });
  }

  saveName() {
    const account = this.props.accounts[this.state.index];
    if (account.name === this.state.name) {
      return;
    }
    secretStore().forget(account);
    secretStore().submit(account.phrase, this.state.name);
    this.setState({ index: this.props.accounts.length - 1 });
  }

  render() {
    return (
      <Container fluid className="header-bar">
        <Container className="logo">
          <Image src={this.props.logo} />
        </Container>
        <Container className="content">
          <Header as="h1">
            <Input
              className="header-name"
              action={{
                color: 'teal',
                icon: 'pencil',
                onClick: this.saveName
              }}
              onChange={this.handleNameChange}
              onBlur={this.saveName}
              value={this.state.name}
              disabled={this.state.loading}
            />
          </Header>
          <div>
            Address Key:
            <Dropdown
              className="address-dropdown"
              selection
              options={this.props.accounts.map((account, i) => ({
                key: i,
                text: account.address,
                value: i
              }))}
              placeholder="Select an address"
              defaultValue={this.state.index}
              onChange={this.handleSelection}
            />
          </div>
          <div>ID: &nbsp;&nbsp;&nbsp;&nbsp;@{this.props.id}</div>
        </Container>
        <Rail
          internal
          position="right"
          style={{
            marginTop: 20,
            zIndex: 1,
            height: 'auto'
          }}
        >
          <Chat />
        </Rail>
      </Container>
    );
  }
}
export default PageHeader;
