import React from 'react';
require('semantic-ui-css/semantic.min.css');
import {Icon, Image, List, Label, Header, Segment, Divider, Button, Grid, Input} from 'semantic-ui-react';
import {Bond, TransformBond} from 'oo7';
import {ReactiveComponent, If, Rspan} from 'oo7-react';
import {runtime, ss58Encode, ss58Decode, addCodecTransform, VecU8} from 'oo7-substrate';
import {InputBond} from './InputBond.jsx';
import {TransactButton} from './TransactButton.jsx';
import {AccountIdBond, SignerBond} from './AccountIdBond.jsx';
import {Pretty} from './Pretty';

// test_an_index
// test_account_id_save
// test_amount
// test_string_to_hash

export class TestAccountIdSave extends ReactiveComponent {
	constructor () {
		super()

			this.sender = new Bond;
			this.customer = new Bond;
			// Default Values
			this.sender.changed(ss58Decode('5CgFZFJ5oeQju7uTyaKjJgogF1grC9bECbFTJP8ZXKEupM7x'));
	}
	
	readyRender() {
		return (
			<React.Fragment>
				<div style={{textAlign: 'left', paddingBottom: '8px'}}>
					<Label size='small'>On-Chain Data Account ID:  
			    		<Label.Detail>
			      			<Pretty value={runtime.totemtests.testAccount}/>
			    		</Label.Detail>
					</Label>
				</div>

	  			<div>				
	    			<div style={{fontSize: 'small'}}>Lookup Customer by Name or Address</div>
	    			<div>
					<AccountIdBond 
						fluid
						bond={this.customer}
						placeholder='Search for customer'
					/>
					<If condition={this.customer.ready()} then={
						<Label>Validate address
							<Label.Detail>
								<Pretty value={this.customer}/>
							</Label.Detail>
						</Label>
					}/>
					</div>
				</div>
				
				<TransactButton
						content="Send Index"
						tx={{
							sender: this.sender,
							call: calls.totemtests.testAccountIdSave(this.customer)
						}}/>			
			</React.Fragment>)
	}
}