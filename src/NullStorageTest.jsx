import React from 'react';
require('semantic-ui-css/semantic.min.css');
import {Label} from 'semantic-ui-react';
import {Bond} from 'oo7';
import {ReactiveComponent, If} from 'oo7-react';
import {calls, runtime, ss58Encode, ss58Decode, pretty} from 'oo7-substrate';
import {AccountIdBond} from './AccountIdBond.jsx';
import {TransactButton} from './TransactButton.jsx';
import {Pretty} from './Pretty';

export class NullStorageTest extends ReactiveComponent {
	constructor () {
		super()
		this.signer = new Bond; 
		this.account_id = new Bond; 		

		this.signer.changed(ss58Decode('5CgFZFJ5oeQju7uTyaKjJgogF1grC9bECbFTJP8ZXKEupM7x'));
		this.defaultValue = new Bond;			
		this.defaultValue.changed(ss58Decode('5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUppTZ')); // default null account			

		this.isNull = this.isNull.bind(this);		
		this.onNullSetDefault = this.onNullSetDefault.bind(this);

		// this.storageValue = new Bond;
		this.storageValue = Bond.all([runtime.nullstoragetest.readAccount,
		// this.storageValue = Bond.all([runtime.totemtests.testAccount,
								this.defaultValue]
								).map(([a, b]) => 	
								this.onNullSetDefault(this.isNull(a, b), 
								// runtime.totemtests.testAccount, 
								runtime.nullstoragetest.readAccount, 
								'0'));
	}

	isNull (a, b) {


		console.log(ss58Encode(a));
		console.log(ss58Encode(b));
		if (ss58Encode(a) === ss58Encode(b) || !a ) {
			return true;
		} else {
			return false;
		};
	}

	onNullSetDefault(x, a, b) {
		if (x) {
			return b;
		} else {
			return a;
		}
	}



	readyRender() {
		return (
				<div>
				<div style={{paddingBottom: '1em'}}>	
					<AccountIdBond 
					bond={this.account_id}
					fluid
					placeholder='Test Null Storage'
					/>
				<If condition={this.account_id.ready()} then={
					<Label>Validate address
						<Label.Detail>
							<Pretty value={this.account_id}/>
						</Label.Detail>
					</Label>
				}/>
				</div>
					<Label size='small'>On chain storage value:  
			      		<Label.Detail>
			      			<Pretty value={this.storageValue}/>
			    		</Label.Detail>
					</Label>
				<div>	    
			  	<TransactButton
			    content='Save Account ID'
			    icon='send'
			    tx={{
			      sender: this.signer,
			      call: calls.nullstoragetest.addAccount(this.account_id)}}
			  	/>
			 	</div>			
			</div>
		)
	}
}


