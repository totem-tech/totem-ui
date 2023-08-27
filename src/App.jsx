import React, { useEffect } from 'react'
import { Segment, Sidebar } from 'semantic-ui-react'
// Assets
import { TotemButtonLogo } from './assets'
// Components
import ErrorBoundary from './components/CatchReactErrors'
import { Invertible } from './components/Invertible'
import PageHeader from './components/PageHeader'
import SidebarLeft, { MainContentItem } from './components/SidebarLeft'
// Services
import activity from './modules/activity/activity'
import ChatBar from './modules/chat/ChatBar'
import currency from './modules/currency/currency'
import { generatePassword } from './modules/gettingStarted'
import identity from './modules/identity/identity'
import NotificationView from './modules/notification/NotificationView'
import partner from './modules/partner/partner'
import timeKeeping from './modules/timekeeping/timekeeping'
//services
import blockchain from './services/blockchain'
import './services/KeyboardShortcuts'
import filePaths from './services/languageFiles'
import modal from './services/modal'
import queue from './services/queue'
import sidebar, { sidebarItems } from './services/sidebar'
import toast from './services/toast'
// utils
import chatClient from './utils/chatClient'
import language, { translated } from './utils/languageHelper'
import storage from './utils/storageHelper'
import { className } from './utils/utils'
import { messages, setMessages } from './utils/validator'
import windowService, { rxGridColumns, gridClasses } from './utils/window'
import './utils/reactjs/printElement.js'

// translate default error messages
setMessages(translated(messages, true)[1])
window.timer = require('./modules/timekeeping/Timer').default

export default function App() {
	useEffect(() => {
		// For debug only.
		const isProd = window.location.host === 'totem.live'
		if (!isProd) {
			window.BehaviorSubject = require('rxjs').BehaviorSubject
			window.DataStorage = require('./utils/DataStorage')
			window.services = {
				activity,
				blockchain,
				chat: require('./utils/chatClient'),
				chatClient,
				currency,
				history: require('./modules/history/history'),
				identity,
				language,
				modal,
				partner,
				queue,
				sidebar,
				storage,
				task: require('./modules/task/task'),
				timeKeeping,
				toast,
				window: windowService,
			}
			window.utils = {
				convert: require('./utils/convert'),
				generatePassword,
				naclHelper: require('./utils/naclHelper'),
				polkadotHelper: require('./utils/polkadotHelper'),
				PromisE: require('./utils/PromisE').default,
				rx: require('./utils/rx'),
				time: require('./utils/time'),
				utils: require('./utils/utils'),
				validator: require('./utils/validator'),
			}
		}

		window.queryBlockchain = (func, args, multi, print = true) => blockchain.query(
			func,
			args,
			multi,
			print,
		)

		queryBlockchain().then(api => (window.api = api))

		// make sure all notification handlers are imported
		filePaths
			.filter(path => path.includes('/notificationHandlers.js'))
			.forEach(path => require(`./${path.replace('./src/', '')}`))
	}, [])
	const gridClass = gridClasses[rxGridColumns.value - 1]

	return (
		<div className='wrapper'>
			<ErrorBoundary>
				<PageHeader logoSrc={TotemButtonLogo} />
			</ErrorBoundary>

			<ErrorBoundary>
				<NotificationView />
			</ErrorBoundary>

			<Sidebar.Pushable>
				<ErrorBoundary>
					<SidebarLeft />
				</ErrorBoundary>

				<Sidebar.Pusher
					as={Invertible.asComponent(Segment)}
					className={className([
						'main-content',
						gridClass,
						{ 'simple-grid': !!gridClass },
					])}
					dimmed={false}
					id='main-content'
				>
					{sidebarItems.map(({ name, rxTrigger }, i) => (
						<MainContentItem {...{
							key: i + name,
							name,
							rxTrigger,
						}} />
					))}
					<div className='empty-message'>
						{/* <Image style={{ margin: '100px auto auto' }} src={PlaceholderImage} /> */}
					</div>
				</Sidebar.Pusher>
			</Sidebar.Pushable>
			<ChatBar />
		</div>
	)
}
