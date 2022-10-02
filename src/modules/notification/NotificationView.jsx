import React from 'react'
import { remove, rxNotifications, rxVisible, toggleRead } from './notification'
import ListItem from './NotificationItem'
import './style.css'
import { useRxSubject } from '../../services/react'
import { arrReverse } from '../../utils/utils'
import { MOBILE, rxLayout } from '../../services/window'
import { Button } from 'semantic-ui-react'
import { ButtonGroup } from '../../components/buttons'
import modalService from '../../services/modal'
import { translated } from '../../utils/languageHelper'

const textsCap = translated(
	{
		btnDelete: 'delete all',
		btnRead: 'mark all as read',
	},
	true
)[1]
export default React.memo(() => {
	const [visible] = useRxSubject(rxVisible, visible => {
		const { classList } = document.body
		classList[visible ? 'add' : 'remove']('notification-visible')

		// on mobile view scroll to bottom (first item) of the list
		const shouldScroll =
			visible &&
			rxLayout.value === MOBILE &&
			!window._notification_scroll_done
		if (shouldScroll) {
			window._notification_scroll_done = true
			const containerEl = document.querySelector('.notification-list')
			setTimeout(
				() => containerEl.scroll(0, containerEl.offsetHeight),
				50
			)
		}
		return visible
	})
	const [items] = useRxSubject(rxNotifications, map => {
		const isMobile = rxLayout.value === MOBILE
		const items = Array.from(map)
			//// dummy notifications for testing only
			.concat(
				[
					// {
					//     from: 'jackie',
					//     type: 'task',
					//     childType: 'invoiced',
					//     message: 'this is a test message',
					//     data: {
					//         ownerAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
					//         taskId: '0x00',
					//         taskTitle: 'dummy task'
					//     },
					//     tsCreated: new Date().toISOString(),
					//     deleted: false,
					//     read: false,
					// },
					// {
					//     from: 'jackie',
					//     type: 'task',
					//     childType: 'invitation',
					//     message: 'this is a test message',
					//     data: {},
					//     tsCreated: new Date().toISOString(),
					//     deleted: false,
					//     read: false,
					// },
				].map((n, id) => [`${id}`, n])
			)
			.map(([id, notification]) => (
				<ListItem
					{...{
						id,
						key: id + notification.read,
						notification,
					}}
				/>
			))
		return arrReverse(items, isMobile)
	})

	const buttons = [
		{
			basic: true,
			compact: true,
			content: textsCap.btnDelete,
			icon: 'trash',
			key: 'all',
			labelPosition: 'left',
			onClick: () =>
				modalService.confirm({
					confirmButton: {
						content: textsCap.btnDelete,
						negative: true,
					},
					onConfirm: () =>
						remove(
							Array.from(rxNotifications.value).map(([id]) => id)
						),
					size: 'mini',
				}),
		},
		{
			basic: true,
			compact: true,
			content: textsCap.btnRead,
			icon: 'envelope open',
			key: 'all',
			labelPosition: 'right',
			onClick: () =>
				modalService.confirm({
					confirmButton: {
						content: textsCap.btnRead,
						positive: true,
					},
					onConfirm: () =>
						Array.from(rxNotifications.value).map(
							([id, { read }]) => !read && toggleRead(id, true)
						),
					size: 'mini',
				}),
		},
	]

	return (
		<div className='notification-list'>
			{visible && (
				<ButtonGroup
					{...{
						buttons,
						className: 'actions',
						fluid: true,
					}}
				/>
			)}
			{visible && items}
		</div>
	)
})
