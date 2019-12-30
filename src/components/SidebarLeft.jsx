import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { Icon, Menu, Sidebar } from 'semantic-ui-react'

export default class SidebarLeft extends ReactiveComponent {

	handleToggle = () => {
		const { collapsed, isMobile, onSidebarToggle, visible } = this.props
		isMobile ? onSidebarToggle(!visible, false) : onSidebarToggle(true, !collapsed)
	}

	render() {
		const { collapsed, isMobile, items, onMenuItemClick, onSidebarToggle, visible } = this.props
		// force open sidebar if no item is active
		const allInactive = items.every(({ active }) => !active)
		const collapse = allInactive ? false : collapsed
		return (
			<Sidebar
				as={Menu}
				animation={isMobile ? 'overlay' : 'push'}
				direction="left"
				vertical
				visible={allInactive ? true : visible}
				width={collapse ? 'very thin' : 'wide'}
				color="black"
				inverted
				style={isMobile ? (collapse ? styles.collapsed : styles.expanded) : {}}
				onHide={() => !allInactive && isMobile && onSidebarToggle(false, false)}
			>
				{/* show sidebar toggle when not on mobile */}
				<Menu.Item
					style={styles.sidebarToggleWrap}
					onClick={allInactive ? undefined : this.handleToggle}
				>
					<div
						style={styles.sidebarToggle}
						position="right"
						title={this.props.collapsed ? 'Expand' : 'Collapse'}
						style={styles.sidebarToggle}
					>
						<span>
							<Icon name={`arrow alternate circle ${collapse ? 'right' : 'left'} outline`} />
							{collapse ? '' : ' Close sidebar'}
						</span>
					</div>
				</Menu.Item>

				{// menu items 
					items.map((item, i) => item.hidden ? '' : (
						<Menu.Item
							as="a"
							key={i}
							active={item.active}
							title={collapse ? item.title : ''}
							onClick={() => onMenuItemClick(i)}
							style={i === 0 ? styles.menuItem : {}}
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
	items: PropTypes.arrayOf(PropTypes.shape({
		active: PropTypes.bool.isRequired,
		content: PropTypes.any,
		// props to be supplied to content, if content is an element
		contentProps: PropTypes.object,
		elementRef: PropTypes.any.isRequired,
		icon: PropTypes.oneOfType([
			PropTypes.string,
			PropTypes.object,
		]),
		header: PropTypes.oneOfType([
			PropTypes.element,
			PropTypes.node,
			PropTypes.string,
		]),
		name: PropTypes.string.isRequired,
		subHeader: PropTypes.oneOfType([
			PropTypes.element,
			PropTypes.node,
			PropTypes.string,
		]),
		subHeaderDetails: PropTypes.oneOfType([
			PropTypes.element,
			PropTypes.node,
			PropTypes.string,
		]),
		title: PropTypes.oneOfType([
			PropTypes.element,
			PropTypes.node,
			PropTypes.string,
		]).isRequired,
	})),
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
		//   active: true,
		//   content: 'This is a sample',
		//   elementRef: React.createRef()
		//   icon: 'warning sign',
		//	 name: 'unique-identifier'
		//   header: 'Sample Content Header',
		//   subHeader: 'Sample content subheader',
		//   subHeaderDetails: 'Sample subheader details',
		//   title: 'Menu item title',
		// }
	],
	visible: true
}

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
		// height: '100%',
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
