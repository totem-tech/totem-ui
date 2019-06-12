import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import { Header, Icon, List, Menu, Segment, Sidebar } from 'semantic-ui-react'
import { Pretty } from '../Pretty'
import { runtime, chain, system, runtimeUp, pretty } from 'oo7-substrate'
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
      'runtimeUp', // online/offline
      // 'system_health_is_syncing',
      'chain_height',
      'system_health_peers'
    ])})
  }

	componentWillUnmount() {
		unsubscribeAll(this.state.watchers)
	}	

  render() {
    const items = (
      <React.Fragment>
        <Menu.Item>
            Totem Network Version V<Pretty className="value" value={this.state.runtime_version_specVersion}/>
          </Menu.Item>
          <Menu.Item>
              <Icon name="circle" color={this.state.runtimeUp ? 'green' : 'red'} /> 
              {this.state.runtimeUp ? 'On' : 'off'}line
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
      </Sidebar>
    ) : (
      <Segment inverted color="black">
        <Header as="h2" inverted>System Status </Header>
        <Menu vertical color="black" inverted>
          {items}
        </Menu>
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