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
import MobileView from './MobileView'
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
			sidebarVisible: undefined
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

	// hack to format as a currency. Needs to go in a seperate Display Formatting Utilities file.
	round(value, decimals) {
		return Number(Math.round(value +'e'+ decimals) +'e-'+ decimals).toFixed(decimals)
	}

	handleSidebarToggle(sidebarCollapsed, sidebarVisible) {
		this.setState({  sidebarCollapsed, sidebarVisible })
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
		const mainContent = this.state.sidebarItems.map((item, i) => (
			<div ref={item.elementRef} key={i} hidden={!item.active} style={styles.spaceBelow}>
				<ContentSegment {...item} onClose={this.handleClose} index={i} />
			</div>
		))

		return (<React.Fragment>
			{/* mobile view */}
			<Responsive
				maxWidth={Responsive.onlyMobile.maxWidth}
				className={'mobile' + (this.state.sidebarVisible ? ' sidebar-visible' : '')}>
				<ChatWidget />  
				<Sidebar.Pushable>
					<PageHeader
						logo={TotemButtonLogo}
						isMobile={true}
						onSidebarToggle={this.handleSidebarToggle}
						sidebarVisible={this.state.sidebarVisible}
					/>
					<SidebarLeft
						items={this.state.sidebarItems}
						isMobile={true}
						collapsed={false}
						visible={this.state.sidebarVisible === undefined ? false : this.state.sidebarVisible}
						onSidebarToggle={this.handleSidebarToggle}
						onMenuItemClick={this.toggleMenuItem}
					/>  
					<Sidebar.Pusher
						as={Container}
						fluid
						className="main-content"
						id="main-content"
						style={styles.mainContentMobile}
						dimmed={this.state.sidebarVisible}
					>
						{mainContent}
					</Sidebar.Pusher>
				</Sidebar.Pushable>
			</Responsive>
			{/* <MobileView 
				children={'test'}
				logoSrc={TotemButtonLogo}
				onSidebarToggle={this.handleSidebarToggle}
				sidebarCollapsed={this.state.sidebarCollapsed}
				sidebarItems={this.state.sidebarItems}
				sidebarVisible={this.state.sidebarVisible || false}
				toggleMenuItem={this.toggleMenuItem}
			/> */}

			{/* desktop view */}
			<Responsive
				minWidth={Responsive.onlyMobile.maxWidth}
				as={Container}
				fluid
				className={'desktop' + this.state.sidebarCollapsed ? ' sidebar-collapsed' : ''}
			>
			<PageHeader logo={TotemButtonLogo} />
			<ChatWidget />

			<Sidebar.Pushable as={Container} fluid style={styles.pushable}>
				<SidebarLeft
					items={this.state.sidebarItems}
					isMobile={false}
					collapsed={this.state.sidebarCollapsed}
					visible={this.state.sidebarVisible}
					onSidebarToggle={this.handleSidebarToggle}
					onMenuItemClick={this.toggleMenuItem}
				/>
				<SystemStatus sidebar={true} visible={this.state.sidebarCollapsed} />	

				<Sidebar.Pusher
					as={Container}
					fluid
					className="main-content"
					id="main-content"
					style={this.state.sidebarCollapsed? styles.mainContentCollapsed : styles.mainContent}
				>
					{mainContent}
				</Sidebar.Pusher>
			</Sidebar.Pushable>
			</Responsive>
		</React.Fragment>)
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