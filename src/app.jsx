import React, { Component } from 'react'
import { Image, Segment, Sidebar } from 'semantic-ui-react'
// Components
import ErrorBoundary from './components/CatchReactErrors'
import Invertible from './components/Invertible'
import PageHeader from './components/PageHeader'
import SidebarLeft, { MainContentItem } from './components/SidebarLeft'
// Services
import blockchain from './services/blockchain'
import chatClient from './services/chatClient'
import currency from './services/currency'
import identity from './services/identity'
import language from './services/language'
import modal, { ModalsConainer } from './services/modal'
import NotificationList from './modules/notification/List'
import partner from './services/partner'
import project from './services/project'
import queue, { resumeQueue } from './services/queue'
import sidebar, { sidebarItems, sidebarStateBond } from './services/sidebar'
import storage from './services/storage'
import timeKeeping from './modules/timekeeping/timekeeping'
import toast, { ToastsContainer } from './services/toast'
import windw, { gridColumnsBond, getLayout, layoutBond, MOBILE } from './services/window'
// Utils
import convert from './utils/convert'
import DataStorage from './utils/DataStorage'
import naclHelper from './utils/naclHelper'
import polkadotHelper from './utils/polkadotHelper'
import { className, isBool } from './utils/utils'
import validator from './utils/validator'
// Images
import TotemButtonLogo from './assets/totem-button-grey.png'
import PlaceholderImage from './assets/totem-placeholder.png'
import ChatBar from './modules/chat/ChatBar'
import PromisE from './utils/PromisE'

export class App extends Component {
	constructor() {
		super()
		this.state = {
			sidebarCollapsed: false,
			sidebarVisible: getLayout() !== MOBILE,
			status: {}
		}

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
			blockchain,
			chatClient,
			currency,
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
		queryBlockchain().then(api => window.api = api)
	}

	componentWillMount() {
		this.tieIdIsMobile = layoutBond.tie(layout => this.setState({ isMobile: layout === MOBILE }))
		this.tieIdNumCol = gridColumnsBond.tie(numCol => this.setState({ numCol }))
	}

	componentWillUnmount() {
		layoutBond.untie(this.tieIdIsMobile)
		gridColumnsBond.untie(this.tieIdNumCol)
	}

	handleSidebarToggle = (v, c) => this.setState({ sidebarVisible: v, sidebarCollapsed: c })

	render() {
		const { isMobile, numCol } = this.state
		if (!isBool(isMobile)) return ''
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
					<NotificationList />
				</ErrorBoundary>

				<Sidebar.Pushable style={styles.pushable}>
					<ErrorBoundary>
						<SidebarLeft isMobile={isMobile} />
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
	pushable: {
		margin: 0,
		height: 'calc(100% - 59px)',
		overflow: 'hidden',
		WebkitOverflow: 'hidden',
	},

}


