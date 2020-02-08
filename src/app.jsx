import React from 'react'
import { Container, Dimmer, Image, Loader, Sidebar } from 'semantic-ui-react'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import {
	calls, runtime, chain, system, runtimeUp,
	secretStore, metadata, nodeService
} from 'oo7-substrate'

// Components
import ErrorBoundary from './components/CatchReactErrors'
import ChatWidget from './components/ChatWidget'
import PageHeader from './components/PageHeader'
import SidebarLeft, { MainContentItem } from './components/SidebarLeft'
// Services
import chatClient from './services/chatClient'
import identity from './services/identity'
import language from './services/language'
import modal, { ModalsConainer } from './services/modal'
import partner from './services/partner'
import project from './services/project'
import queue, { resumeQueue } from './services/queue'
import sidebar, { sidebarItems, sidebarStateBond } from './services/sidebar'
import storage from './services/storage'
import timeKeeping from './services/timeKeeping'
import toast, { ToastsContainer } from './services/toast'
import { getLayout, layoutBond } from './services/window'
// Utils
import DataStorage from './utils/DataStorage'
// Images
import TotemButtonLogo from './assets/totem-button-grey.png'
import PlaceholderImage from './assets/totem-placeholder.png'

export class App extends ReactiveComponent {
	constructor() {
		super([], {
			ensureRuntime: runtimeUp,
			isMobile: layoutBond.map(layout => layout === 'mobile'),
		})
		this.state = {
			sidebarCollapsed: false,
			sidebarVisible: getLayout() !== 'mobile',
			status: {}
		}

		nodeService().status.notify(() => {
			const status = nodeService().status._value
			// prevent unnecessary state update
			if (this.state.status.error && status.error) return
			this.setState({ status })
		})

		// For debug only.
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
		}
	}

	// unused
	// hack to format as a currency. Needs to go in a seperate Display Formatting Utilities file.
	round(value, decimals) {
		return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals).toFixed(decimals)
	}

	handleSidebarToggle = (v, c) => this.setState({ sidebarVisible: v, sidebarCollapsed: c })

	unreadyRender() {
		const { status } = this.state
		const failedMsg = 'Connection failed! Please check your internet connection.'
		const connectingMsg = 'Connecting to Totem blockchain network...'
		return (
			<Dimmer active style={{ height: '100%', position: 'fixed' }}>
				{!!status.error ? failedMsg : <Loader indeterminate>{connectingMsg}</Loader>}
			</Dimmer>
		)
	}

	readyRender() {
		const { isMobile } = this.state
		const logoSrc = TotemButtonLogo
		const { collapsed, visible } = sidebarStateBond._value
		const classNames = [
			collapsed ? 'sidebar-collapsed' : '',
			isMobile ? 'mobile' : 'desktop',
			visible ? 'sidebar-visible' : '',
			'wrapper',
		].filter(Boolean).join(' ')

		if (!this.resumed) {
			// resume any incomplete queued tasks 
			this.resumed = true
			setTimeout(() => resumeQueue(), 1000)
		}

		return (
			<div className={classNames}>
				<ChatWidget />
				<ModalsConainer />
				<ToastsContainer isMobile={isMobile} />
				<ErrorBoundary><PageHeader {...{ logoSrc, isMobile }} /></ErrorBoundary>

				<Sidebar.Pushable style={styles.pushable}>
					<SidebarLeft isMobile={isMobile} />

					<Sidebar.Pusher
						as={Container}
						className="main-content"
						dimmed={false}
						id="main-content"
						fluid
						style={styles.mainContent}
					>
						{sidebarItems.map(({ name }, i) => <MainContentItem key={i + name} name={name} />)}
						<div className='empty-message'>
							<Image style={{ margin: 'auto' }} src={PlaceholderImage} />
						</div>
					</Sidebar.Pusher>
				</Sidebar.Pushable>
			</div >
		)
	}
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
		height: 'calc(100% - 61px)',
		overflow: 'hidden',
		WebkitOverflow: 'hidden',
	},
}