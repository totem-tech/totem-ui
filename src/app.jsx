import React, { Component } from 'react'
import { Container, Image, Sidebar } from 'semantic-ui-react'
// Components
import ErrorBoundary from './components/CatchReactErrors'
import PageHeader from './components/PageHeader'
import SidebarLeft, { MainContentItem } from './components/SidebarLeft'
// Services
import blockchain from './services/blockchain'
import chatClient from './services/chatClient'
import identity from './services/identity'
import language from './services/language'
import modal, { ModalsConainer } from './services/modal'
import NotificationList from './modules/notification/List'
import partner from './services/partner'
import project from './services/project'
import queue, { resumeQueue } from './services/queue'
import sidebar, { sidebarItems, sidebarStateBond } from './services/sidebar'
import storage from './services/storage'
import timeKeeping from './services/timeKeeping'
import toast, { ToastsContainer } from './services/toast'
import windw, { gridColumnsBond, layoutBond, MOBILE } from './services/window'
// Utils
import DataStorage from './utils/DataStorage'
import naclHelper from './utils/naclHelper'
import polkadotHelper from './utils/polkadotHelper'
import { className } from './utils/utils'
// Images
import TotemButtonLogo from './assets/totem-button-grey.png'
import PlaceholderImage from './assets/totem-placeholder.png'
import ChatBar from './modules/chat/ChatBar'

export class App extends Component {
	constructor() {
		super()
		this.state = {
			sidebarCollapsed: false,
			sidebarVisible: windw.getLayout() !== 'mobile',
			status: {}
		}

		// For debug only.
		window.utils = {
			naclHelper,
			polkadotHelper,
		}
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

		window.queryBlockchain = async (func, args, multi) => await blockchain.query(func, args, multi, true)
	}

	componentWillMount() {
		this.tieIdIsMobile = layoutBond.tie(layout => this.setState({ isMobile: layout === MOBILE }))
		this.tieIdNumCol = gridColumnsBond.tie(numCol => this.setState({ numCol }))
	}

	componentWillUnmount() {
		layoutBond.untie(this.tieIdIsMobile)
		gridColumnsBond.untie(this.tieIdNumCol)
	}

	// unused
	// hack to format as a currency. Needs to go in a seperate Display Formatting Utilities file.
	round(value, decimals) {
		return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals).toFixed(decimals)
	}

	handleSidebarToggle = (v, c) => this.setState({ sidebarVisible: v, sidebarCollapsed: c })

	render() {
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


