import React from 'react';
require('semantic-ui-css/semantic.min.css');
const { generateMnemonic } = require('bip39')
import {Icon, Image, List, Label, Header, Segment, Divider, Button, Grid, Input} from 'semantic-ui-react';
import {Bond, TransformBond} from 'oo7';
import {ReactiveComponent, If, Rspan} from 'oo7-react';
import {calls, runtime, chain, system, runtimeUp, ss58Encode, ss58Decode, addressBook, secretStore} from 'oo7-substrate';
import Identicon from 'polkadot-identicon';
import {AccountIdBond, SignerBond} from './AccountIdBond.jsx';
import {BalanceBond} from './BalanceBond.jsx';
import {InputBond} from './InputBond.jsx';
import {TransactButton} from './TransactButton.jsx';
import {FileUploadBond} from './FileUploadBond.jsx';
import {StakingStatusLabel} from './StakingStatusLabel';
import {WalletList, SecretItem} from './WalletList';
import {AddressBookList} from './AddressBookList';
import {TransformBondButton} from './TransformBondButton';
import {Masthead} from './Masthead';
import {Pretty} from './Pretty';

/*Imported fragments to be rendered*/
import {SendFunds} from './SendFunds';
import {LedgerTransactionList} from './LedgerTransactionList';
import {Invoice} from './Invoice';

/*Logos */
import BayerLogo from './assets/bayer.png';
import BungeLogo from'./assets/bunge.png';
import CargillLogo from'./assets/cargill.png';
import IffLogoSmallLogo from'./assets/iff-logo-small.png';
import OfficeWorldLogo from'./assets/office-world.png';

export class App extends ReactiveComponent {
	constructor () {
		super([], { ensureRuntime: runtimeUp })

		// For debug only.
		window.runtime = runtime;
		window.secretStore = secretStore;
		window.addressBook = addressBook;
		window.chain = chain;
		window.calls = calls;
		window.LedgerTransactionList = LedgerTransactionList;
		window.Invoice = Invoice;
		window.that = this;


		this.nick = new Bond;
		this.lookup = new Bond;
		this.seed = new Bond;
		this.seedAccount = this.seed.map(s => s ? secretStore().accountFromPhrase(s) : undefined)
		this.seedAccount.use()

}

	round(value, decimals) {
		return Number(Math.round(value +'e'+ decimals) +'e-'+ decimals).toFixed(decimals);
	}


	readyRender() {

		return (<div>
			<div>
				<Label>Name <Label.Detail>
					<Pretty className="value" value={"Totem "}/><Pretty className="value" value={"v 0.0.1"}/>
				</Label.Detail></Label>
				<Label>Chain <Label.Detail>
					<Pretty className="value" value={system.chain}/>
				</Label.Detail></Label>
				<Label>Runtime <Label.Detail>
					<Pretty className="value" value={" totem-node "}/><Pretty className="value" value={"v1"}/> (
						<Pretty className="value" value={" Demo "}/>
					) 
				</Label.Detail></Label>
				<Label>Height <Label.Detail>
					<Pretty className="value" value={chain.height}/>
				</Label.Detail></Label>
				<Label>Authorities <Label.Detail>
					<Rspan className="value">{
						runtime.core.authorities.mapEach(a => <Identicon key={a} account={a} size={16}/>)
					}</Rspan>
				</Label.Detail></Label>
				<Label>Last Claim Nr. <Label.Detail>
					<Pretty className="value" value={runtime.totem.claimsCount}/>
				</Label.Detail></Label>
			</div>

			<Image src={OfficeWorldLogo} size='small' />

{/* Ledger Panel */}
			<Segment style={{margin: '1em'}} padded>
				<Masthead />
			</Segment>
			<Divider hidden />	
			<Segment style={{margin: '1em'}} padded>
				<LedgerTransactionList/>
			</Segment>
			<Divider hidden />

{/* Invoice Panel */ }
			<Segment style={{margin: '1em'}} padded>
				<Invoice/>
			</Segment>
			<Divider hidden />
			<Segment style={{margin: '1em'}} padded>
				<Header as='h2'>
					<Icon name='search' />
					<Header.Content>
						Address Book
						<Header.Subheader>Inspect the status of any account and name it for later use</Header.Subheader>
					</Header.Content>
				</Header>
					<div style={{paddingBottom: '1em'}}>
					<div style={{fontSize: 'small'}}>lookup account</div>
					<AccountIdBond bond={this.lookup}/>
					<If condition={this.lookup.ready()} then={<div>
						<Label>Balance
							<Label.Detail>
								<Pretty value={runtime.balances.balance(this.lookup)}/>
							</Label.Detail>
						</Label>
						<Label>Nonce
							<Label.Detail>
								<Pretty value={runtime.system.accountNonce(this.lookup)}/>
							</Label.Detail>
						</Label>
						<Label>Address
							<Label.Detail>
								<Pretty value={this.lookup}/>
							</Label.Detail>
						</Label>
					</div>}/>
				</div>
				<div style={{paddingBottom: '1em'}}>
					<div style={{fontSize: 'small'}}>name</div>
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
				<div style={{paddingBottom: '1em'}}>
					<AddressBookList/>
				</div>
			</Segment>
			<Divider hidden />	
			<Segment style={{margin: '1em'}} padded>
				<SendFunds/>
			</Segment>
			<Divider hidden />	

		</div>
		);
	}
}

