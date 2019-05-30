import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import { Header, Icon, List, Menu, Segment, Sidebar } from 'semantic-ui-react'
import { Pretty } from '../Pretty'

import { runtime, chain, system, runtimeUp } from 'oo7-substrate'

class SystemStatus extends ReactiveComponent {
  constructor (props) {
    super(props, {
      networkVersion: runtime.version.specVersion,
      online: runtimeUp,
      isSyncing: system.health.is_syncing,
      bestBlock: chain.height,
      lastFinalisedBlock: 0,
      peers: system.health.peers
    })
  }

  render() {
    const items = (
      <React.Fragment>
        <Menu.Item>
            Totem Network Version V<Pretty className="value" value={this.state.networkVersion}/>
          </Menu.Item>
          <Menu.Item>
              <Icon name="circle" color={this.state.online ? 'green' : 'red'} /> 
              {this.state.online ? 'On' : 'off'}line
          </Menu.Item>
          <Menu.Item style={this.props.sidebar ? {} : styles.spaceBelow}>
              <Icon name="circle" color={this.state.isSyncing ? 'green' : 'yellow'} style={styles.listIcon} />
              Syncing - <Pretty className="value" value={this.state.isSyncing ? 'Yes' : 'No'} />
          </Menu.Item>
          <Menu.Item>
              <Icon name="circle" color="green" style={styles.listIcon} />
              Best Block #<Pretty className="value" value={this.state.bestBlock} />
          </Menu.Item>
          <Menu.Item>
              <Icon name="circle" color={this.state.isSyncing ? 'green' : 'yellow'} style={styles.listIcon} />
              Last Finalised Block #<Pretty className="value" value={this.state.lastFinalisedBlock}/>
          </Menu.Item>
          <Menu.Item>
              <Icon name="circle" color={this.state.peers > 0 ? 'green' : 'red'} style={styles.listIcon} />
              Peers #<Pretty className="value" value={system.health.peers}/>
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