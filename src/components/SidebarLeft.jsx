import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { Icon, Menu, Sidebar } from 'semantic-ui-react'

class SidebarLeft extends ReactiveComponent {
	constructor(props) {
		super(props)
		this.handleHide = this.handleHide.bind(this)
		this.handleToggle = this.handleToggle.bind(this)
	}

	handleHide() {
		const { isMobile, onSidebarToggle } = this.props
		if (isMobile) {
			return onSidebarToggle(false, false)
		}
	}

	handleToggle() {
		const { collapsed, isMobile, onSidebarToggle, visible } = this.props

		if (isMobile) {
			return onSidebarToggle(!visible, false)
		}
		onSidebarToggle(true, !collapsed)
	}

	render() {
		const { collapsed, isMobile, items, onMenuItemClick, visible } = this.props
		const { collapsed: sCollapsed, expanded, menuItem, sidebarToggleWrap } = styles
		const animation = isMobile ? 'overlay' : 'push'

		// force open sidebar if no item is active
		const allInactive = items.every(({ active }) => !active)
		const collapse = allInactive ? false : collapsed
		return (
			<Sidebar
				as={Menu}
				animation={animation}
				direction="left"
				vertical
				visible={allInactive ? true : visible}
				width={collapse ? 'very thin' : 'wide'}
				color="black"
				inverted
				style={isMobile ? (collapse ? sCollapsed : expanded) : {}}
				onHide={allInactive ? undefined : this.handleHide}
			>
				{/* show sidebar toggle when not on mobile */}
				<Menu.Item style={sidebarToggleWrap} onClick={allInactive ? undefined : this.handleToggle}>
					<div
						style={styles.sidebarToggle}
						position="right"
						title={this.props.collapsed ? 'Expand' : 'Collapse'}
						style={styles.sidebarToggle}
					>
						<span>
							<Icon name={'arrow alternate circle ' + (collapse ? 'right ' : 'left ') + 'outline'} />
							{collapse ? '' : ' Close sidebar'}
						</span>
					</div>
				</Menu.Item>

				{// menu items 
					items.map((item, i) => (
						<Menu.Item
							as="a"
							key={i}
							active={item.active}
							title={collapse ? item.title : ''}
							onClick={() => onMenuItemClick(i, isMobile)}
							style={i === 0 ? menuItem : {}}
						>
							<span>
								<Icon
									name={item.icon || 'folder'}
								// size={collapsed ? 'big' : 'large'}
								/>
								{!collapse && item.title}
							</span>
						</Menu.Item>
					))}
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
	menuItem: {
		marginTop: 40
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
