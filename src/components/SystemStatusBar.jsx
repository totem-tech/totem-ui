import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import { runtimeUp } from 'oo7-substrate'
import { Sidebar, Menu } from 'semantic-ui-react'
import SystemStatus from './SystemStatus'

class SystemStatusBar extends ReactiveComponent {
  constructor(props) {
    super(props, {ensureRuntime: runtimeUp})
  }

  render() {
    return (
      <Sidebar
        as={Menu}
        className="statusbar-bottom"
        visible={this.props.visible}
        amination="push"
        direction="bottom"
        width="very thin"
        inverted
      >
        <Menu.Item>
          <SystemStatus items={this.props.items} />
        </Menu.Item>
      </Sidebar>
    )
  }
} 

export default SystemStatusBar
