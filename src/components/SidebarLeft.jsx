import React, { Component, useCallback, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Icon, Label, Menu, Sidebar } from 'semantic-ui-react'
import { deferred, isFn } from '../utils/utils'
import { translated } from '../services/language'
import { useRxSubject } from '../services/react'
import {
	rxAllInactive, getItem, setActive, setSidebarState,
	sidebarItems, rxSidebarState, scrollTo, toggleActive, toggleSidebarState, setActiveExclusive
} from '../services/sidebar'
import { rxLayout, MOBILE } from '../services/window'
import ContentSegment from './ContentSegment'
import Holdable from './Holdable'

const [_, textsCap] = translated({
	closeSidebar: 'close sidebar',
	keepOpen: 'keep open'
}, true)
function SidebarLeft() {
	const [allInactive] = useRxSubject(rxAllInactive)
	const [isMobile] = useRxSubject(rxLayout, l => l === MOBILE)
	const [sidebarState] = useRxSubject(rxSidebarState)
	const [hovered, setHovered] = useState(false)
	let { collapsed = false, visible = false } = sidebarState
	collapsed = !hovered && !allInactive && collapsed
	visible = allInactive || visible

	const _setHovered = useCallback(
		deferred(hovered => sidebarState.collapsed && setHovered(hovered), 100),
		[setHovered, sidebarState.collapsed],
	)
	const icon = hovered 
		? 'pin'
		: `arrow alternate circle ${collapsed ? 'right' : 'left'} outline`
	
	return (
		<React.Fragment>
			{
				// use an alternative dimmer to prevent unnecessary state updates on App.jsx and the entire application
				isMobile && visible && (
					<div {...{
						onClick: toggleSidebarState,
						style: styles.dimmer
					}} />
				)
			}
			<Sidebar {...{
				as: Menu,
				animation: isMobile ? 'overlay' : 'push',
				direction: 'left',
				vertical: true,
				visible,
				width: collapsed ? 'very thin' : 'wide',
				color: 'black',
				inverted: true,
				style: collapsed ? styles.collapsed : styles.expanded,
				onHidden: () => isMobile && setSidebarState(false, false),
				onMouseEnter: () => _setHovered(true),
				onMouseLeave: () => _setHovered(false),
			}}>
				<Menu.Item
					style={styles.sidebarToggleWrap}
					onClick={() => {
						toggleSidebarState()
						sidebarState.collapsed && setHovered(false)
					}}
				>
					<div
						position='right'
						style={styles.sidebarToggle}
						title={collapsed ? 'Expand' : 'Collapse'}
					>
						<span>
							<Icon name={icon} />
							{!collapsed && ` ${hovered ? textsCap.keepOpen : textsCap.closeSidebar}`}
						</span>
					</div>
				</Menu.Item>

				{// menu items 
					sidebarItems.map(({ name, rxTrigger }, i) => (
						<SidebarMenuItem {...{
							key: i + name,
							isMobile,
							name,
							rxTrigger,
							sidebarCollapsed: collapsed,
							style: i === 0 ? styles.menuItem : undefined
						}} />
					))}
			</Sidebar>
		</React.Fragment>
	)
}
export default React.memo(SidebarLeft)

const _MainContentItem = props => {
	const { name, rxTrigger } = props
	const [isMobile] = useRxSubject(rxLayout, layout => layout === MOBILE)
	const [item] = useRxSubject(rxTrigger, () => getItem(name))
	const { active, elementRef, hidden } = item || {}
	const show = !!item && active && !hidden
	item.style = {
		...item.style,
		height: '100%',
		padding: !isMobile
			? undefined
			: '0 15px',
	}

	return !show ? '' : (
		<div
			key={name}
			style={styles.spaceBelow}
			ref={elementRef}
			name={name}
		>
			<ContentSegment {...item} onClose={name => setActive(name, false)} />
		</div>
	)
}
_MainContentItem.propTypes = {
	name: PropTypes.string.isRequired,
	// RxJS subject
	rxTrigger: PropTypes.object.isRequired,
}
export const MainContentItem = React.memo(_MainContentItem)

const _SidebarMenuItem = props => {
	let { name, rxTrigger, sidebarCollapsed, style } = props
	const [item, setItem] = useRxSubject(rxTrigger, () => getItem(name))
	const {
		active,
		anchorStyle,
		anchorStyleActive,
		badge,
		hidden,
		href,
		icon,
		onClick,
		target,
		title,
	} = item || {}

	
	return !item || hidden
		? ''
		: (
			<Holdable {...{
				as: 'a',
				active,
				El: Menu.Item,
				href,
				onClick: e => {
					if (isFn(onClick)) onClick(e, item)
					
					if (href) return

					e.stopPropagation()
					if (e.shiftKey && getItem(name).active) {
						rxLayout.value === MOBILE && toggleSidebarState()
						return scrollTo(name)
					}
					const { active } = toggleActive(name)
					setItem({ ...item, active })
				},
				onHold: e => e.stopPropagation() | setActiveExclusive(name, true),
				style: {
					...style,
					...anchorStyle,
					...active && anchorStyleActive,
				},
				target,
				title,
			}}>
				{badge && <Label color='red'>{badge}</Label>}
				<span>
					<Icon {...{
						name: icon || 'folder',
						color: badge && sidebarCollapsed ? 'red' : undefined,
					}} />
					{!sidebarCollapsed ? item.title : ''}
				</span>
			</Holdable>
		)
}
_SidebarMenuItem.propTypes = {
	isMobile: PropTypes.bool.isRequired,
	name: PropTypes.string.isRequired,
	// RxJS subject
	rxTrigger: PropTypes.object.isRequired,
	sidebarCollapsed: PropTypes.bool.isRequired,
	style: PropTypes.object,
}
const SidebarMenuItem = React.memo(_SidebarMenuItem)

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
