import React, { Component } from "react";
import { Container, Header, Image, Rail, Dropdown } from "semantic-ui-react";
import Chat from "./Chat";

class PageHeader extends Component {
  constructor(props) {
    super(props);

    this.state = {
      options: props.accounts.map((account, i) => ({
        key: i,
        text: account.address,
        value: i,
        name: account.name
      })),
      index: props.accounts.length > 0 ? 0 : -1
    };

    this.handleSelection = this.handleSelection.bind(this);
  }

  handleSelection(e, data) {
    this.setState({ index: eval(data.value) });
  }

  render() {
    return (
      <Container fluid className="header-bar">
        <Container className="logo">
          <Image src={this.props.logo} />
        </Container>
        <Container className="content">
          <Header as="h1">
            {(this.props.accounts[this.state.index] || {}).name}
          </Header>
          <div>
            Address Key:
            <Dropdown
              selection
              options={this.state.options}
              placeholder="Select an address"
              defaultValue={this.state.index}
              onChange={this.handleSelection}
            />
          </div>
          <div>ID: @{this.props.id}</div>
        </Container>
        <Rail
          internal
          position="right"
          style={{
            marginTop: 20,
            zIndex: 1,
            height: "auto"
          }}
        >
          <Chat />
        </Rail>
      </Container>
    );
  }
}
export default PageHeader;
