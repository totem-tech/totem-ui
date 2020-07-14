import React from 'react'
import { Container, Dimmer, Image, Loader, Menu, Sidebar } from 'semantic-ui-react'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import {
	calls, runtime, chain, system, runtimeUp,
	secretStore, metadata, nodeService
} from 'oo7-substrate'

// Components
import ErrorBoundary from './components/CatchReactErrors'
import PageHeader from './components/PageHeader'
import SidebarLeft, { MainContentItem } from './components/SidebarLeft'
// Services
import blockchain from './services/blockchain'
import chatClient from './services/chatClient'
import identity from './services/identity'
import language, { translated } from './services/language'
import modal, { ModalsConainer } from './services/modal'
import NotificationList from './modules/notification/List'
import partner from './services/partner'
import project from './services/project'
import queue, { resumeQueue } from './services/queue'
import sidebar, { sidebarItems, sidebarStateBond } from './services/sidebar'
import storage from './services/storage'
import timeKeeping from './services/timeKeeping'
import toast, { ToastsContainer } from './services/toast'
import windw from './services/window'
// Utils
import DataStorage from './utils/DataStorage'
import naclHelper from './utils/naclHelper'
import polkadotHelper from './utils/polkadotHelper'
// Images
import TotemButtonLogo from './assets/totem-button-grey.png'
import PlaceholderImage from './assets/totem-placeholder.png'
import ChatBar from './modules/chat/ChatBar'
import { className } from './utils/utils'

const [texts] = translated({
	failedMsg: 'Connection failed! Please check your internet connection.',
	connectingMsg: 'Connecting to Totem blockchain network...',
})

export class App extends ReactiveComponent {
	constructor() {
		super([], {
			// ensureRuntime: runtimeUp,
			isMobile: windw.layoutBond.map(layout => layout === 'mobile'),
			numCol: windw.gridColumnsBond,
		})
		this.state = {
			sidebarCollapsed: false,
			sidebarVisible: windw.getLayout() !== 'mobile',
			status: {}
		}

		// nodeService().status.notify(() => {
		// 	const status = nodeService().status._value
		// 	// prevent unnecessary state update
		// 	if (this.state.status.error && status.error) return
		// 	this.setState({ status })
		// })

		// For debug only.
		window.utils = {
			naclHelper,
			polkadotHelper,
		}
		window.runtime = runtime
		window.secretStore = secretStore
		window.chain = chain
		window.calls = calls
		window.system = system
		window.that = this
		window.metadata = metadata
		window.Bond = Bond
		window.DataStorage = DataStorage
		window.services = {
			blockchain,
			chatClient,
			identity,
			language,
			modal,
			partner,
			project,
			queue,
			sidebar,
			storage,
			timeKeeping,
			toast,
			window: windw,
		}

		blockchain.getConnection().then(({ api }) => window.api = api)
		window.queryBlockchain = async (func, args) => await blockchain.query(func, args, true)
	}

	// unused
	// hack to format as a currency. Needs to go in a seperate Display Formatting Utilities file.
	round(value, decimals) {
		return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals).toFixed(decimals)
	}

	handleSidebarToggle = (v, c) => this.setState({ sidebarVisible: v, sidebarCollapsed: c })

	unreadyRender() {
		const { status } = this.state
		return (
			<Dimmer active style={{ height: '100%', position: 'fixed' }}>
				{!!status.error ? texts.failedMsg : <Loader indeterminate>{texts.connectingMsg}</Loader>}
			</Dimmer>
		)
	}

	render() {//readyRender
		const { isMobile, numCol } = this.state
		const logoSrc = TotemButtonLogo
		const { collapsed, visible } = sidebarStateBond._value
		if (!this.resumed) {
			// resume any incomplete queued tasks 
			this.resumed = true
			setTimeout(() => resumeQueue(), 1000)
		}

		return (
			<div className={className({
				wrapper: true,
				mobile: isMobile,
				desktop: !isMobile,
				'sidebar-collapsed': collapsed,
				'sidebar-visible': visible,
			})}>
				<ModalsConainer />
				<ToastsContainer isMobile={isMobile} />
				<ErrorBoundary>
					<PageHeader {...{ logoSrc, isMobile }} />
				</ErrorBoundary>

				<ErrorBoundary>
					<NotificationList inline={false} />
				</ErrorBoundary>

				<Sidebar.Pushable style={styles.pushable}>
					<ErrorBoundary>
						<SidebarLeft isMobile={isMobile} />
					</ErrorBoundary>

					<Sidebar.Pusher
						as={Container}
						className="main-content"
						dimmed={false}
						id="main-content"
						fluid
						style={{
							...styles.mainContent,
							paddingBottom: isMobile ? 55 : 15,
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
}

const getGridStyle = (numCol = 1) => numCol <= 1 ? {} : {
	display: 'grid',
	gridTemplateColumns: `repeat(${numCol}, 1fr)`,
	gridGap: '15px',
	gridAutoRows: 'auto',
}
const styles = {
	mainContent: {
		overflow: 'hidden auto',
		WebkitOverflow: 'hidden auto',
		height: '100%',
		scrollBehavior: 'smooth',
		padding: 15,
	},
	pushable: {
		margin: 0,
		height: 'calc(100% - 59px)',
		overflow: 'hidden',
		WebkitOverflow: 'hidden',
	},

}


