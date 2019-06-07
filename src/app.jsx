// TODO This needs to be cleaned up later. 

// require('semantic-ui-css/semantic.min.css');
// const { generateMnemonic } = require('bip39')
import {Container, Menu, Sidebar, Icon, Image, List, Label, Header, Segment, Divider, Button, Grid, Input} from 'semantic-ui-react';
import {Bond, TransformBond} from 'oo7';
import {ReactiveComponent, If, Rspan} from 'oo7-react';
import {calls, runtime, chain, system, runtimeUp, ss58Encode, ss58Decode, addressBook, secretStore} from 'oo7-substrate';
import Identicon from 'polkadot-identicon';
// import {AccountIdBond, SignerBond} from './AccountIdBond.jsx';
// import {BalanceBond} from './BalanceBond.jsx';
// import {InputBond} from './InputBond.jsx';
// import {TransactButton} from './TransactButton.jsx';
// import {FileUploadBond} from './FileUploadBond.jsx';
// import {StakingStatusLabel} from './StakingStatusLabel';
// import {WalletList, SecretItem} from './WalletList';
// import {AddressBookList} from './AddressBookList';
// import {TransformBondButton} from './TransformBondButton';

import React from "react";
// import { Container, Menu, Sidebar, Label } from "semantic-ui-react";
// import { Bond } from "oo7";
// import { ReactiveComponent } from "oo7-react";
// import { calls, runtime, chain, runtimeUp, addressBook, secretStore } from "oo7-substrate";
import {Pretty} from './Pretty';
import SidebarLeft from "./components/SidebarLeft";
import ContentSegment from "./components/ContentSegment";
import PageHeader from "./components/PageHeader";
import WalletView from "./components/WalletView";
import SendFundsView from "./components/SendFundsView";
import AddressBookView from "./components/AddressBookView";
import UtilitiesView from "./components/UtilitiesView";
import SystemStatus from "./components/SystemStatus";
import ChatWidget from './components/ChatWidget'
import {LedgerTransactionList} from './LedgerTransactionList';
import {Invoice} from './Invoice';
// Images
import TotemButtonLogo from'./assets/totem-button-grey.png';
import { addWatcher } from './services/data'

export class App extends ReactiveComponent {
  constructor() {
    super([], { ensureRuntime: runtimeUp, secretStore: secretStore() });

    // custom types
		addCodecTransform('ClaimIndex', 'u64');

    // For debug only.
    window.runtime = runtime;
    window.secretStore = secretStore;
    window.addressBook = addressBook;
    window.chain = chain;
    window.calls = calls;
    window.that = this;
    window.system = system

    this.source = new Bond();
    this.amount = new Bond();
    this.destination = new Bond();
    this.nick = new Bond();
    this.lookup = new Bond();
    this.name = new Bond();
    this.seed = new Bond();
    this.seedAccount = this.seed.map(s =>
      s ? secretStore().accountFromPhrase(s) : undefined
    );
    this.seedAccount.use();
    this.runtime = new Bond();

    this.state = {
      sidebarItems: [...sidebarItems].map(item => {
        item.elementRef = React.createRef();
        return item;
      }),
      isMobile: false,
      sidebarCollapsed: true,
      sidebarVisible: true
	  };

    this.handleSidebarToggle = this.handleSidebarToggle.bind(this)
    this.toggleMenuItem = this.toggleMenuItem.bind(this)
    this.handleClose = this.handleClose.bind(this)
  }

  // hack to format as a currency. Needs to go in a seperate Display Formatting Utilities file.
  round(value, decimals) {
	  return Number(Math.round(value +'e'+ decimals) +'e-'+ decimals).toFixed(decimals);
  }

  handleSidebarToggle(sidebarCollapsed, sidebarVisible) {
    this.setState({ sidebarCollapsed, sidebarVisible });
  }

  toggleMenuItem(index) {
    const items = [...this.state.sidebarItems];
    items[index].active = !items[index].active;
    this.setState({ sidebarItems: items });
    items[index].active && setTimeout(() => {
      // Scroll down to the content segment
      document.getElementById("main-content").scrollTo(0, items[index].elementRef.current.offsetTop);
    }, 100);
  }

  handleClose(index) {
    const sidebarItems = this.state.sidebarItems
    if (!sidebarItems[index]) return;
    sidebarItems[index].active = false
    this.setState({sidebarItems})
  }

  componentDidMount() {
    [
      'chain_height',
      'system_chain',
      'runtime_totem_claimsCount',
      'runtime_core_authorities'
    ].forEach(key => addWatcher(key, (v, oV) => {
      const data = {}
      data[key] = v
      this.setState(data)
    }))
  }

  readyRender() {
    return (
      <React.Fragment>
		 			<div>
				<Label>Name <Label.Detail>
					<Pretty className="value" value={"Totem "}/><Pretty className="value" value={"v 0.0.1"}/>
				</Label.Detail></Label>
				<Label>Chain <Label.Detail>
					<Pretty className="value" value={this.state.system_chain}/>
				</Label.Detail></Label>
				<Label>Runtime <Label.Detail>
					<Pretty className="value" value={" totem-node "}/><Pretty className="value" value={"v1"}/> (
						<Pretty className="value" value={" Demo "}/>
					) 
				</Label.Detail></Label>
				<Label>Height <Label.Detail>
					<Pretty className="value" value={this.state.chain_height}/>
				</Label.Detail></Label>
				<Label>Authorities <Label.Detail>
					<Rspan className="value">{
						this.state.runtime_core_authorities && this.state.runtime_core_authorities.map(a => <Identicon key={a} account={a} size={16}/>)
					}</Rspan>
				</Label.Detail></Label>
				<Label>Last Claim Nr. <Label.Detail>
					<Pretty className="value" value={this.state.runtime_totem_claimsCount}/>
				</Label.Detail></Label>
			</div> 




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
      </React.Fragment>
    );
  }
}

const sidebarItems = [
  { icon: "object group outline", title: "Overview", subHeader: "", active: true, content: <LedgerTransactionList />},
  {
    icon: "sitemap", title: "Partners",
    header: "Vendors and Customers",
    subHeader: "Inspect the status of any account and name it for later use",
    active: false,
    content: <AddressBookView />
  },
  { icon: "file alternate", title: "Invoice", subHeader: "This demo generates an invoice entry in customer, vendor, and tax jurisdiction accounting records.", active: false, content: <Invoice /> },
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
];


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