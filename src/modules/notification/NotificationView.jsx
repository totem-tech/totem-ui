import React from 'react'
import { translated } from '../../utils/languageHelper'
import { arrReverse } from '../../utils/utils'
import { ButtonGroup } from '../../components/buttons'
import { confirm } from '../../services/modal'
import { useRxSubject } from '../../utils/reactjs'
import { MOBILE, rxLayout } from '../../services/window'
import {
	remove,
	rxNotifications,
	rxVisible,
	toggleRead,
} from './notification'
import ListItem from './NotificationItem'
import './style.css'

const textsCap = translated({
	btnDelete: 'delete all',
	btnRead: 'mark all as read',
}, true)[1]

export default function NotificationView() {
	const [visible] = useRxSubject(rxVisible, visible => {
		const { classList } = document.body
		classList[visible ? 'add' : 'remove']('notification-visible')

		// on mobile view scroll to bottom (first item) of the list
		const shouldScroll = visible
			&& rxLayout.value === MOBILE
		// && !window._notification_scroll_done
		if (shouldScroll) {
			setTimeout(() => {
				const containerEl = document.querySelector('.notification-list')
				containerEl.scroll(0, containerEl.scrollHeight)//containerEl.offsetHeight)
				window._notification_scroll_done = true
			}, 100)
		}
		return visible
	})
	const [isMobile] = useRxSubject(rxLayout, l => l === MOBILE)
	const [[items, allRead]] = useRxSubject(rxNotifications, map => {
		const items = Array.from(map)
			//// dummy notifications for testing only
			// .concat(
			// 	[
			// 		{
			// 		    from: 'jackie',
			// 		    type: 'task',
			// 		    childType: 'invoiced',
			// 		    message: 'this is a test message',
			// 		    data: {
			// 		        ownerAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
			// 		        taskId: '0x00',
			// 		        taskTitle: 'dummy task'
			// 		    },
			// 		    tsCreated: new Date().toISOString(),
			// 		    deleted: false,
			// 		    read: false,
			// 		},
			// 		{
			// 		    from: 'jackie',
			// 		    type: 'task',
			// 		    childType: 'invitation',
			// 		    message: 'this is a test message',
			// 		    data: {},
			// 		    tsCreated: new Date().toISOString(),
			// 		    deleted: false,
			// 		    read: false,
			// 		},
			// 	].map((n, id) => [`${id}`, n])
			// )
			.map(([id, notification]) => (
				<ListItem {...{
					id,
					key: id + notification.read,
					notification,
				}} />
			))
		return [
			items,
			Array
				.from(map)
				.every(([_, x]) => !!x.read)
		]
	})
	const buttons = [
		{
			// basic: true,
			compact: true,
			content: textsCap.btnDelete,
			icon: 'trash',
			key: 'all',
			labelPosition: 'left',
			onClick: () => confirm({
				confirmButton: {
					content: textsCap.btnDelete,
					negative: true,
				},
				onConfirm: () => remove(
					Array
						.from(rxNotifications.value)
						.map(([id]) => id)
				),
				size: 'mini',
			}),
		},
		{
			// basic: true,
			compact: true,
			content: textsCap.btnRead,
			disabled: allRead,
			icon: 'envelope open outline',
			key: 'all',
			labelPosition: 'right',
			onClick: () => confirm({
				confirmButton: {
					content: textsCap.btnRead,
					positive: true,
				},
				onConfirm: () => Array
					.from(rxNotifications.value)
					.map(([id, { read }]) =>
						!read && toggleRead(id, true)
					),
				size: 'mini',
			}),
		},
	]

	return visible && items.length > 0 && (
		<div className='notification-list'>
			<ButtonGroup {...{
				buttons,
				className: 'actions',
				fluid: true,
			}} />
			{arrReverse(items, isMobile)}
		</div>
	)
}