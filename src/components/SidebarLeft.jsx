import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Icon, Label, Menu, Sidebar } from 'semantic-ui-react'
import ContentSegment from './ContentSegment'
import { isBond } from '../utils/utils'
import { translated } from '../services/language'
import {
	allInactiveBond, getItem, setActive, setSidebarState,
	sidebarItems, sidebarStateBond, toggleActive, toggleSidebarState
} from '../services/sidebar'

const [texts] = translated({
	closeSidebar: 'Close sidebar',
})
export default class SidebarLeft extends Component {
	componentWillMount = () => {
		sidebarStateBond.tie(s => this.setState(s))
		allInactiveBond.tie(allInactive => setTimeout(() => this.setState({ allInactive }), 500))
	}

	render() {
		const { isMobile } = this.props
		const { allInactive, collapsed: c, visible: v } = this.state
		// if (allInactive) {
		const collapsed = allInactive ? false : c
		const visible = allInactive ? true : v
		// }
		return (
			<React.Fragment>
				{
					// use an alternative dimmer to prevent unnecessary state updates on App.jsx and the entire application
					isMobile && visible && <div style={styles.dimmer} onClick={toggleSidebarState}></div>
				}
				<Sidebar
					as={Menu}
					animation={isMobile ? 'overlay' : 'push'}
					direction="left"
					vertical
					visible={visible}
					width={collapsed ? 'very thin' : 'wide'}
					color="black"
					inverted
					style={collapsed ? styles.collapsed : styles.expanded}
					onHidden={() => isMobile && setSidebarState(false, false)}
				>
					<Menu.Item
						style={styles.sidebarToggleWrap}
						onClick={toggleSidebarState}
					>
						<div
							style={styles.sidebarToggle}
							position="right"
							title={collapsed ? 'Expand' : 'Collapse'}
							style={styles.sidebarToggle}
						>
							<span>
								<Icon name={`arrow alternate circle ${collapsed ? 'right' : 'left'} outline`} />
								{!collapsed && ` ${texts.closeSidebar}`}
							</span>
						</div>
					</Menu.Item>

					{// menu items 
						sidebarItems.map(({ name }, i) => (
							<SidebarMenuItem
								{...{
									key: i + name,
									isMobile,
									name,
									sidebarCollapsed: collapsed,
									style: i === 0 ? styles.menuItem : undefined
								}}
							/>
						))}
				</Sidebar>
			</React.Fragment>
		)
	}
}

SidebarLeft.propTypes = {
	isMobile: PropTypes.bool.isRequired,
}

export class SidebarItemContent extends Component {
	componentWillMount() {
		const { name } = this.props
		const { bond } = getItem(name) || {}
		if (!isBond(bond)) return
		this.bond = bond
		this.tieId = this.bond.tie(() => this.forceUpdate())
	}

	componentWillUnmount = () => this.bond && this.bond.untie(this.tieId)

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
SidebarItemContent.propTypes = {
	name: PropTypes.string.isRequired,
}

class SidebarMenuItem extends Component {
	componentWillMount() {
		const { name } = this.props
		const { bond } = getItem(name) || {}
		if (!isBond(bond)) return
		this.tieId = bond.tie(() => this.forceUpdate())
	}

	componentWillUnmount = () => this.tieId && this.props.bond.untie(this.tieId)

	handleClick = e => {
		e.stopPropagation()
		const { isMobile, name } = this.props
		const { active } = toggleActive(name)
		active && isMobile && toggleSidebarState()
	}

	render() {
		const { name, sidebarCollapsed: collapse, style } = this.props
		const item = getItem(name)
		if (!item) return ''

		const { active, badge, hidden, icon, title } = item
		return hidden ? '' : (
			<Menu.Item {...{ as: "a", active, onClick: this.handleClick, style, title }}>
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
	isMobile: PropTypes.bool.isRequired,
	name: PropTypes.string.isRequired,
	sidebarCollapsed: PropTypes.bool.isRequired,
	style: PropTypes.object,
}

const styles = {
	collapsed: {
		overflowX: 'hidden',
		width: 60,
	},
	dimmer: {
		display: 'block',
		position: 'absolute',
		background: 'rgba(0, 0, 0, 0.84)',
		height: '100%',
		width: '100%',
		zIndex: 3,
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
