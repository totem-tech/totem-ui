import React, { useEffect } from 'react'
import { Image, Segment, Sidebar } from 'semantic-ui-react'
// Components
import ErrorBoundary from './components/CatchReactErrors'
import Invertible from './components/Invertible'
import PageHeader from './components/PageHeader'
import SidebarLeft, { MainContentItem } from './components/SidebarLeft'
// Services
import blockchain from './services/blockchain'
import chatClient from './modules/chat/ChatClient'
import currency from './services/currency'
import identity from './modules/identity/identity'
import language from './services/language'
import modal, { ModalsConainer } from './services/modal'
import NotificationView from './modules/notification/NotificationView'
import partner from './modules/partner/partner'
import activity from './modules/activity/activity'
import queue, { resumeQueue } from './services/queue'
import sidebar, { sidebarItems } from './services/sidebar'
import storage from './services/storage'
import timeKeeping from './modules/timekeeping/timekeeping'
import toast, { ToastsContainer } from './services/toast'
import windw, { rxGridColumns, rxLayout, MOBILE } from './services/window'
// Utils
import convert from './utils/convert'
import DataStorage from './utils/DataStorage'
import naclHelper from './utils/naclHelper'
import polkadotHelper from './utils/polkadotHelper'
import validator from './utils/validator'
// Images
import TotemButtonLogo from './assets/totem-button-grey.png'
import PlaceholderImage from './assets/totem-placeholder.png'
import ChatBar from './modules/chat/ChatBar'
import PromisE from './utils/PromisE'
import { useRxSubject } from './services/react'

let queueResumed = false

export default function App() {
	const [isMobile] = useRxSubject(rxLayout, l => l === MOBILE)
	const [numCol] = useRxSubject(rxGridColumns)
	const logoSrc = TotemButtonLogo

	useEffect(() => {
		// For debug only.
		window.utils = {
			convert,
			naclHelper,
			polkadotHelper,
			PromisE: PromisE,
			validator,
		}
		window.DataStorage = DataStorage
		window.services = {
			activity,
			blockchain,
			chatClient,
			currency,
			identity,
			language,
			modal,
			partner,
			queue,
			sidebar,
			storage,
			timeKeeping,
			toast,
			window: windw,
		}

		window.queryBlockchain = async (func, args, multi) => await blockchain.query(func, args, multi, true)
		queryBlockchain().then(api => window.api = api)

		if (!queueResumed) {
			// resume any incomplete queued tasks 
			queueResumed = true
			setTimeout(() => resumeQueue(), 1000)
		}
		return () => { }
	}, [])

	return (
		<div className='wrapper'>
			<ModalsConainer />
			<ToastsContainer />
			<ErrorBoundary>
				<PageHeader logoSrc={logoSrc} />
			</ErrorBoundary>

			<ErrorBoundary>
				<NotificationView />
			</ErrorBoundary>

			<Sidebar.Pushable style={styles.pushable}>
				<ErrorBoundary>
					<SidebarLeft />
				</ErrorBoundary>

				<Sidebar.Pusher
					as={Invertible.asCallback(Segment)}
					className="main-content"
					dimmed={false}
					id="main-content"
					// fluid
					style={{
						...styles.mainContent,
						padding: isMobile ? '0 0 35px 0' : '15px 15px 0',
						...getGridStyle(numCol),
					}}
				>
					{sidebarItems.map(({ name }, i) => <MainContentItem key={i + name} name={name} />)}
					<div className='empty-message'>
						<Image style={{ margin: '100px auto auto' }} src={PlaceholderImage} />
					</div>
				</Sidebar.Pusher>
			</Sidebar.Pushable>
			<ChatBar {...{ isMobile, inverted: false }} />
		</div>
	)
}

const getGridStyle = (numCol = 1) => numCol <= 1 ? {} : {
	display: 'grid',
	gridTemplateColumns: `repeat(${numCol}, 1fr)`,
	gridGap: '15px',
	gridAutoRows: 'auto',
}
const styles = {
	mainContent: {
		borderRadius: 0,
		height: '100%',
		margin: 0,
		overflow: 'hidden auto',
		scrollBehavior: 'smooth',
		transition: 'resize 0.3s ease',
		WebkitOverflow: 'hidden auto',
	},

}


