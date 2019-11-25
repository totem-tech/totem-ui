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
import SendFundsView from './views/SendFundsView'
import UtilitiesView from './views/UtilitiesView'
import TimeKeepingView from './views/TimeKeepingView'
import ErrorBoundary from './components/CatchReactErrors'
import ChatWidget from './components/ChatWidget'
import ContentSegment from './components/ContentSegment'
import PageHeader from './components/PageHeader'
import PartnerList from './lists/PartnerList'
import ProjectList from './lists/ProjectList'
import IdentityList from './lists/IdentityList'
import SidebarLeft from './components/SidebarLeft'
import ModalService from './services/modal'
import ToastService from './services/toast'
// import NotificationService from './services/notification'
import { resumeQueue } from './services/queue'
import { IfMobile } from './utils/utils'
// Images
import TotemButtonLogo from './assets/totem-button-grey.png'
import DataStorage from './utils/DataStorage'

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
		window.DataStorage = DataStorage

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
				{/* <NotificationService /> */}
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
		const failedMsg = 'Connection failed! Please check your internet connection.'
		const connectingMsg = 'Connecting to Totem blockchain network...'
		return (
			<Dimmer active style={{ height: '100%', position: 'fixed' }}>
				{!!status.error ? failedMsg : <Loader indeterminate>{connectingMsg}</Loader>}
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
	// { icon: "object group outline", title: "Overview", subHeader: "", active: false, content: <LedgerTransactionList />},
	{
		icon: "id badge outline",
		title: "Identities",
		subHeader: "Manage your Identities",
		subHeaderDetails:
		"In Totem, you can create multiple identites to suit your needs. Identities are private, but you can choose which ones you share \n" +
		"There is a default identity which is created for you when you start Totem for the first time. This Identity is your master backup key \n" +
		"and you must not lose this. It allows you to backup all your data and also to recover the data on different devices. \n" +
		" The other identities you create are used to manage personal or business activities. Each Identity has it's own set of accounting modules, \n" +
		"so this means that you can only see the activities of one identity at a time. You can think of an Identity like running a company, grouping things together" +
		"You can give each shared Identity a name, add tags, and define it any way you want, and you can associate it with partners,  \n" +
		"Once a identity is stored in this list you can use it all over Totem. To find out more, watch the video!",
		active: false,
		content: <IdentityList />
	},
	{
		icon: "users", title: "Partners",
		header: "Partner Contact List",
		subHeader: "Manage suppliers or customers, or any other party that you have contact with in Totem.",
		subHeaderDetails:
		"In Totem, a partner is anyone that you intend to interact with. Each partner has one or more identities,\n " +
		"that they can share with you. (see the Identities Module for more information on Identities.) \n " +
		"The best way to get someone's identity is to request it, which you can do using the internal messaging service. \n" +
		"Click Request, and enter the partner\'s userID and hopefully they will share one with you. \n" +
		"You can give each shared Partner Identity a new name, add tags, and define it any way you want. \n" +
		"Once a partner is stored in this list you can use it all over Totem.",
		active: false,
		content: <PartnerList />
	},
	{
		active: false,
		content: <ProjectList />,
		headerDividerHidden: true,
		icon: "tasks",
		title: "Project Module",
		subHeader: "Manage projects.",
		subHeaderDetails:
			"You can use the project module to account for individual tasks as well as projects. You can invite team members to projects or assign individuals tasks, manage and approve \n" +
			"all time booked against a task/project. Projects and tasks are then automatically mapped to invoices or other payments, and all accounting will be correctly posted, without you \n" +
			"needing to do anything else."
	},
	{
		active: true,
		content: <TimeKeepingView />,
		icon: "clock outline",
		title: "Timekeeping",
		subHeader: "Manage timekeeping against projects and tasks.",
	},
	{
		icon: "money bill alternate outline",
		title: "Transfer",
		header: "Transfer Transaction Allocations",
		subHeader: "Use this module to send your transaction allocations to \n another Identity. You can send to any Identity on the network, including your own",
		active: false,
		content: <SendFundsView />
	},
	// { icon: "file alternate", title: "Invoice", subHeader: "", active: false, content: <Invoice /> },
	{ icon: "file alternate", title: "Manage Invoices", subHeader: "" },
	{ icon: "file alternate outline", title: "Credit Note", subHeader: "" },
	{ icon: "exchange", title: "Purchase Order", subHeader: "" },
	{ icon: "inbox", title: "Manage Orders", subHeader: "" },
	{ icon: "cc mastercard", title: "Expense", subHeader: "" },
	{ icon: "exclamation circle", title: "Disputed Items", subHeader: "" },
	{ icon: "chart bar outline", title: "Edit Accounting", subHeader: "" },
	{ icon: "lightbulb", title: "Products", subHeader: "" },
	{ icon: "cogs", title: "Settings", subHeader: "" },
	{
		active: false,
		icon: "stethoscope",
		title: "Utilities",
		subHeader: "Blockchain utilities",
		// subHeaderDetails: 'This is a sample detailed subheader', // for extra information that extends subHeader
		content: <UtilitiesView />
	}
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