import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { runtimeUp, secretStore, runtime, ss58Decode } from 'oo7-substrate'
import { Button, Container, Dropdown, Icon, Image, Input, Label, Menu, Message, } from 'semantic-ui-react'
import uuid from 'uuid'
import { addResponseMessage, dropMessages, isWidgetOpened, toggleWidget } from 'react-chat-widget'
import { getUser, getClient, onLogin } from './ChatClient'
import { copyToClipboard, IfFn, setState, setStateTimeout, textEllipsis } from './utils'
import Register from './forms/Register'
import BalanceButton from './BalanceButton'
import { Pretty } from '../Pretty';

const nameRegex = /^($|[a-z]|[a-z][a-z0-9]+)$/

class PageHeader extends ReactiveComponent {
  constructor(props) {
    super(props, { ensureRuntime: runtimeUp, secretStore: secretStore() })

    const user = getUser()
    this.state = {
      index: 0,
      id: user ? user.id : '',
      idDraft: '',
      idValid: true,
      message: { error: false, text: ''}
    }

    // Update user ID after login/registration
    onLogin(id => id && this.setState({id}))

    this.getSeletectedAddress = () => (this.state.secretStore.keys[this.state.index || 0] || {}).address
    this.handleCopy = this.handleCopy.bind(this)
    this.handleFaucetRequest = this.handleFaucetRequest.bind(this)
    this.handleIdChange = this.handleIdChange.bind(this)
    this.handleSelection = this.handleSelection.bind(this)
    this.handleRegister = this.handleRegister.bind(this)
    this.handleBalance = this.handleBalance.bind(this)
  }

  handleSelection(e, data) {
    const num = eval(data.value)
    const index = num < this.state.secretStore.keys.length ? num : 0
    this.setState({ index })
  }

  handleIdChange(_, data) {
    const val = data.value.trim()
    const valid = nameRegex.test(val) && val.length <= 16
    if (!valid) return;
    const hasMin = val.length < 1 || val.length >= 3
    this.setState({
      idDraft: val,
      isValid: hasMin,
      message: { 
        error: !hasMin,
        text: !hasMin ? 'minimum 3 characters required' : ''
      }
    })
  }

  handleRegister() {
    const { idDraft } = this.state
    getClient().register(idDraft, uuid.v1(), err => {
      if (err) return this.setState({ idValid: false, message: {error: true, text: err} });

      this.setState({ id: idDraft })
      dropMessages()
      addResponseMessage(
        'So, you want to get started with Totem? Great! Just ping your address using the Request Funds ' +
        'button and we\'ll send you some funds! Then you are good to go!'
      )
      !isWidgetOpened() && toggleWidget()
    })
  }

  handleCopy() {
    const address = this.getSeletectedAddress()
    if (!address) return;
    copyToClipboard(address)
    const msg = { text: 'Address copied to clipboard', error: false}
    setStateTimeout(this, 'message', msg, {}, 2000)
  }

  handleFaucetRequest() {
    const address = this.getSeletectedAddress()
    if (!address) return;
    const client = getClient()
    if (!client.isConnected()) {
      const msg = {
        text: 'Connection failed!',
        error: true
      }
      setStateTimeout(this, 'message', msg, {}, 3000)
      return
    }
    client.faucetRequest(address, (err, fifthTs) => {
      const msg = {
        text: err || 'Request sent!',
        error: !!err
      }
      setStateTimeout(this, 'message', msg, 3000)
    })
  }

  // for mobile 
  handleBalance() {
    const addressSelected = this.getSeletectedAddress()
    setStateTimeout(this, 'message', {
      text: <BalanceButton address={addressSelected} persist={true} />,
      error: false,
      color: 'grey'
    }, {}, 5000)
  }

  // componentWillUpdate() {
  //   console.log('componentWillUpdate')
  //   //this.state.index < this.state.secretStore.keys.length ? this.state.index : 0
  // }

  render() {
    const { id, idDraft, idValid, index, message, secretStore } = this.state
    const { logoSrc, onSidebarToggle, sidebarVisible } = this.props
    const { keys: wallets} = secretStore
    const addressSelected = this.getSeletectedAddress()
    const mobileProps = {
      addressSelected,
      id,
      idDraft,
      idValid,
      logoSrc,
      message,
      onBalance: this.handleBalance,
      onCopy: this.handleCopy,
      onFaucetRequest: () => this.handleFaucetRequest(addressSelected),
      onIdChange: this.handleIdChange,
      onRegister: this.handleRegister,
      onSelection: this.handleSelection,
      onSidebarToggle,
      selectedIndex: index,
      sidebarVisible,
      wallets
    }
    return this.props.isMobile ? <MobileHeader {...mobileProps} /> : <DesktopHeader {...mobileProps}/>
  }
}

PageHeader.propTypes = {
  logoSrc: PropTypes.string,
  onSidebarToggle: PropTypes.func,
  sidebarVisible: PropTypes.bool
}

PageHeader.defaultProps = {
  logoSrc: 'https://react.semantic-ui.com/images/wireframe/image.png'
}

export default PageHeader

class DesktopHeader extends ReactiveComponent {
  constructor() {
    super()
  }

  getIdInput(idDraft, idValid, onIdChange, onRegister) {
    return (
      <Input
          label="@"
          action={{
            color: 'black',
            icon: 'sign-in',
            onClick: onRegister,
            disabled: !idValid
          }}
          onChange={onIdChange}
          value={idDraft}
          placeholder="To begin create a unique ID."
          error={!idValid}
          style={{ minWidth: 270 }}
      />
    )
  }

  render() {
    const {
      addressSelected,
      id,
      idDraft,
      idValid,
      logoSrc,
      message,
      onCopy,
      onFaucetRequest,
      onIdChange,
      onRegister,
      onSelection,
      selectedIndex,
      wallets
    } = this.props
    return (
      <Container fluid style={styles.headerContainer}>
        <Container style={styles.logo}>
          <Image src={logoSrc} style={styles.logoImg} />
        </Container>
        <Container style={styles.content}>
          <Dropdown
            style={styles.dropdown}
            icon={<Icon name="dropdown" color="grey" size="big" style={styles.dropdownIcon} />}
            labeled
            selection
            noResultsMessage="No wallet available"
            placeholder="Select an account"
            value={selectedIndex}
            onChange={onSelection}
            options={wallets.map((wallet, i) => ({
              key: i,
              text: wallet.name,
              description: <Pretty value={runtime.balances.balance(ss58Decode(wallet.address))} />,
              value: i
            }))}
          />
          <div>
            Accounting Ledger Public Address: {textEllipsis(addressSelected, 23)}&nbsp;&nbsp;
            <Icon
                link
                title="Copy address"
                name="copy outline"
                onClick={onCopy}
            />
            {id && [
              <Button
                content="Request Funds"
                icon="gem"
                key={0}
                onClick={onFaucetRequest}
                title="Request Funds"
              />,
              <BalanceButton key={1} address={addressSelected} />
            ]}

          </div>
          {/* <div xstyle={{ paddingTop: 9 }}>
            <span style={{ paddingRight: 8 }}>ID:</span>
            <IfFn
              condition={!id}
              then={() => this.getIdInput(idDraft, idValid, onIdChange, onRegister)}
              else={'@' + id}
            />
          </div> */}

          <IfFn
            condition={message && message.text}
            then={<Label basic color={message.error ? 'red' : 'green'} pointing="above" style={{zIndex: 1}}>{message.text}</Label>}
          />
        </Container>
      </Container>
    )
  }
}

class MobileHeader extends ReactiveComponent {
  constructor() {
    super()
    this.state = {
      showTools: false
    }
  }

  render() {
    const instance = this
    const { showTools } = this.state
    const {
      addressSelected,
      id,
      idDraft,
      idValid,
      logoSrc,
      message,
      onBalance,
      onCopy,
      onFaucetRequest,
      onIdChange,
      onRegister,
      onSidebarToggle,
      onSelection,
      selectedIndex,
      sidebarVisible,
      wallets
    } = this.props

    return (
      <div>
        <Menu fixed="top" inverted>
          <Menu.Item
            icon={{name:'sidebar', size: 'big', className: 'no-margin'}}
            onClick={() => onSidebarToggle(false, !sidebarVisible)} 
          />
          <Menu.Item>
            <Image size="mini" src={logoSrc} />
          </Menu.Item>
          <Menu.Menu position="right">
              {/* {!id && (
                <Register
                  modal={true}
                  trigger={<Menu.Item as="a"  className="borderless" content="Create chat user" icon="sign-in"/>}
                />
              )} */}
              <Menu.Item>
                <Dropdown
                  labeled
                  value={selectedIndex || 0}
                  noResultsMessage="No wallet available"
                  placeholder="Select an account"
                  onChange={onSelection}
                  options={wallets.map((wallet, i) => ({
                    key: i,
                    text: (wallet.name || '').split('').slice(0, 16).join(''),
                    description: <Pretty value={runtime.balances.balance(ss58Decode(wallet.address))} />,
                    value: i
                  }))}
                />
              </Menu.Item>
            </Menu.Menu>
            <Menu.Menu fixed="right">
              <Dropdown
                  item
                  icon={{ name: 'chevron circle ' + (showTools ? 'up' : 'down'), size: 'large', className: 'no-margin'}}
                  onClick={() => setState(instance, 'showTools', !showTools)}
                >
                  <Dropdown.Menu className="left">
                    <Dropdown.Item
                      icon="copy"
                      content="Copy Address"
                      onClick={onCopy}
                    />
                    {id && [
                      <Dropdown.Item
                        key="0"
                        icon="gem"
                        content="Request Funds"
                        onClick={onFaucetRequest}
                      />,
                      <Dropdown.Item
                        key="1"
                        icon="dollar"
                        content="Show Balance"
                        onClick={ onBalance }
                      />
                    ]}
                  </Dropdown.Menu>
                </Dropdown>
              </Menu.Menu>
            
        </Menu>
        {message && message.text && (
          <div>
            <Message
              content={message.text}
              color={message.color || (message.error ? 'red' : 'green')}
              style={styles.messageMobile}
            />
          </div>
        )}
      </div>
    )
  }
}

const styles = {
  content: {
    height: 154,
    width: 'calc(100% - 235px)',
    float: 'right',
    padding: '18px 0px'
  },
  dropdown: {
    background: 'none',
    border: 'none',
    boxShadow: 'none',
    minHeight: 'auto',
    fontSize: 35,
    padding: '0 2em 10px 0',
    minWidth: 'auto'
  },
  dropdownIcon: {
    padding: 0
  },
  headerContainer: {
    height: 154,
    borderBottom: '5px solid black'
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
  messageMobile: {
    zIndex: 3,
    margin: '61px 0px 0px 0',
    position: 'absolute',
    width: '100%',
    textAlign: 'center'
  }
}
