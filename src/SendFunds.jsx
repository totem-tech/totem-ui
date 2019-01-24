import React from 'react';
require('semantic-ui-css/semantic.min.css');
import {Icon, Image, List, Label, Header, Segment, Divider, Button, Grid, Input} from 'semantic-ui-react';
import {Bond, TransformBond} from 'oo7';
import {ReactiveComponent, If, Rspan} from 'oo7-react';
import {calls, runtime, chain, system, runtimeUp, ss58Encode, ss58Decode, addressBook, secretStore} from 'oo7-substrate';
import {Pretty} from './Pretty';
import {AccountIdBond, SignerBond} from './AccountIdBond.jsx';
import {BalanceBond} from './BalanceBond.jsx';
import {InputBond} from './InputBond.jsx';
import {TransactButton} from './TransactButton.jsx';


// MyTemplateName should be the same as the filename
export class SendFunds extends ReactiveComponent {
	constructor () {
		super([], { ensureRuntime: runtimeUp })

		window.runtime = runtime;
		window.secretStore = secretStore;
		window.addressBook = addressBook;
		window.chain = chain;
		window.calls = calls;
	
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
	
	readyRender() {
		return (<React.Fragment>
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
			}}/>
		</React.Fragment>)
	}
}