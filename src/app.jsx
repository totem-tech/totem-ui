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
import {Pretty} from './Pretty';
/*Imported chunks to be rendered*/
import {LedgerTransactionList} from './LedgerTransactionList';
import {Invoice} from './Invoice';
//import {Test} from './Test';
import {RespondentTest} from './RespondentTest';
import {NullStorageTest} from './NullStorageTest';
// import {BalanceTest} from './BalanceTest';

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

		this.source = new Bond;
		this.amount = new Bond;
		this.destination = new Bond;
		this.nick = new Bond;
		this.lookup = new Bond;
		this.name = new Bond;
		this.seed = new Bond;
		this.seedAccount = this.seed.map(s => s ? secretStore().accountFromPhrase(s) : undefined)
		this.seedAccount.use()
		this.runtime = new Bond;


		this.netAmount = new Bond; 
		this.taxJusridiction = new Bond; 
		this.taxAmount = new Bond; 
		this.invoiceRef = new Bond; 
		this.documentRef = new Bond;
			
		this.claimant = new Bond;  		
		this.claimant = ss58Decode('5CgFZFJ5oeQju7uTyaKjJgogF1grC9bECbFTJP8ZXKEupM7x');
		this.netAmount = new Bond;
		this.setNetAmount = this.setNetAmount.bind(this)



	}
	
	setNetAmount(n) {
		if (n < 10)
		{
			this.netAmount.changed(10);
		}
		else 
		{	
			this.netAmount.changed(100);			
		}

	}



	readyRender() {

		return (<div>
			<div>
				<Label>Name <Label.Detail>
					<Pretty className="value" value={"Avalanche "}/><Pretty className="value" value={"v 0.0.1"}/>
				</Label.Detail></Label>
				<Label>Chain <Label.Detail>
					<Pretty className="value" value={system.chain}/>
				</Label.Detail></Label>
				<Label>Runtime <Label.Detail>
					<Pretty className="value" value={" avalanche-node "}/><Pretty className="value" value={"v1"}/> (
						<Pretty className="value" value={" IFF Demo "}/>
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
			</div>

			<Image src={OfficeWorldLogo} size='small' />
			
			<Segment style={{margin: '1em'}}>
			<div>
				<NullStorageTest/>
			</div>				
			</Segment>			
			<Divider hidden />

			<Segment style={{margin: '1em'}}>
			<div>
				<RespondentTest/>
			</div>				
			</Segment>			
			<Divider hidden />
			
			<Segment style={{margin: '1em'}}>
			<div>
				<LedgerTransactionList/>
			</div>				
			</Segment>			
			<Divider hidden />

			<Segment style={{margin: '1em'}}>
			<div>
				<Invoice/>
			</div>				
			</Segment>			
			<Divider hidden />
			
			<Segment style={{margin: '1em'}} padded>
				<Header as='h2'>
					<Icon name='send' />
					<Header.Content>
						Send Funds
						<Header.Subheader>Send funds from your account to another</Header.Subheader>
					</Header.Content>
				</Header>
  				<div style={{paddingBottom: '1em'}}>
					<div style={{fontSize: 'small'}}>from</div>
					<SignerBond bond={this.source}/>
					<If condition={this.source.ready()} then={<span>
						<Label>Balance
							<Label.Detail>
								<Pretty value={runtime.balances.balance(this.source)}/>
							</Label.Detail>
						</Label>
						<Label>Nonce
							<Label.Detail>
								<Pretty value={runtime.system.accountNonce(this.source)}/>
							</Label.Detail>
						</Label>
					</span>}/>
				</div>
				<div style={{paddingBottom: '1em'}}>
					<div style={{fontSize: 'small'}}>to</div>
					<AccountIdBond bond={this.destination}/>
					<If condition={this.destination.ready()} then={
						<Label>Balance
							<Label.Detail>
								<Pretty value={runtime.balances.balance(this.destination)}/>
							</Label.Detail>
						</Label>
					}/>
				</div>
				<div style={{paddingBottom: '1em'}}>
					<div style={{fontSize: 'small'}}>amount</div>
					<BalanceBond bond={this.amount}/>
				</div>
				<TransactButton
					content="Send"
					icon='send'
					tx={{
						sender: runtime.indices.tryIndex(this.source),
						call: calls.balances.transfer(this.destination, this.amount)
					}}
				/>
			</Segment>



		</div>);
	}
}

