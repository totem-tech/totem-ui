import React from 'react'
import { Container, Dimmer, Loader, Sidebar } from 'semantic-ui-react'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import {
	calls, runtime, chain, system, runtimeUp,
	secretStore, metadata, nodeService
} from 'oo7-substrate'

// Components
import ErrorBoundary from './components/CatchReactErrors'
import ChatWidget from './components/ChatWidget'
import ContentSegment from './components/ContentSegment'
import PageHeader from './components/PageHeader'
import SidebarLeft, { SidebarItemContent } from './components/SidebarLeft'
// Services
import ModalService from './services/modal'
import { resumeQueue } from './services/queue'
import { sidebarItems } from './services/sidebar'
import ToastService from './services/toast'
import { getLayout, layoutBond } from './services/window'
// Utils
import DataStorage from './utils/DataStorage'
// Images
import TotemButtonLogo from './assets/totem-button-grey.png'

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
		const { isMobile, sidebarCollapsed, sidebarVisible } = this.state
		const { mainContent, mainContentCollapsed } = styles
		const logoSrc = TotemButtonLogo
		const classNames = [
			sidebarVisible ? 'sidebar-visible' : '',
			sidebarCollapsed ? 'sidebar-collapsed' : '',
			isMobile ? 'mobile' : 'desktop',
		].filter(Boolean).join(' ')

		if (!this.resumed) {
			// resume any incomplete queued tasks 
			this.resumed = true
			setTimeout(() => resumeQueue(), 1000)
		}

		return (
			<div className={classNames}>
				<ChatWidget />
				<ModalService />
				<ErrorBoundary>
					<PageHeader
						logoSrc={logoSrc}
						isMobile={isMobile}
						onSidebarToggle={this.handleSidebarToggle}
						sidebarCollapsed={sidebarCollapsed}
						sidebarVisible={sidebarVisible}
					/>
				</ErrorBoundary>
				<ToastService {...{
					hidden: isMobile && sidebarVisible,
					style: { left: (isMobile ? 10 : sidebarCollapsed ? 70 : 245) },
				}} />

				<Sidebar.Pushable style={styles.pushable}>
					<SidebarLeft
						collapsed={isMobile ? false : sidebarCollapsed}
						isMobile={isMobile}
						onSidebarToggle={this.handleSidebarToggle}
						visible={isMobile ? sidebarVisible : true}
					/>

					<Sidebar.Pusher
						as={Container}
						className="main-content"
						dimmed={isMobile && sidebarVisible}
						id="main-content"
						fluid
						style={sidebarCollapsed ? mainContentCollapsed : mainContent}
					>
						{sidebarItems.map(({ name }, i) => <SidebarItemContent key={i + name} name={name} />)}
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
	mainContentCollapsed: {
		overflow: 'hidden auto',
		WebkitOverflow: 'hidden auto',
		height: '100%',
		// scrollBehavior: 'smooth',
		padding: 15,
	},
	pushable: {
		margin: 0,
		height: 'calc(100% - 61px)',
		overflow: 'hidden',
		WebkitOverflow: 'hidden',
	},
}