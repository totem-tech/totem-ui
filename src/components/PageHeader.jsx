import React from 'react'
import PropTypes from 'prop-types'
import { If, ReactiveComponent } from 'oo7-react'
import { runtimeUp, secretStore } from 'oo7-substrate'
import { Button, Container, Dropdown, Header, Icon, Image, Input, Label, Segment } from 'semantic-ui-react'
import uuid from 'uuid'
import {addResponseMessage, dropMessages, isWidgetOpened, toggleWidget} from 'react-chat-widget'
import { getUser, getClient } from './ChatClient'
import { copyToClipboard, setStateTimeout } from './utils'
const nameRegex = /^($|[a-z]|[a-z][a-z0-9]+)$/

class PageHeader extends ReactiveComponent {
  constructor(props) {
    super(props, {ensureRuntime: runtimeUp, secretStore: secretStore()})

    const user = getUser()
    this.state = {
      index: 0,
      id: (user || {}).id,
      registered: !!user,
      loading: false,
      idValid: false,
      faucetReqMsg: {error: false, text: ''}
    }

    this.handleSelection = this.handleSelection.bind(this)
    this.handleIdChange = this.handleIdChange.bind(this)
    this.handleRegister = this.handleRegister.bind(this)
    this.handleFaucetRequest = this.handleFaucetRequest.bind(this)
  }

  handleSelection(e, data) {
    const num = eval(data.value)
    const index = num < this.state.secretStore.keys.length ? num : 0
    this.setState({index})
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
      addResponseMessage('So, you want to started with Totem? Great! Just ping your address using the Request Funds button and we\'ll send you some funds! Then you are good to go!')
      !isWidgetOpened() && toggleWidget()
    })
  }

  handleCopy(address) {
    copyToClipboard(address)
    setStateTimeout(this, 'copied', true, false, 2000)
  }

  handleFaucetRequest(address, amount) {
    const client = getClient()
    if (!client.isConnected()) {
      const msg = {
        text: 'Connection failed!',
        error: true
      }
      setStateTimeout(this, 'faucetReqMsg', msg, {}, 3000)
      return
    }
    client.faucetRequest(address, amount, (err) => {
      const msg = {
        text: err || 'Request sent!',
        error: !!err
      }
      setStateTimeout(this, 'faucetReqMsg', msg, 3000)
    })
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
          placeholder="To begin create a unique ID."
          error={!!this.state.idError}
          style={{minWidth: 270}}
        />
        <If 
          condition={this.state.idError}
          then={<Label basic color='red' pointing="left">{this.state.idError}</Label>}
        />
      </React.Fragment>
    )

    const address = (this.state.secretStore.keys[this.state.index] || {}).address
    const index = this.state.index < this.state.secretStore.keys.length ? this.state.index : 0
    return (
      <Container fluid style={styles.headerContainer}>
        <Container style={styles.logo}>
          <Image src={this.props.logo} style={styles.logoImg} />
        </Container>
        <Container style={styles.content}>
          <Dropdown
            style={styles.dropdown}
            icon={<Icon name="dropdown" size="big" style={styles.dropdownIcon} />}
            labeled
            selection
            options={this.state.secretStore.keys.map((key, i) => ({
              key: i,
              text: key.name,
              value: i
            }))}
            placeholder="Select an account"
            value={index}
            onChange={this.handleSelection}
          />
          <div>
            Accounting Ledger Public Address: {address}&nbsp;&nbsp;
            <Icon
              link
              title="Copy address"
              name="copy outline"
              onClick={() => this.handleCopy(address)}
            />

            <If
              condition={this.state.copied}
              then={<Label basic color="green" pointing="left">Address copied to clipboard!</Label>}
            />

            <If
              condition={this.state.registered && address}
              then={<Button size="mini" onClick={() => this.handleFaucetRequest(address)}>Request Funds Now</Button>}
            />
            <If
              condition={this.state.faucetReqMsg.text}
              then={<Label basic color={this.state.faucetReqMsg.error ? 'red' : 'green'} pointing="left">{this.state.faucetReqMsg.text}</Label>}
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
    width: 235,
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
    width: 'calc(100% - 235px)',
    float: 'right',
    padding: '25px 50px'
  },
  dropdown: {
    background: 'none',
    border: 'none',
    boxShadow: 'none',
    minHeight: 'auto',
    fontSize: 40,
    padding: '0 2.1em 5px 0',
    minWidth: 'auto'
  },
  dropdownIcon: {
    padding: 0
  }
}
