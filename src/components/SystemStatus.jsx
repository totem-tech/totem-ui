import React from 'react'
import { ReactiveComponent, Rspan } from 'oo7-react'
import { bytesToHex } from 'oo7-substrate'
import { Divider, Header, Icon, Label, Menu, Segment, Sidebar } from 'semantic-ui-react'
import Identicon from 'polkadot-identicon'
import { Pretty } from '../Pretty'
import ChainInfoBar from './ChainInfoBar'
import { subscribeAllNSetState, unsubscribeAll } from '../services/data'

class SystemStatus extends ReactiveComponent {
  constructor (props) {
    super(props, {
      lastFinalisedBlock: 0
    })
  }

  componentDidMount() {
    this.setState({watchers: subscribeAllNSetState(this, [
      'runtime_version_specVersion', // network version
      // 'system_health_is_syncing',
      'chain_height',
			'chain_lag',
			'nodeService_status',
			'system_chain',
      'system_health_peers',
			'system_name',
			'system_version',
			'runtime_balances_totalIssuance',
			'runtime_core_authorities',
			'runtime_totem_claimsCount',
			'runtime_version_implName',
			'runtime_version_implVersion',
			'runtime_version_specName',
			'runtime_version_specVersion'
    ])})
  }

	componentWillUnmount() {
		unsubscribeAll(this.state.watchers)
	}	

  render() {
    const status = this.state.nodeService_status || {}
    const isConnected = !!status.connected
    const color = 'black'
    const items = (
      <React.Fragment>
        <Menu.Item>
            Totem Network Version V<Pretty className="value" value={this.state.runtime_version_specVersion}/>
          </Menu.Item>
          <Menu.Item>
              <Icon name="circle" color={isConnected ? 'green' : 'red'} /> 
              {!!isConnected ? 'On' : 'off'}line
          </Menu.Item>
          <Menu.Item style={this.props.sidebar ? {} : styles.spaceBelow}>
              <Icon 
                name="circle"
                color={this.state.system_health_is_syncing ? 'green' : 'yellow'}
                style={styles.listIcon}
              />
              Syncing - 
              <Pretty className="value" value={this.state.system_health_is_syncing ? 'Yes' : 'No'} />
          </Menu.Item>
          <Menu.Item>
              <Icon name="circle" color="green" style={styles.listIcon} />
              Best Block #<Pretty className="value" value={this.state.chain_height} />
          </Menu.Item>
          <Menu.Item>
              <Icon name="circle" color={this.state.system_health_is_syncing ? 'green' : 'yellow'} style={styles.listIcon} />
              Last Finalised Block #<Pretty className="value" value={this.state.lastFinalisedBlock}/>
          </Menu.Item>
          <Menu.Item>
              <Icon
                name="circle"
                color={this.state.peers > 0 ? 'green' : 'red'}
                style={styles.listIcon}
              />
              Peers #
              <Pretty className="value" value={this.state.system_health_peers}/>
          </Menu.Item>
      </React.Fragment>
    )

    const infoItems = [
      (<Label color={color}>
        {!isConnected && 'Not '}Connected
        <Label.Detail>
          {isConnected && status.connected}
        </Label.Detail>
      </Label>),
      (<Label color={color}> 
        Chain 
        <Label.Detail>{this.state.system_chain}</Label.Detail>
      </Label>),
      (<Label color={color}>
        Runtime
        <Label.Detail>
          <div>
            {this.state.runtime_version_specName} v{this.state.runtime_version_specVersion}
          </div>
          <div>
            {this.state.runtime_version_implName}  v{this.state.runtime_version_implVersion}
          </div>
        </Label.Detail>
      </Label>),
      (<Label color={color}>
        Height
        <Label.Detail>
          <Pretty value={this.state.chain_height || 0} />
          <span> (with <Pretty value={this.state.chain_lag || 0} /> lag)</span>
        </Label.Detail>
      </Label>),
      (<Label color={color}>
        Authorities 
        <Label.Detail>
            <Rspan className="value">
              {(this.state.runtime_core_authorities || []).map((a, i) => 
                <Identicon key={bytesToHex(a) + i} account={a} size={16} />)}
            </Rspan>
        </Label.Detail>
      </Label>)
    ].map((item, i) => this.props.sidebar ? 
      <Menu.Item key={i}>{item}</Menu.Item> : <div key={i}>{item}</div>)


    return this.props.sidebar ? (
      <Sidebar
        as={Menu}
        animation='push'
        direction='bottom'
        width="very thin"
        inverted
        visible={this.props.visible}
        >
        <Menu.Item as="h3" header>System Status</Menu.Item>
        {items}
        {infoItems}
      </Sidebar>
    ) : (
      <Segment inverted color="black">
        <Header as="h2" inverted>System Status </Header>
        <Menu vertical color="black" inverted>
          {items}
        </Menu>
        {infoItems}
      </Segment>
    )
  }
}

export default SystemStatus

const styles = {
  spaceBelow: {
    marginBottom: 15
  }
}