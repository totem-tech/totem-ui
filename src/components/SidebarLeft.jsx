import React, { Component, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Icon, Label, Menu, Sidebar } from 'semantic-ui-react'
import ContentSegment from './ContentSegment'
import { isSubjectLike, isFn } from '../utils/utils'
import { translated } from '../services/language'
import {
	rxAllInactive, getItem, setActive, setSidebarState,
	sidebarItems, rxSidebarState, scrollTo, toggleActive, toggleSidebarState
} from '../services/sidebar'
import { rxLayout, MOBILE } from '../services/window'
import { useRxSubject } from '../services/react'
import { unsubscribe } from '../utils/reactHelper'

const [_, textsCap] = translated({
	closeSidebar: 'close sidebar',
}, true)
export default function SidebarLeft() {
	const [allInactive] = useRxSubject(rxAllInactive)
	const [isMobile] = useRxSubject(rxLayout, l => l === MOBILE)
	const [sidebarState] = useRxSubject(rxSidebarState)
	let { collapsed = false, visible = false } = sidebarState
	collapsed = allInactive ? false : collapsed
	visible = allInactive ? true : visible

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
				style={(collapsed ? styles.collapsed : styles.expanded)}
				onHidden={() => isMobile && setSidebarState(false, false)}
			>
				<Menu.Item
					style={styles.sidebarToggleWrap}
					onClick={toggleSidebarState}
				>
					<div
						position="right"
						style={styles.sidebarToggle}
						title={collapsed ? 'Expand' : 'Collapse'}
					>
						<span>
							<Icon name={`arrow alternate circle ${collapsed ? 'right' : 'left'} outline`} />
							{!collapsed && ` ${textsCap.closeSidebar}`}
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

export const MainContentItem = props => {
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

	return !show
		? ''
		: (
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
MainContentItem.propTypes = {
	name: PropTypes.string.isRequired,
	// RxJS subject
	rxTrigger: PropTypes.object.isRequired,
}

const SidebarMenuItem = props => {
	let { isMobile, name, rxTrigger, sidebarCollapsed, style } = props
	const [item, setItem] = useRxSubject(rxTrigger, () => getItem(name))
	const {
		active,
		anchorStyle,
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
			<Menu.Item {...{
				as: 'a',
				active,
				href,
				style: {
					...style,
					...anchorStyle,
				},
				target,
				title,
				onClick: e => {
					if (isFn(onClick)) onClick(e, item)
					
					if (href) return

					e.stopPropagation()
					if (e.shiftKey && getItem(name).active) return scrollTo(name)
					const { active } = toggleActive(name)
					setItem({ ...item, active })
					active && isMobile && toggleSidebarState()
				},
			}}>
				{badge && <Label color='red'>{badge}</Label>}
				<span>
					<Icon {...{
						name: icon || 'folder',
						color: badge && sidebarCollapsed ? 'red' : undefined,
					}} />
					{!sidebarCollapsed ? item.title : ''}
				</span>
			</Menu.Item>
		)
}
SidebarMenuItem.propTypes = {
	isMobile: PropTypes.bool.isRequired,
	name: PropTypes.string.isRequired,
	// RxJS subject
	rxTrigger: PropTypes.object.isRequired,
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
