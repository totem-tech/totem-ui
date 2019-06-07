import React from 'react'
import PropTypes from 'prop-types'
import {ReactiveComponent, If} from 'oo7-react'
import { Icon, Menu, Segment, Sidebar } from 'semantic-ui-react'
import SystemStatus from './SystemStatus'

class SidebarLeft extends ReactiveComponent {
  constructor(props) {
    super(props)
    this.state = {
      visible: props.visible,
      collapsed: props.collapsed
    }
    this.toggleSidebar = this.toggleSidebar.bind(this)
  }

  // Switch between narrow and wide when on non-mobile devices
  // OR visible and hidden when on mobile
  toggleSidebar() {
    let collapsed = this.state.collapsed,
        visible = this.state.visible
    if (!this.props.isMobile) {
      collapsed = !collapsed
      this.setState({ collapsed })
    } else {
      // TODO: handle mobile view
      visible = !visible
      this.setState({ visible})
    }

    if (typeof this.props.onSidebarToggle === 'function') {
      this.props.onSidebarToggle(collapsed, visible)
    }
  }

  render() {
    const sidebarToggle = (
      <Menu.Item
        as="a"
        className="sidebar-toggle"
        onClick={this.toggleSidebar}
        position="right"
        title={this.state.collapsed ? 'Expand' : 'Collapse'}
        style={styles.sidebarToggle}
      >
        <span>
          <Icon name={'angle ' + (this.state.collapsed ? 'right' : 'left')} />
        </span>
      </Menu.Item>
    )

    return (
      <Sidebar
        as={Menu}
        amination="push"
        direction="left"
        vertical
        visible={this.state.visible || !this.props.isMobile}
        width={this.state.collapsed ? 'very thin' : 'wide'}
        color="black"
        inverted
        style={this.state.collapsed ? styles.collapsed : styles.expanded}
      >
        {/* show sidebar toggle when not on mobile */}
        <If condition={!this.props.isMobile} then={sidebarToggle} />

        {// menu items 
        this.props.items.map((item, i) => (
          <Menu.Item
            as="a"
            key={i}
            active={item.active}
            title={this.state.collapsed ? item.title : ''}
            onClick={() => this.props.onMenuItemClick(i)}
          >
            <span>
              <Icon
                name={item.icon || 'folder'}
                // size={this.state.collapsed ? 'big' : 'large'}
              />
              <If condition={!this.state.collapsed} then={item.title} />
            </span>
          </Menu.Item>
        ))}

        <If condition={!this.state.collapsed} then={<SystemStatus  sidebar={false} />} />
      </Sidebar>
    )
  }
}

SidebarLeft.propTypes = {
  collapsed: PropTypes.bool,
  isMobile: PropTypes.bool,
  items: PropTypes.array,
  onMenuItemClick: PropTypes.func,
  onSidebarToggle: PropTypes.func,
  visible: PropTypes.bool
}

SidebarLeft.defaultProps = {
  collapsed: false,
  isMobile: false,
  items: [
    //// for example only
    // { 
    //   icon: 'warning sign',
    //   title: 'No items available',
    //   header: 'Sample Header',
    //   subHeader: 'A sample',
    //   content: 'This is a sample',
    //   active: true,
    //   elementRef: React.createRef()
    // }
  ],
  visible: true
}

export default SidebarLeft

const styles = {
  collapsed: {
    width: 70,
    paddingBottom: 52
  },
  expanded: {
    width: 265
  },
  sidebarToggle: {
    textAlign: 'right'
  }
}
