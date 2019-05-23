import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { runtimeUp, secretStore } from 'oo7-substrate'
import { Container, Header, Image, Input, Rail, Dropdown } from 'semantic-ui-react'
import Chat from './Chat'

const chatRailStyle = {
  marginTop: 20,
  zIndex: 1,
  height: 'auto'
}

class PageHeader extends ReactiveComponent {
  constructor(props) {
    super(props, {ensureRuntime: runtimeUp, secretStore: secretStore()})

    this.state = {
      index: 0,
      name: '',
      accounts: []
    }

    this.handleSelection = this.handleSelection.bind(this)
    this.handleNameChange = this.handleNameChange.bind(this)
    this.saveName = this.saveName.bind(this)
  }

  handleSelection(e, data) {
    const num = eval(data.value)
    const index = num < this.state.accounts.length ? num : 0
    this.setState({
      index: index,
      name: this.state.accounts[index].name
    })
  }

  handleNameChange(e, data) {
    this.setState({ name: data.value || 'default' })
  }

  saveName() {
    const account = this.state.accounts[this.state.index]
    if (!account || account.name === this.state.name) return;
    
    secretStore().forget(account)
    secretStore().submit(account.phrase, this.state.name)
    this.setState({ index: this.state.accounts.length - 1 })
  }

  componentDidMount() {
    const accounts = this.state.secretStore.keys
    const name = (accounts[0] || {}).name
    this.setState({accounts, name})
  }

  render() {
    const addressOptions = this.state.accounts.map((account, i) => ({
      key: i,
      text: account.address,
      value: i
    }))

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
              options={addressOptions}
              placeholder="Select an address"
              defaultValue={this.state.index}
              onChange={this.handleSelection}
            />
          </div>
          <div>ID: &nbsp;&nbsp;&nbsp;&nbsp;@{this.props.id}</div>
        </Container>
        {/* <Rail internal position="right" style={chatRailStyle} >
          <Chat />
        </Rail> */}
      </Container>
    )
  }
}


PageHeader.propTypes = {
  logo: PropTypes.string,
  id: PropTypes.string
}

PageHeader.defaultProps = {
  logo: 'https://react.semantic-ui.com/images/wireframe/image.png'
}

export default PageHeader
