import React from 'react'
import PropTypes from 'prop-types'
import {ReactiveComponent, If} from 'oo7-react'
import { Icon, Menu, Segment, Sidebar } from 'semantic-ui-react'
import SystemStatus from './SystemStatus'

class SidebarLeft extends ReactiveComponent {
  constructor(props) {
    super(props)
    this.toggleSidebar = this.toggleSidebar.bind(this)
    this.handleHide = this.handleHide.bind(this)
  }

  // Switch between narrow and wide when on non-mobile devices
  // OR visible and hidden when on mobile
  toggleSidebar() {
    let collapsed = this.props.collapsed,
        visible = this.props.visible
    if (!this.props.isMobile) {
      collapsed = !collapsed
    } else {
      visible = !visible
    }

    if (typeof this.props.onSidebarToggle === 'function') {
      this.props.onSidebarToggle(collapsed, visible)
    }
  }

  handleHide() {
    // this.setState({visible: false})
    this.props.onSidebarToggle(this.state.collapsed, false)
  }

  componentWillUpdate() {
    // this.props.onSidebarToggle(this.props.collapsed, this.props.visible, this.props.isMobile)
  }

  render() {
    const sidebarToggle = (
      <div
        style={styles.sidebarToggle}
        onClick={this.toggleSidebar}
        position="right"
        title={this.props.collapsed ? 'Expand' : 'Collapse'}
        style={styles.sidebarToggle}
      >
        <span>
          <Icon name={'arrow alternate circle ' + (this.props.collapsed ? 'right ' : 'left ') + 'outline'} />
          {this.props.collapsed ? '' : ' Close sidebar'}
        </span>
      </div>
    )

    // force sidebar to be visible when in desktop mode
    const visible = this.props.isMobile ? this.props.visible : true 
    return (
      <Sidebar
        as={Menu}
        animation={this.props.isMobile ? 'overlay' : 'push'}
        direction="left"
        vertical
        visible={visible}
        width={this.props.collapsed ? 'very thin' : 'wide'}
        color="black"
        inverted
        style={this.props.isMobile ? (this.props.collapsed ? styles.collapsed : styles.expanded) : {}}
        onHide={this.handleHide}
      >
        {/* show sidebar toggle when not on mobile */}
        <Menu.Item style={styles.sidebarToggleWrap}>{sidebarToggle}</Menu.Item>

        {// menu items 
        this.props.items.map((item, i) => (
          <Menu.Item
            as="a"
            key={i}
            active={item.active}
            title={this.props.collapsed ? item.title : ''}
            onClick={() => this.props.onMenuItemClick(i, this.props.isMobile)}
            style={i === 0 ? {marginTop: 40} : {}}
          >
            <span>
              <Icon
                name={item.icon || 'folder'}
                // size={this.props.collapsed ? 'big' : 'large'}
              />
              <If condition={!this.props.collapsed} then={item.title} />
            </span>
          </Menu.Item>
        ))}

        <If condition={!this.props.collapsed} then={<SystemStatus  sidebar={false} />} />
      </Sidebar>
    )
  }
}

SidebarLeft.propTypes = {
  collapsed: PropTypes.bool,
  isMobile: PropTypes.bool,
  items: PropTypes.array,
  onMenuItemClick: PropTypes.func,
  onSidebarToggle: PropTypes.func.isRequired,
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
    //   subHeaderDetails: 'Sample text that extends subheader',
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
  sidebarToggleWrap: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    padding: 0
  },
  sidebarToggle: {
    position: 'sticky',
    top: 0,
    left: 0,
    height: 40,
    color: 'white',
    background: '#4a4a4a',
    padding: '13px 18px',
    cursor: 'pointer',
    zIndex: 1,
    textAlign: 'right'
  }
}
