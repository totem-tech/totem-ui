import React, { Component, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Icon, Label, Menu, Sidebar } from 'semantic-ui-react'
import ContentSegment from './ContentSegment'
import { isBond } from '../utils/utils'
import { translated } from '../services/language'
import {
	allInactiveBond, getItem, setActive, setSidebarState,
	sidebarItems, sidebarStateBond, scrollTo, toggleActive, toggleSidebarState
} from '../services/sidebar'
import { rxLayout, MOBILE } from '../services/window'
import { unsubscribe, useRxSubject } from '../services/react'

const [_, textsCap] = translated({
	closeSidebar: 'close sidebar',
}, true)
export default class SidebarLeft extends Component {
	componentWillMount = () => {
		sidebarStateBond.tie(s => this.setState(s))
		allInactiveBond.tie(allInactive => setTimeout(() => this.setState({ allInactive }), 500))
	}

	render() {
		const { isMobile } = this.props
		const { allInactive, collapsed: c, visible: v } = this.state
		const collapsed = allInactive ? false : c
		const visible = allInactive ? true : v
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
								{!collapsed && ` ${textsCap.closeSidebar}`}
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

export const MainContentItem = props => {
	const [item, setItem] = useState(getItem(props.name) || {})
	const [isMobile] = useRxSubject(rxLayout, true, layout => layout === MOBILE)
	useEffect(() => {
		let mounted = true
		const { name } = item
		const { bond } = getItem(name) || {}
		const tieId = isBond(bond) && bond.tie(() => mounted && setItem({ ...getItem(props.name) }))

		return () => {
			mounted = false
			tieId && bond.untie(tieId)
		}
	}, [item])

	const { active, elementRef, hidden, name } = item
	const show = active && !hidden
	item.style = {
		...item.style,
		height: '100%',
		padding: !isMobile ? undefined : '0 15px',
	}
	return !show ? '' : (
		<div
			hidden={!show}
			key={name}
			style={styles.spaceBelow}
			ref={elementRef}
			name={name}
		>
			<ContentSegment {...item} onClose={name => setActive(name, false)} />
		</div>
	)
}
MainContentItem.propTypes = {
	name: PropTypes.string.isRequired,
}

class SidebarMenuItem extends Component {
	componentWillMount() {
		const { name } = this.props
		const { bond } = getItem(name) || {}
		if (!isBond(bond)) return
		this.tieId = bond.tie(() => this.forceUpdate())
	}

	componentWillUnmount = () => this.props.bond && this.props.bond.untie(this.tieId)

	handleClick = e => {
		const { isMobile, name } = this.props
		e.stopPropagation()
		if (e.shiftKey && getItem(name).active) return scrollTo(name)
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
