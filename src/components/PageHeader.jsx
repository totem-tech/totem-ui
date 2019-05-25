import React from 'react'
import PropTypes from 'prop-types'
import { If, ReactiveComponent } from 'oo7-react'
import { runtimeUp, secretStore } from 'oo7-substrate'
import { Container, Header, Image, Input, Label, Dropdown } from 'semantic-ui-react'
import uuid from 'uuid'
import {getUser, getClient} from './ChatClient'
const nameRegex = /^($|[a-z]|[a-z][a-z0-9]+)$/

class PageHeader extends ReactiveComponent {
  constructor(props) {
    super(props, {ensureRuntime: runtimeUp, secretStore: secretStore()})

    const user = getUser()
    this.state = {
      accounts: [],
      index: 0,
      name: '',
      id: (user || {}).id || '',
      registered: !!user,
      loading: false,
      idValid: false
    }

    this.handleSelection = this.handleSelection.bind(this)
    this.handleNameChange = this.handleNameChange.bind(this)
    this.handleSaveName = this.handleSaveName.bind(this)
    this.handleIdChange = this.handleIdChange.bind(this)
    this.handleRegister = this.handleRegister.bind(this)
  }

  handleSelection(e, data) {
    const num = eval(data.value)
    const index = num < this.state.accounts.length ? num : 0
    this.setState({
      index: index,
      name: this.state.accounts[index].name
    })
  }

  handleNameChange(_, data) {
    this.setState({ name: data.value || 'default' })
  }

  handleSaveName() {
    const account = this.state.accounts[this.state.index]
    if (!account || account.name === this.state.name) return;
    
    setTimeout(() => {
      secretStore().forget(account)
      secretStore().submit(account.phrase, this.state.name)
      this.setState({index: this.state.accounts.length - 1})
    }, 2000)
  }

  handleIdChange(_, data) {
    const val = data.value.trim()
    const valid = nameRegex.test(val) && val.length <= 16
    if (!valid) return;
    const hasMin = val.length < 1 || val.length >= 3
    this.setState({
      id: val,
      idError: !hasMin && 'minimum 3 characters required',
      idValid: hasMin
    })
  }

  handleRegister() {
    getClient().register(this.state.id, uuid.v1(), err => {
      console.log('register', err)
      this.setState({
        idError: err,
        idValid: !err,
        registered: !err
      })
    })
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

    const userIdInput = (
      <React.Fragment>
        <Input
          label="@"
          action={{
            color: 'violet',
            icon: 'sign-in',
            onClick: this.handleRegister,
            loading: this.state.loading,
            disabled: !this.state.idValid
          }}
          onChange={this.handleIdChange}
          value={this.state.id}
          placeholder="Enter ID to register for chat"
          error={!!this.state.idError}
          style={{minWidth: 270}}
        />
        <If 
          condition={this.state.idError}
          then={<Label basic color='red' pointing="left">{this.state.idError}</Label>}
        />
      </React.Fragment>
    )

    return (
      <Container fluid className="header-bar">
        <Container className="logo">
          <Image src={this.props.logo} />
        </Container>
        <Container className="content">
          <Header as="h1" style={{ marginBottom: 0}}>
            <Input
              className="header-name"
              action={{
                color: 'violet',
                icon: 'pencil',
                onClick: this.saveName
              }}
              onChange={this.handleNameChange}
              onBlur={this.handleSaveName}
              value={this.state.name}
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
          <div>
            <span style={{paddingRight: 10}}>ID:</span>
            <If
              condition={!this.state.registered} 
              then={userIdInput}
              else={'@' + this.state.id}
            />
          </div>
        </Container>
      </Container>
    )
  }
}


PageHeader.propTypes = {
  logo: PropTypes.string
}

PageHeader.defaultProps = {
  logo: 'https://react.semantic-ui.com/images/wireframe/image.png'
}

export default PageHeader
