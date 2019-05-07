import React, { Component } from 'react'
import {ReactiveComponent, If} from 'oo7-react'
import {runtimeUp} from 'oo7-substrate'
import { Icon, Menu, Segment, Sidebar } from 'semantic-ui-react'
import SystemStatus from './SystemStatus'

class SidebarLeft extends ReactiveComponent {
  constructor(props) {
    super(props, {ensureRuntime: runtimeUp})
    this.state = {
      visible: props.visible,
      thin: props.thin
    }
    this.toggleSidebar = this.toggleSidebar.bind(this)
  }

  // Switch between narrow and wide when on non-mobile devices
  // OR visible and hidden when on mobile
  toggleSidebar() {
    if (!this.props.isMobile) {
      this.setState({ thin: !this.state.thin })
    } else {
      // TODO: handle mobile view
      this.setState({ visible: !this.state.visible })
    }

    if (typeof this.props.onSidebarToggle === 'function') {
      this.props.onSidebarToggle(this.state.thin, this.state.visible)
    }
  }

  render() {
    const sidebarToggle = (
      <Menu.Item
        as="a"
        className="sidebar-toggle"
        onClick={this.toggleSidebar}
        position="right"
        title={this.state.thin ? 'Expand' : 'Collapse'}
      >
        <span>
          <Icon name={'angle ' + (this.state.thin ? 'right' : 'left')} size='large' />
        </span>
      </Menu.Item>
    )

    const systemStatus = (
      <Menu.Item as={Segment} className="system-status left-icon">
        <SystemStatus items={this.props.systemStatusItems} />
      </Menu.Item>
    )

    return (
      <Sidebar
        as={Menu}
        amination="push"
        direction="left"
        vertical
        visible={this.state.visible || !this.props.isMobile}
        width={this.state.thin ? 'very thin' : 'wide'}
        color="violet"
        inverted
      >
        {/* show sidebar toggle when not on mobile */}
        <If condition={!this.props.isMobile} then={sidebarToggle} />

        {/* menu items */
        this.props.items.map((item, i) => (
          <Menu.Item
            as="a"
            key={i}
            active={item.active}
            title={this.state.thin ? item.title : ''}
            onClick={() => this.props.onMenuItemClick(i)}
          >
            <span>
              <Icon
                name={item.icon || 'folder'}
                size={this.state.thin ? 'big' : 'large'}
              />
              <If condition={!this.state.thin} then={item.title} />
            </span>
          </Menu.Item>
        ))}

        <If condition={!this.state.thin} then={systemStatus} />
      </Sidebar>
    )
  }
}

export default SidebarLeft
