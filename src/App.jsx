import React, { useEffect } from 'react'
import { Image, Segment, Sidebar } from 'semantic-ui-react'
// Components
import ErrorBoundary from './components/CatchReactErrors'
import { Invertible } from './components/Invertible'
import PageHeader from './components/PageHeader'
import SidebarLeft, { MainContentItem } from './components/SidebarLeft'
// Services
import blockchain from './services/blockchain'
import chatClient from './modules/chat/ChatClient'
import currency from './modules/currency/currency'
import identity from './modules/identity/identity'
import language from './services/language'
import filePaths from './services/languageFiles'
import modal from './services/modal'
import activity from './modules/activity/activity'
import './services/KeyboardShortcuts'
import NotificationView from './modules/notification/NotificationView'
import partner from './modules/partner/partner'
import queue, { resumeQueue } from './services/queue'
import sidebar, { sidebarItems } from './services/sidebar'
import storage from './services/storage'
import timeKeeping from './modules/timekeeping/timekeeping'
import toast from './services/toast'
import windowService, { rxGridColumns, gridClasses } from './services/window'
// Images
import TotemButtonLogo from './assets/logos/button-288-colour.png' //button-240-colour.png'

//'./assets/totem-button-grey.png'
// import PlaceholderImage from './assets/totem-placeholder.png'
import ChatBar from './modules/chat/ChatBar'
import { className } from './utils/utils'
import { generatePassword } from './modules/gettingStarted'

let queueResumed = false
const logoSrc = TotemButtonLogo

export default function App() {
	useEffect(() => {
		// For debug only.
		window.utils = {
			convert: require('./utils/convert'),
			generatePassword,
			naclHelper: require('./utils/naclHelper'),
			polkadotHelper: require('./utils/polkadotHelper'),
			PromisE: require('./utils/PromisE'),
			time: require('./utils/time'),
			utils: require('./utils/utils'),
			validator: require('./utils/validator'),
		}
		window.DataStorage = require('./utils/DataStorage')
		window.services = {
			activity,
			blockchain,
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
			timeKeeping,
			toast,
			window: windowService,
		}

		window.queryBlockchain = async (func, args, multi) =>
			await blockchain.query(func, args, multi, true)
		queryBlockchain().then(api => (window.api = api))

		if (!queueResumed) {
			// resume any incomplete queued tasks
			queueResumed = true
			setTimeout(() => resumeQueue(), 1000)
		}
		filePaths
			.filter(path => path.includes('/notificationHandlers.js'))
			.forEach(path => require(`./${path.replace('./src/', '')}`))
		return () => {}
	}, [])

	const gridClass = gridClasses[rxGridColumns.value - 1]
	return (
		<div className='wrapper'>
			<ErrorBoundary>
				<PageHeader logoSrc={logoSrc} />
			</ErrorBoundary>

			<ErrorBoundary>
				<NotificationView />
			</ErrorBoundary>

			<Sidebar.Pushable className='unregistered'>
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
