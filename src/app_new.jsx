import React from 'react'
require('semantic-ui-css/semantic.min.css')
import { Accordion, Button, Container, Checkbox, Divider, Header, Icon, Label, List, Segment, Sidebar } from 'semantic-ui-react'
import { Bond, TransformBond } from 'oo7'
import { ReactiveComponent, If, Rspan } from 'oo7-react'
import {
	calls, runtime, chain, system, runtimeUp, ss58Decode, ss58Encode, pretty,
	addressBook, secretStore, metadata, nodeService, bytesToHex, hexToBytes, AccountId
} from 'oo7-substrate'
import Identicon from 'polkadot-identicon'
import { AccountIdBond, SignerBond } from './AccountIdBond.jsx'
import { BalanceBond } from './BalanceBond.jsx'
import { InputBond } from './InputBond.jsx'
import { TransactButton } from './TransactButton.jsx'
import { FileUploadBond } from './FileUploadBond.jsx'
import { StakingStatusLabel } from './StakingStatusLabel'
import { WalletList, SecretItem } from './WalletList'
import { AddressBookList } from './AddressBookList'
import { TransformBondButton } from './TransformBondButton'
import { Pretty } from './Pretty'
// Components
import AddressBookView from './components/AddressBookView'
import ChainInfoBar from './components/ChainInfoBar'
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
			isMobile: false,
			sidebarCollapsed: false,
			sidebarVisible: true
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
		return (
			<React.Fragment>
				<ChainInfoBar />
				<PageHeader logo={TotemButtonLogo} />
        		<ChatWidget />

				<Sidebar.Pushable as={Container} fluid style={styles.pushable}>
					<SidebarLeft
						items={this.state.sidebarItems}
						isMobile={this.state.isMobile}
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
						{this.state.sidebarItems.map((item, i) => (
						<div ref={item.elementRef} key={i} hidden={!item.active} style={styles.spaceBelow}>
							<ContentSegment {...item} onClose={this.handleClose} index={i} />
						</div>
						))}
					</Sidebar.Pusher>
				</Sidebar.Pushable>
				<hr />
				<hr />

				<Heading />
				<WalletSegment />
				<Divider hidden />
				<AddressBookSegment />
				<Divider hidden />
				<FundingSegment />
				<Divider hidden />
				<UpgradeSegment />
				<Divider hidden />
				<PokeSegment />
				<Divider hidden />
				<TransactionsSegment />
			</React.Fragment>
		)
	}
}

class Heading extends React.Component {
	render() {
		return <div>
			<If
				condition={nodeService().status.map(x => !!x.connected)}
				then={<Label>Connected <Label.Detail>
					<Pretty className="value" value={nodeService().status.sub('connected')} />
				</Label.Detail></Label>}
				else={<Label>Not connected</Label>}
			/>
			<Label>Name <Label.Detail>
				<Pretty className="value" value={system.name} /> v<Pretty className="value" value={system.version} />
			</Label.Detail></Label>
			<Label>Chain <Label.Detail>
				<Pretty className="value" value={system.chain} />
			</Label.Detail></Label>
			<Label>Runtime <Label.Detail>
				<Pretty className="value" value={runtime.version.specName} /> v<Pretty className="value" value={runtime.version.specVersion} /> (
					<Pretty className="value" value={runtime.version.implName} /> v<Pretty className="value" value={runtime.version.implVersion} />
				)
			</Label.Detail></Label>
			<Label>Height <Label.Detail>
				<Pretty className="value" value={chain.height} /> (with <Pretty className="value" value={chain.lag} /> lag)
			</Label.Detail></Label>
			<Label>Authorities <Label.Detail>
				<Rspan className="value">{
					runtime.core.authorities.mapEach((a, i) => <Identicon key={bytesToHex(a) + i} account={a} size={16} />)
				}</Rspan>
			</Label.Detail></Label>
			<Label>Total issuance <Label.Detail>
				<Pretty className="value" value={runtime.balances.totalIssuance} />
			</Label.Detail></Label>
		</div>
	}
}

class WalletSegment extends React.Component {
	constructor() {
		super()
		this.seed = new Bond;
		this.seedAccount = this.seed.map(s => s ? secretStore().accountFromPhrase(s) : undefined)
		this.seedAccount.use()
		this.name = new Bond;
	}
	render() {
		return <Segment style={{ margin: '1em' }}>
			<Header as='h2'>
				<Icon name='key' />
				<Header.Content>
					Wallet
					<Header.Subheader>Manage your secret keys</Header.Subheader>
				</Header.Content>
			</Header>
			<div style={{ paddingBottom: '1em' }}>
				<div style={{ fontSize: 'small' }}>seed</div>
				<InputBond
					bond={this.seed}
					reversible
					placeholder='Some seed for this key'
					validator={n => n || null}
					action={<Button content="Another" onClick={() => this.seed.trigger(secretStore().generateMnemonic())} />}
					iconPosition='left'
					icon={<i style={{ opacity: 1 }} className='icon'><Identicon account={this.seedAccount} size={28} style={{ marginTop: '5px' }} /></i>}
				/>
			</div>
			<div style={{ paddingBottom: '1em' }}>
				<div style={{ fontSize: 'small' }}>name</div>
				<InputBond
					bond={this.name}
					placeholder='A name for this key'
					validator={n => n ? secretStore().map(ss => ss.byName[n] ? null : n) : null}
					action={<TransformBondButton
						content='Create'
						transform={(name, seed) => secretStore().submit(seed, name)}
						args={[this.name, this.seed]}
						immediate
					/>}
				/>
			</div>
			<div style={{ paddingBottom: '1em' }}>
				<WalletList />
			</div>
		</Segment>
	}
}

class AddressBookSegment extends React.Component {
	constructor() {
		super()
		this.nick = new Bond
		this.lookup = new Bond
	}
	render() {
		return <Segment style={{ margin: '1em' }} padded>
			<Header as='h2'>
				<Icon name='search' />
				<Header.Content>
					Address Book
					<Header.Subheader>Inspect the status of any account and name it for later use</Header.Subheader>
				</Header.Content>
			</Header>
			<div style={{ paddingBottom: '1em' }}>
				<div style={{ fontSize: 'small' }}>lookup account</div>
				<AccountIdBond bond={this.lookup} />
				<If condition={this.lookup.ready()} then={<div>
					<Label>Balance
						<Label.Detail>
							<Pretty value={runtime.balances.balance(this.lookup)} />
						</Label.Detail>
					</Label>
					<Label>Nonce
						<Label.Detail>
							<Pretty value={runtime.system.accountNonce(this.lookup)} />
						</Label.Detail>
					</Label>
					<If condition={runtime.indices.tryIndex(this.lookup, null).map(x => x !== null)} then={
						<Label>Short-form
							<Label.Detail>
								<Rspan>{runtime.indices.tryIndex(this.lookup).map(i => ss58Encode(i) + ` (index ${i})`)}</Rspan>
							</Label.Detail>
						</Label>
					} />
					<Label>Address
						<Label.Detail>
							<Pretty value={this.lookup} />
						</Label.Detail>
					</Label>
				</div>} />
			</div>
			<div style={{ paddingBottom: '1em' }}>
				<div style={{ fontSize: 'small' }}>name</div>
				<InputBond
					bond={this.nick}
					placeholder='A name for this address'
					validator={n => n ? addressBook().map(ss => ss.byName[n] ? null : n) : null}
					action={<TransformBondButton
						content='Add'
						transform={(name, account) => { addressBook().submit(account, name); return true }}
						args={[this.nick, this.lookup]}
						immediate
					/>}
				/>
			</div>
			<div style={{ paddingBottom: '1em' }}>
				<AddressBookList />
			</div>
		</Segment>
	}
}

class FundingSegment extends React.Component {
	constructor() {
		super()

		this.source = new Bond;
		this.amount = new Bond;
		this.destination = new Bond;
	}
	render() {
		return <Segment style={{ margin: '1em' }} padded>
			<Header as='h2'>
				<Icon name='send' />
				<Header.Content>
					Send Funds
					<Header.Subheader>Send funds from your account to another</Header.Subheader>
				</Header.Content>
			</Header>
			<div style={{ paddingBottom: '1em' }}>
				<div style={{ fontSize: 'small' }}>from</div>
				<SignerBond bond={this.source} />
				<If condition={this.source.ready()} then={<span>
					<Label>Balance
						<Label.Detail>
							<Pretty value={runtime.balances.balance(this.source)} />
						</Label.Detail>
					</Label>
					<Label>Nonce
						<Label.Detail>
							<Pretty value={runtime.system.accountNonce(this.source)} />
						</Label.Detail>
					</Label>
				</span>} />
			</div>
			<div style={{ paddingBottom: '1em' }}>
				<div style={{ fontSize: 'small' }}>to</div>
				<AccountIdBond bond={this.destination} />
				<If condition={this.destination.ready()} then={
					<Label>Balance
						<Label.Detail>
							<Pretty value={runtime.balances.balance(this.destination)} />
						</Label.Detail>
					</Label>
				} />
			</div>
			<div style={{ paddingBottom: '1em' }}>
				<div style={{ fontSize: 'small' }}>amount</div>
				<BalanceBond bond={this.amount} />
			</div>
			<TransactButton
				content="Send"
				icon='send'
				tx={{
					sender: runtime.indices.tryIndex(this.source),
					call: calls.balances.transfer(runtime.indices.tryIndex(this.destination), this.amount),
					compact: false,
					longevity: true
				}}
			/>
		</Segment>
	}
}

class UpgradeSegment extends React.Component {
	constructor() {
		super()
		this.conditionBond = runtime.metadata.map(m =>
			m.modules && m.modules.some(o => o.name === 'sudo')
			|| m.modules.some(o => o.name === 'upgrade_key')
		)
		this.runtime = new Bond
	}
	render() {
		return <If condition={this.conditionBond} then={
			<Segment style={{ margin: '1em' }} padded>
				<Header as='h2'>
					<Icon name='search' />
					<Header.Content>
						Runtime Upgrade
						<Header.Subheader>Upgrade the runtime using the UpgradeKey module</Header.Subheader>
					</Header.Content>
				</Header>
				<div style={{ paddingBottom: '1em' }}></div>
				<FileUploadBond bond={this.runtime} content='Select Runtime' />
				<TransactButton
					content="Upgrade"
					icon='warning'
					tx={{
						sender: runtime.sudo
							? runtime.sudo.key
							: runtime.upgrade_key.key,
						call: calls.sudo
							? calls.sudo.sudo(calls.consensus.setCode(this.runtime))
							: calls.upgrade_key.upgrade(this.runtime)
					}}
				/>
			</Segment>
		} />
	}
}

class PokeSegment extends React.Component {
	constructor () {
		super()
		this.storageKey = new Bond;
		this.storageValue = new Bond;
	}
	render () {
		return <If condition={runtime.metadata.map(m => m.modules && m.modules.some(o => o.name === 'sudo'))} then={
			<Segment style={{margin: '1em'}} padded>
				<Header as='h2'>
					<Icon name='search' />
					<Header.Content>
						Poke
						<Header.Subheader>Set a particular key of storage to a particular value</Header.Subheader>
					</Header.Content>
				</Header>
				<div style={{paddingBottom: '1em'}}></div>
				<InputBond bond={this.storageKey} placeholder='Storage key e.g. 0xf00baa' />
				<InputBond bond={this.storageValue} placeholder='Storage value e.g. 0xf00baa' />
				<TransactButton
					content="Poke"
					icon='warning'
					tx={{
						sender: runtime.sudo ? runtime.sudo.key : null,
						call: calls.sudo ? calls.sudo.sudo(calls.consensus.setStorage([[this.storageKey.map(hexToBytes), this.storageValue.map(hexToBytes)]])) : null
					}}
				/>
			</Segment>
		}/>		
	}
}

class TransactionsSegment extends React.Component {
	constructor () {
		super()

		this.txhex = new Bond
	}

	render () {
		return <Segment style={{margin: '1em'}} padded>
			<Header as='h2'>
				<Icon name='certificate' />
				<Header.Content>
					Transactions
					<Header.Subheader>Send custom transactions</Header.Subheader>
				</Header.Content>
			</Header>
			<div style={{paddingBottom: '1em'}}>
				<div style={{paddingBottom: '1em'}}>
					<div style={{fontSize: 'small'}}>Custom Transaction Data</div>
					<InputBond bond={this.txhex}/>
				</div>
				<TransactButton tx={this.txhex.map(hexToBytes)} content="Publish" icon="sign in" />
			</div>
		</Segment>
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
	  active: false,
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
	  icon: "wrench", title: "Utilities",
	  header: "Upgrade",
	  subHeader: "Upgrade the runtime using the UpgradeKey module",
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
	mainContent: {
	  overflow: 'hidden auto',
	  maxHeight: '100%',
	  scrollBehavior: 'smooth',
	  padding: '0 50px'
	},
	mainContentCollapsed: {
	  overflow: 'hidden auto',
	  maxHeight: '100%',
	  scrollBehavior: 'smooth',
	  padding: '0 50px 52px'
	},
	spaceBelow: {
	  marginBottom: 15
	}
  }