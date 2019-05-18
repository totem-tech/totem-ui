import React from 'react'
import { Container, Menu, Sidebar } from 'semantic-ui-react'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import { calls, runtime, chain, runtimeUp, addressBook, secretStore } from 'oo7-substrate'
import SidebarLeft from './components/SidebarLeft'
import ContentSegment from './components/ContentSegment'
import PageHeader from './components/PageHeader'
import WalletView from './components/WalletView'
import SendFundsView from './components/SendFundsView'
import AddressBookView from './components/AddressBookView'
import UtilitiesView from './components/UtilitiesView'
import SystemStatus from './components/SystemStatus'

export class App extends ReactiveComponent {
  constructor() {
    super([], { ensureRuntime: runtimeUp, secretStore: secretStore() })

    // For debug only.
    window.runtime = runtime
    window.secretStore = secretStore
    window.addressBook = addressBook
    window.chain = chain
    window.calls = calls
    window.that = this

    this.source = new Bond()
    this.amount = new Bond()
    this.destination = new Bond()
    this.nick = new Bond()
    this.lookup = new Bond()
    this.name = new Bond()
    this.seed = new Bond()
    this.seedAccount = this.seed.map(s => s ? secretStore().accountFromPhrase(s) : undefined)
    this.seedAccount.use()
    this.runtime = new Bond()

    this.state = {
			id: 'dksmith',
      logo: 'https://react.semantic-ui.com/images/wireframe/image.png',
      sidebarItems: [...sidebarItems].map(item => {
        item.elementRef = React.createRef()
        return item
      }),
			isMobile: false,
			sidebarCollapsed: true,
			sidebarVisible: true
    }

    this.handleSidebarToggle = this.handleSidebarToggle.bind(this)
    this.toggleMenuItem = this.toggleMenuItem.bind(this)
  }

  handleSidebarToggle(sidebarCollapsed, sidebarVisible) {
    this.setState({ sidebarCollapsed, sidebarVisible })
  }

  toggleMenuItem(index) {
    const items = [...this.state.sidebarItems]
    items[index].active = !items[index].active
    this.setState({ sidebarItems: items })
    items[index].active && setTimeout(() => {
      document.getElementById('main-content').scrollTo(0, items[index].elementRef.current.offsetTop)
    }, 100)
  }

  readyRender() {
    return (
      <React.Fragment>
        <PageHeader logo={this.state.logo} id={this.state.id} />
        <Sidebar.Pushable as={Container} fluid>
          <SidebarLeft
            items={this.state.sidebarItems}
						isMobile={this.state.isMobile}
						collapsed={this.state.sidebarCollapsed}
						visible={this.state.sidebarVisible}
            onSidebarToggle={this.handleSidebarToggle}
						onMenuItemClick={this.toggleMenuItem}
          />
					<Sidebar
						as={Menu}
						className="statusbar-bottom"
						visible={this.state.sidebarCollapsed}
						amination="push"
						direction="bottom"
						width="very thin"
						inverted
					>
						<Menu.Item>
							<SystemStatus />
						</Menu.Item>
					</Sidebar>

          <Sidebar.Pusher as={Container} fluid className="main-content" id="main-content">
            {this.state.sidebarItems.map((item, i) => (
              <div ref={item.elementRef} key={i} hidden={!item.active}>
                <ContentSegment {...item} />
              </div>
            ))}
          </Sidebar.Pusher>
        </Sidebar.Pushable>
      </React.Fragment>
    )
  }
}

const sidebarItems = [
  {
    icon: 'wrench',
    title: 'Utilities',
    header: 'Upgrade',
		subHeader: 'Upgrade the runtime using the UpgradeKey module',
		content: <UtilitiesView />
  },
  { icon: 'object group outline', title: 'Overview', subHeader: '' },
  { icon: 'file alternate', title: 'Invoice', subHeader: '' },
  { icon: 'tint', title: 'Purchase Order', subHeader: '' },
  { icon: 'barcode', title: 'Products', subHeader: '' },
  {
    icon: 'sitemap',
    title: 'Partners',
    header: 'Address Book',
    subHeader: 'Inspect the status of any account and name it for later use',
		active: true,
		content: <AddressBookView />
  },
  {
    icon: 'money',
    title: 'Wallet',
    subHeader: 'Manage your secret keys',
		active: true,
		content: <WalletView />
  },
  { icon: 'crop', title: 'Adjustments', subHeader: '' },
  {
    icon: 'dollar sign',
    title: 'Payment',
    header: 'Send',
    subHeader: 'Send funds from your account to another',
		active: true,
		content: <SendFundsView />
  },
  { icon: 'edit', title: 'Manage Orders', subHeader: '' },
  { icon: 'pen square', title: 'Manage Invoices', subHeader: '' },
  { icon: 'bug', title: 'Disputed Items', subHeader: '' },
  { icon: 'settings', title: 'Settings', subHeader: '' }
]