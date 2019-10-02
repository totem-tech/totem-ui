import React from 'react'
import { Container, Dimmer, Loader, Responsive, Sidebar } from 'semantic-ui-react'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import {
	calls, runtime, chain, system, runtimeUp,
	addressBook, secretStore, metadata, nodeService
} from 'oo7-substrate'

// Components
import GettingStarted from './components/GettingStartedView'
import PartnerView from './views/PartnerView'
import SendFundsView from './views/SendFundsView'
import UtilitiesView from './views/UtilitiesView'
import IdentitiesView from './views/WalletView'
import TimeKeepingView from './views/TimeKeepingView'
import ErrorBoundary from './components/CatchReactErrors'
import ChatWidget from './components/ChatWidget'
import ContentSegment from './components/ContentSegment'
import PageHeader from './components/PageHeader'
import ProjectList from './lists/ProjectList'
import SidebarLeft from './components/SidebarLeft'
import ModalService from './services/modal'
import ToastService from './services/toast'
import { resumeQueue } from './services/queue'
import { IfMobile } from './utils/utils'
// Images
import TotemButtonLogo from './assets/totem-button-grey.png'

export class App extends ReactiveComponent {
	constructor() {
		super([], { ensureRuntime: runtimeUp })
		this.state = {
			sidebarItems: [...sidebarItems].map(item => {
				item.elementRef = React.createRef()
				return item
			}),
			sidebarCollapsed: false,
			sidebarVisible: !this.isMobile(),
			status: {}
		}

		nodeService().status.notify(() => this.setState({ status: nodeService().status._value }) | console.log('status changed'))

		// For debug only.
		window.runtime = runtime
		window.secretStore = secretStore
		window.addressBook = addressBook // deprecated
		window.chain = chain
		window.calls = calls
		window.system = system
		window.that = this
		window.metadata = metadata
		window.Bond = Bond

		this.handleSidebarToggle = this.handleSidebarToggle.bind(this)
		this.toggleMenuItem = this.toggleMenuItem.bind(this)
		this.handleClose = this.handleClose.bind(this)
		this.getContent = this.getContent.bind(this)
	}

	isMobile() {
		return window.innerWidth <= Responsive.onlyMobile.maxWidth
	}

	// hack to format as a currency. Needs to go in a seperate Display Formatting Utilities file.
	round(value, decimals) {
		return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals).toFixed(decimals)
	}

	handleSidebarToggle(sidebarVisible, sidebarCollapsed) {
		this.setState({ sidebarVisible, sidebarCollapsed })
	}

	toggleMenuItem(index, isMobile) {
		const items = [...this.state.sidebarItems]
		items[index].active = !items[index].active
		this.setState({
			sidebarItems: items,
			isMobile,
			sidebarVisible: isMobile ? false : this.state.sidebarVisible
		})
		items[index].active && setTimeout(() => {
			// Scroll down to the content segment
			document.getElementById('main-content')
				.scrollTo(0, items[index].elementRef.current.offsetTop - (isMobile ? 75 : 0))
		}, 100)
	}

	handleClose(index) {
		const sidebarItems = this.state.sidebarItems
		if (!sidebarItems[index]) return;
		sidebarItems[index].active = false
		this.setState({ sidebarItems })
	}

	getContent(mobile) {
		const { sidebarCollapsed, sidebarItems, sidebarVisible } = this.state
		const { handleClose, handleSidebarToggle, toggleMenuItem } = this
		const { spaceBelow, mainContent, mainContentCollapsed } = styles
		const logoSrc = TotemButtonLogo

		return (
			<React.Fragment>
				<ChatWidget />
				<ModalService />
				{/* <IfFn condition={!mobile && sidebarCollapsed} then={()=> <SystemStatus sidebar={true} visible={true} />} /> */}
				<Sidebar.Pushable>
					<SidebarLeft
						collapsed={mobile ? false : sidebarCollapsed}
						isMobile={mobile}
						items={sidebarItems}
						onMenuItemClick={toggleMenuItem}
						onSidebarToggle={handleSidebarToggle}
						visible={mobile ? sidebarVisible : true}
					/>

					<Sidebar.Pusher
						as={Container}
						className="main-content"
						dimmed={mobile && sidebarVisible}
						id="main-content"
						fluid
						style={sidebarCollapsed ? mainContentCollapsed : mainContent}
					>
						<ErrorBoundary>
							<PageHeader
								logoSrc={logoSrc}
								isMobile={mobile}
								onSidebarToggle={handleSidebarToggle}
								sidebarCollapsed={sidebarCollapsed}
								sidebarVisible={sidebarVisible}
							/>
						</ErrorBoundary>


						<ToastService fullWidth={true} hidden={mobile && sidebarVisible} />

						{sidebarItems.map((item, i) => (
							<div ref={item.elementRef} key={i} hidden={!item.active} style={spaceBelow}>
								<ContentSegment {...item} onClose={handleClose} index={i} />
							</div>
						))}
					</Sidebar.Pusher>
				</Sidebar.Pushable>
			</React.Fragment>
		)
	}

	unreadyRender() {
		const { status } = this.state
		return (
			<Dimmer active style={{ height: '100%', position: 'fixed' }}>
				{!!status.error ? 'Connection failed! Please check your internet connection.' : <Loader indeterminate>Connecting to Totem blockchain network...</Loader>}
			</Dimmer>
		)
	}

	readyRender() {
		const { sidebarCollapsed, sidebarVisible } = this.state
		const classNames = [
			sidebarVisible ? 'sidebar-visible' : '',
			sidebarCollapsed ? 'sidebar-collapsed' : ''
		].join(' ')
		if (!this.resumed) {
			this.resumed = true
			setTimeout(() => resumeQueue(), 1000)
		}

		return (
			<IfMobile
				then={this.getContent(true)}
				thenClassName={'mobile ' + classNames}
				else={this.getContent(false)}
				elseClassName={classNames}
			/>
		)
	}
}

const sidebarItems = [
	{
		active: true,
		content: <GettingStarted />,
		headerDividerHidden: true,
		icon: "play circle outline",
		title: "Getting Started"
	},
	// { icon: "object group outline", title: "Overview", subHeader: "", active: true, content: <LedgerTransactionList />},
	{
		icon: "users", title: "Partners",
		header: "Vendors and Customers",
		subHeader: "Inspect the status of any account and name it for later use",
		active: false,
		content: <PartnerView />
	},
	// { icon: "file alternate", title: "Invoice", subHeader: "", active: false, content: <Invoice /> },
	{ icon: "file alternate", title: "Manage Invoices", subHeader: "" },
	{ icon: "file alternate outline", title: "Credit Note", subHeader: "" },
	{ icon: "exchange", title: "Purchase Order", subHeader: "" },
	{ icon: "inbox", title: "Manage Orders", subHeader: "" },
	{ icon: "cc mastercard", title: "Expense", subHeader: "" },
	{ icon: "exclamation circle", title: "Disputed Items", subHeader: "" },
	{ icon: "chart bar outline", title: "Edit Accounting", subHeader: "" },
	{
		active: false,
		content: <ProjectList />,
		headerDividerHidden: true,
		icon: "tasks",
		title: "Projects",
		subHeader: "View and/or manage your projects"
	},  
	{ icon: "clock outline", title: "Timekeeping", subHeader: "Manage timekeeping against projects and tasks. You can create projects and tasks for yourself, or others can assign them to you.", content: <TimeKeepingView />, active: true },
	{ icon: "lightbulb", title: "Products", subHeader: "" },
	{
		icon: "money bill alternate outline",
		title: "Payment",
		header: "Direct payments",
		subHeader: "Send funds from your account to another",
		active: false,
		content: <SendFundsView />
	},
	{
		icon: "id badge outline",
		title: "Identities",
		subHeader: "Manage your Identity keys",
		active: false,
		content: <IdentitiesView />
	},
	{
		active: false,
		icon: "stethoscope",
		title: "Utilities",
		subHeader: "Blockchain utilities",
		subHeaderDetails: 'This is a sample detailed subheader',
		content: <UtilitiesView />
	},
	{ icon: "cogs", title: "Settings", subHeader: "" }
]

const styles = {
	pushable: {
		margin: 0,
		height: 'calc(100% - 155px)',
		overflow: 'hidden',
		WebkitOverflow: 'hidden',
	},
	mainContent: {
		overflow: 'hidden auto',
		WebkitOverflow: 'hidden auto',
		height: '100%',
		scrollBehavior: 'smooth',
		padding: '75px 15px 15px'
	},
	mainContentCollapsed: {
		overflow: 'hidden auto',
		WebkitOverflow: 'hidden auto',
		height: '100%',
		// scrollBehavior: 'smooth',
		padding: '75px 15px 75px'
	},
	spaceBelow: {
		marginBottom: 15
	}
}