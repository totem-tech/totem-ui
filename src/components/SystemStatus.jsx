import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import { Header, List } from 'semantic-ui-react'
import {Pretty} from '../Pretty'

import { runtime, chain, system, runtimeUp } from 'oo7-substrate'

class SystemStatus extends ReactiveComponent {
  constructor () {
    super([], {
      networkVersion: runtime.version.specVersion,
      online: runtimeUp,
      isSyncing: system.health.is_syncing,
      bestBlock: chain.height,
      lastFinalisedBlock: 0,
      peers: system.health.peers
    }) 
  }

  render() {
    return (
      <React.Fragment>
        <Header as="h2">System Status </Header>
        <List className="system-status-list">
          <List.Item>
            <List.Content>Totem Network Version <Pretty className="value" value={this.state.networkVersion}/></List.Content>
          </List.Item>
          <List.Item>
            <List.Icon name="circle" color={this.state.online ? 'green' : 'red'} />
            <List.Content>{this.state.online ? 'On' : 'off'}line</List.Content>
          </List.Item>
          <List.Item>
            <List.Icon name="circle" color={this.state.isSyncing ? 'green' : 'yellow'} />
            <List.Content>Syncing - <Pretty className="value" value={this.state.isSyncing ? 'Yes' : 'No'} /></List.Content>
          </List.Item>
          <List.Item className="empty">
            <List.Content><br /></List.Content>
          </List.Item>
          <List.Item>
            <List.Icon name="circle" color="green" />
            <List.Content>Best Block #<Pretty className="value" value={this.state.bestBlock} /></List.Content>
          </List.Item>
          <List.Item>
            <List.Icon name="circle" color={this.state.isSyncing ? 'green' : 'yellow'} />
            <List.Content>Last Finalised Block #<Pretty className="value" value={this.state.lastFinalisedBlock}/></List.Content>
          </List.Item>
          <List.Item>
            <List.Icon name="circle" color={this.state.peers > 0 ? 'green' : 'red'} />
            <List.Content>Peers #<Pretty className="value" value={system.health.peers}/></List.Content>
          </List.Item>
        </List>
      </React.Fragment>
    )
  }
}

export default SystemStatus
