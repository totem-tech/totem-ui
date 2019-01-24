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

/*Imported fragments to be rendered*/
import {SendFunds} from './SendFunds';
import {LedgerTransactionList} from './LedgerTransactionList';
import {Invoice} from './Invoice';

/* Test */
import {OldInvoice} from './OldInvoice';
// import {Test} from './Test';
// import {RespondentTest} from './RespondentTest';
// import {NullStorageTest} from './NullStorageTest';

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
			</div>

			<Image src={OfficeWorldLogo} size='small' />
		

			<Segment style={{margin: '1em'}} padded>
				<OldInvoice/>
			</Segment>
			<Divider hidden />

		</div>
		);
	}
}

