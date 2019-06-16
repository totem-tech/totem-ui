import React from 'react'
require('semantic-ui-css/semantic.min.css')
import { Container, Dropdown, Icon, Image, Menu, Responsive, Sidebar } from 'semantic-ui-react'
import { ReactiveComponent } from 'oo7-react'
import {
	calls, runtime, chain, system, runtimeUp,
	addressBook, secretStore, metadata
} from 'oo7-substrate'
import {
  BrowserView,
  MobileView,
  isBrowser,
  isMobile
} from "react-device-detect"
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
    this.setState({ sidebarCollapsed, sidebarVisible })
    console.log('sidebarVisible', sidebarVisible)
	}
  
	toggleMenuItem(index) {
	  const items = [...this.state.sidebarItems]
	  items[index].active = !items[index].active
	  this.setState({ sidebarItems: items })
	  items[index].active && setTimeout(() => {
		// Scroll down to the content segment
		document.getElementById('main-content').scrollTo(0, items[index].elementRef.current.offsetTop)
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

    const collapsedClass = this.state.sidebarCollapsed ? ' sidebar-collapsed' : ''
		return (
			<React.Fragment>
        {/* mobile view */}
        <Responsive
          maxWidth={isMobile ? 1e10 : Responsive.onlyMobile.maxWidth}
          className={'mobile' + collapsedClass}>   
          <ChatWidget />         

            <Sidebar.Pushable>   
				<Menu fixed="top" inverted>
					<Menu.Item onClick={() => this.handleSidebarToggle(false, !this.state.sidebarVisible)}>
					<Icon name="sidebar" />
					</Menu.Item>
					<Menu.Item>
					<Image size="mini" src={TotemButtonLogo} />
					</Menu.Item>
					<Menu.Menu position="right">
						<Menu.Item as="a" content="Register" icon="sign-in" />
						<Menu.Item>
							<Dropdown defaultValue={0} options={[
									{name: 'Address 1', address: '5DMdqWmxRg6FwSqLZyNojF9xfckRwZvgzJ743nCeoEjreMjg'},
									{name: 'Address 2', address: '5Grp7UouLuTmqAQkxc4xJ8vq6LcMjLF7g5m1gqCrKeVxbVn6'}
								].map((item, i) => ({
								key: i,
								text: item.name,
								label: {content: item.address, position: 'right', description: 'test', inverted: true},
								value: i
							}))} />
						</Menu.Item>
					</Menu.Menu>
				</Menu>           
              <SidebarLeft
                animation="overlay"
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
              >
                {mainContent}
              </Sidebar.Pusher>
            </Sidebar.Pushable>
        </Responsive>

        {/* desktop view */}
        <Responsive
          minWidth={isMobile ? 1e10 : Responsive.onlyMobile.maxWidth}
          as={Container}
          fluid
          className={'desktop' + collapsedClass}>
          <PageHeader logo={TotemButtonLogo} />
          <ChatWidget />

          <Sidebar.Pushable as={Container} fluid style={styles.pushable}>
           <SidebarLeft
                animation="push"
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
			</React.Fragment>
		)
	}
}

const sidebarItems = [
	// { icon: "object group outline", title: "Overview", subHeader: "", active: true, content: <LedgerTransactionList />},
	{
	  icon: "sitemap", title: "Partners",
	  header: "Vendors and Customers",
	  subHeader: "Inspect the status of any account and name it for later use",
	  active: true,
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
	  active: true,
	  content: <WalletView />
	},
	{ 
	  active: true,
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
	  padding: '15px 15px',
	  paddingTop: 75
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