import React from 'react'
import { Container, Dropdown, Icon, Image, Menu, Responsive, Sidebar } from 'semantic-ui-react'
import { ReactiveComponent } from 'oo7-react'
import {
	calls, runtime, chain, system, runtimeUp,
	addressBook, secretStore, metadata
} from 'oo7-substrate'

// Components
import AddressBookView from './components/AddressBookView'
import ChatWidget from './components/ChatWidget'
import ContentSegment from './components/ContentSegment'
import PageHeader from './components/PageHeader'
import SendFundsView from './components/SendFundsView'
import SidebarLeft from './components/SidebarLeft'
import SystemStatus from './components/SystemStatus'
import UtilitiesView from './components/UtilitiesView'
import WalletView from './components/WalletView'
// Images
import TotemButtonLogo from'./assets/totem-button-grey.png'

export class App extends ReactiveComponent {
	constructor() {
		super([], { ensureRuntime: runtimeUp })
		this.state = {
			sidebarItems: [...sidebarItems].map(item => {
			  item.elementRef = React.createRef()
			  return item
			}),
			sidebarCollapsed: false,
			sidebarVisible: !this.isMobile()
		}

		// For debug only.
		window.runtime = runtime
		window.secretStore = secretStore
		window.addressBook = addressBook
		window.chain = chain
		window.calls = calls
		window.system = system
		window.that = this
		window.metadata = metadata

		this.handleSidebarToggle = this.handleSidebarToggle.bind(this)
		this.toggleMenuItem = this.toggleMenuItem.bind(this)
		this.handleClose = this.handleClose.bind(this)
	}

	isMobile() {
		return window.innerWidth <= Responsive.onlyMobile.maxWidth
	}

	// hack to format as a currency. Needs to go in a seperate Display Formatting Utilities file.
	round(value, decimals) {
		return Number(Math.round(value +'e'+ decimals) +'e-'+ decimals).toFixed(decimals)
	}

	handleSidebarToggle(sidebarVisible, sidebarCollapsed) {
		this.setState({sidebarVisible, sidebarCollapsed})
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
				.scrollTo(0, items[index].elementRef.current.offsetTop - (isMobile ? 75  : 0))
		}, 100)
	}
  
	handleClose(index) {
		const sidebarItems = this.state.sidebarItems
		if (!sidebarItems[index]) return;
		sidebarItems[index].active = false
		this.setState({sidebarItems})
	}

	readyRender() {
		const { sidebarCollapsed, sidebarItems, sidebarVisible } = this.state
		const { handleClose, handleSidebarToggle, toggleMenuItem } = this
		const { spaceBelow, mainContentMobile } = styles
		const logoSrc = TotemButtonLogo
		const isMobile = this.isMobile()
		// const collapsed = isMobile ? sidebarCollapsed

		const classNames = [
			isMobile ? 'mobile' : '',
			sidebarVisible ? 'sidebar-visible' : '',
			sidebarCollapsed ? 'sidebar-collapsed' : ''
		].join(' ')

		return (
			<div className={classNames}>
				<ChatWidget />  
				<Sidebar.Pushable>
					<SidebarLeft
						collapsed={sidebarCollapsed}
						isMobile={isMobile}
						items={sidebarItems}
						onMenuItemClick={toggleMenuItem}
						onSidebarToggle={handleSidebarToggle}
						visible={sidebarVisible}
					/>  
					<Sidebar.Pusher
						as={Container}
						className="main-content"
						dimmed={isMobile && sidebarVisible}
						id="main-content"
						fluid
						style={mainContentMobile}
					>
					<PageHeader
						logoSrc={logoSrc}
						isMobile={isMobile}
						onSidebarToggle={handleSidebarToggle}
						sidebarCollapsed={sidebarCollapsed}
						sidebarVisible={sidebarVisible}
					/>
						{sidebarItems.map((item, i) => (
							<div ref={item.elementRef} key={i} hidden={!item.active} style={spaceBelow}>
								<ContentSegment {...item} onClose={handleClose} index={i} />
							</div>
						))}
					</Sidebar.Pusher>
				</Sidebar.Pushable>
			</div>
	)
	}
}

const sidebarItems = [
	// { icon: "object group outline", title: "Overview", subHeader: "", active: true, content: <LedgerTransactionList />},
	{
	  icon: "sitemap", title: "Partners",
	  header: "Vendors and Customers",
	  subHeader: "Inspect the status of any account and name it for later use",
	  active: false,
	  content: <AddressBookView />
	},
	// { icon: "file alternate", title: "Invoice", subHeader: "", active: false, content: <Invoice /> },
	{ icon: "pen square", title: "Manage Invoices", subHeader: "" },
	{ icon: "file alternate", title: "Credit Note", subHeader: "" },
	{ icon: "tint", title: "Purchase Order", subHeader: "" },
	{ icon: "edit", title: "Manage Orders", subHeader: "" },
	{ icon: "file alternate", title: "Expense", subHeader: "" },
	{ icon: "bug", title: "Disputed Items", subHeader: "" },
	{ icon: "crop", title: "Account Adjustments", subHeader: "" },
	{ icon: "barcode", title: "Projects", subHeader: "" },  
	{ icon: "file alternate", title: "Timekeeping", subHeader: "" },
	{ icon: "barcode", title: "Products", subHeader: "" },
	{
	  icon: "dollar sign",
	  title: "Payment",
	  header: "Direct payments",
	  subHeader: "Send funds from your account to another",
	  active: true,
	  content: <SendFundsView />
	},
	{
	  icon: "money",
	  title: "Wallet",
	  subHeader: "Manage your secret keys",
	  active: false,
	  content: <WalletView />
	},
	{ 
	  active: false,
	  icon: "wrench",
	  title: "Utilities",
	  subHeader: "Blockchain utilities",
	  subHeaderDetails: 'This is a sample detailed subheader',
	  content: <UtilitiesView />
	},
	{ icon: "settings", title: "Settings", subHeader: "" }
  ]
  
const styles = {
	pushable: {
	  margin: 0,
	  height: 'calc(100% - 155px)',
	  overflow: 'hidden'
	},
	mainContentMobile: {
	  overflow: 'hidden auto',
	  maxHeight: '100%',
	  scrollBehavior: 'smooth',
	  padding: '75px 15px 15px'
	},
	mainContent: {
	  overflow: 'hidden auto',
	  maxHeight: '100%',
	  scrollBehavior: 'smooth',
	  padding: '15px 15px'
	},
	mainContentCollapsed: {
	  overflow: 'hidden auto',
	  maxHeight: '100%',
	  scrollBehavior: 'smooth',
	  padding: '15px 15px 52px'
	},
	spaceBelow: {
	  marginBottom: 15
	}
  }