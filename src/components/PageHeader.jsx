import React from 'react'
import PropTypes from 'prop-types'
import { If, ReactiveComponent } from 'oo7-react'
import { runtimeUp, secretStore } from 'oo7-substrate'
import { Container, Dropdown, Header, Icon, Image, Input, Label, Segment } from 'semantic-ui-react'
import uuid from 'uuid'
import {addResponseMessage, dropMessages, isWidgetOpened, toggleWidget} from 'react-chat-widget'
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
      id: (user || {}).id,
      registered: !!user,
      loading: false,
      idValid: false,
      showNameInput: false
    }

    this.handleSelection = this.handleSelection.bind(this)
    this.handleNameChange = this.handleNameChange.bind(this)
    this.handleSaveName = this.handleSaveName.bind(this)
    this.handleIdChange = this.handleIdChange.bind(this)
    this.handleRegister = this.handleRegister.bind(this)
    this.toggleNameInput = this.toggleNameInput.bind(this)
  }

  handleSelection(e, data) {
    const num = eval(data.value)
    const index = num < this.state.secretStore.keys.length ? num : 0
    this.setState({
      index: index,
      name: this.state.secretStore.keys[index].name
    })
  }

  handleNameChange(_, data) {
    this.setState({ name: data.value })
  }

  handleSaveName() {
    const account = this.state.secretStore.keys[this.state.index]
    if (!account || account.name === this.state.name) return this.setState({showNameInput: false});
    
    setTimeout(()=> {
      secretStore().forget(account)
      secretStore().submit(account.phrase, this.state.name)
      const index = this.state.secretStore.keys.length - 1
      this.setState({
        index,
        showNameInput: false,
        accounts: this.state.secretStore.keys,
        name: this.state.secretStore.keys[index].name
      })  
    })
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
      if (err) return this.setState({idError: err, idValid: false});

      this.setState({registered: true})
      dropMessages()
      addResponseMessage('So, you want to try Totem? Great! Just post your default address and I\'ll send you some funds - and then you can use it!')
      !isWidgetOpened() && toggleWidget()
    })
  }

  toggleNameInput() {
    this.setState({
      showNameInput: !this.state.showNameInput,
      name: this.state.secretStore.keys[this.state.index].name
    })
  }

  componentDidMount() {
    const accounts = this.state.secretStore.keys
    const name = (accounts[0] || {}).name
    this.setState({accounts, name})
  }

  render() {
    const userIdInput = (
      <React.Fragment>
        <Input
          label="@"
          action={{
            color: 'black',
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

    const acName = (
      <Header as="h1" color="black" style={styles.h1}>
        <span>
          {this.state.name}
          <Icon 
            name="pencil"
            color="black"
            style={{fontSize: 15, cursor: 'pointer'}}
            onClick={this.toggleNameInput}
          />
        </span>
      </Header>
    )

    const acNameInput = (
      <Input
        className="header-name"
        action={{
          color: 'black',
          icon: 'pencil',
          onClick: this.handleSaveName
        }}
        onChange={this.handleNameChange}
        value={this.state.name}
      />
    )

    return (
      <Container fluid style={styles.headerContainer} className="header-bar">
        <Container style={styles.logo} className="logo">
          <Image src={this.props.logo} style={styles.logoImg} />
        </Container>
        <Container className="content" style={styles.content}>
          <If condition={this.state.showNameInput} then={acNameInput} else={acName} />
          <div>
            Address Key:
            <Dropdown
              style={styles.dropdown}
              className="address-dropdown"
              selection
              options={this.state.secretStore.keys.map((account, i) => ({
                key: i,
                text: account.address,
                value: i
              }))}
              placeholder="Select an address"
              value={this.state.index}
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


const styles = {
  headerContainer: {
    height: 154,
    border: 'none'
  },
  logo: {
    width: 265,
    float: 'left',
    padding: 15
  },
  logoImg: {
    margin: 'auto',
    maxHeight: 124,
    width: 'auto'
  },
  content: {
    // backgroundColor: '#ddd0f5',
    height: 154,
    width: 'calc(100% - 265px)',
    float: 'right',
    padding: '25px 50px'
  },
  h1: {
    fontSize: 40,
    marginBottom: 0
  },
  dropdown: {
    background: 'none',
    border: 'none',
    boxShadow: 'none'
  }
}
