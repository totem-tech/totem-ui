import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Icon, Label, Menu, Sidebar } from 'semantic-ui-react'
import ContentSegment from './ContentSegment'
import { allInactiveBond, getItem, setActive, sidebarItems, toggleActive } from '../services/sidebar'
import { isBond, isFn } from '../utils/utils'

export default class SidebarLeft extends Component {

	componentWillMount = () => allInactiveBond.tie(allInactive => this.setState({ allInactive }))

	handleToggle = () => {
		const { collapsed, isMobile, onSidebarToggle, visible } = this.props
		isMobile ? onSidebarToggle(!visible, false) : onSidebarToggle(true, !collapsed)
	}

	handleItemToggle = name => {
		const { isMobile, onSidebarToggle } = this.props
		const { active } = toggleActive(name) || {}
		isMobile && active && onSidebarToggle(false, false)
	}

	render() {
		const { collapsed, isMobile, onSidebarToggle, visible } = this.props
		const { allInactive } = this.state
		// force open sidebar if no item is active
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
					sidebarItems.map(({ name }, i) => (
						<SidebarMenuItem
							{...{
								key: i + name,
								name,
								onClick: () => this.handleItemToggle(name),
								sidebarCollapsed: collapse,
								style: i === 0 ? styles.menuItem : undefined
							}}
						/>
					))}
			</Sidebar>
		)
	}
}

SidebarLeft.propTypes = {
	collapsed: PropTypes.bool,
	isMobile: PropTypes.bool,
	// items: PropTypes.arrayOf(PropTypes.shape({
	// 	active: PropTypes.bool.isRequired,
	// 	badge: PropTypes.any,
	// 	content: PropTypes.any,
	// 	// props to be supplied to content, if content is an element
	// 	contentProps: PropTypes.object,
	// 	// elementRef: PropTypes.any.isRequired,
	// 	icon: PropTypes.oneOfType([
	// 		PropTypes.string,
	// 		PropTypes.object,
	// 	]),
	// 	header: PropTypes.oneOfType([
	// 		PropTypes.element,
	// 		PropTypes.node,
	// 		PropTypes.string,
	// 	]),
	// 	name: PropTypes.string.isRequired,
	// 	subHeader: PropTypes.oneOfType([
	// 		PropTypes.element,
	// 		PropTypes.node,
	// 		PropTypes.string,
	// 	]),
	// 	subHeaderDetails: PropTypes.oneOfType([
	// 		PropTypes.element,
	// 		PropTypes.node,
	// 		PropTypes.string,
	// 	]),
	// 	title: PropTypes.oneOfType([
	// 		PropTypes.element,
	// 		PropTypes.node,
	// 		PropTypes.string,
	// 	]).isRequired,
	// })),
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

export class SidebarItemContent extends Component {
	componentWillMount() {
		const { name } = this.props
		const { bond } = getItem(name) || {}
		if (!isBond(bond)) return
		this.tieId = bond.tie(() => this.forceUpdate())
	}

	componentWillUnmount = () => this.tieId && this.props.bond.untie(this.tieId)

	render() {
		const item = getItem(this.props.name)
		if (!item) return ''
		const { active, elementRef, hidden, name } = item
		return (
			<div
				ref={elementRef}
				key={name}
				hidden={!active || hidden}
				style={styles.spaceBelow}
			>
				{!active || hidden ? '' : (
					<ContentSegment {...item} onClose={name => setActive(name, false)} />
				)}
			</div>
		)
	}
}

class SidebarMenuItem extends Component {
	componentWillMount() {
		const { name } = this.props
		const { bond } = getItem(name) || {}
		if (!isBond(bond)) return
		this.tieId = bond.tie(() => this.forceUpdate())
	}

	componentWillUnmount = () => this.tieId && this.props.bond.untie(this.tieId)

	render() {
		const { name, onClick, sidebarCollapsed: collapse, style } = this.props
		const item = getItem(name)
		if (!item) return ''

		const { active, badge, hidden, icon, title } = item
		return hidden ? '' : (
			<Menu.Item {...{ as: "a", active, onClick, style, title }}>
				{badge && <Label color='red'>{badge}</Label>}
				<span>
					<Icon {...{
						name: icon || 'folder',
						color: badge && collapse ? 'red' : undefined,
					}} />
					{!collapse ? item.title : ''}
				</span>
			</Menu.Item>
		)
	}
}

SidebarMenuItem.propTypes = {
	sidebarCollapsed: PropTypes.bool,
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
	},
	spaceBelow: {
		marginBottom: 15
	}
}
