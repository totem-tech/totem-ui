import React from 'react';
require('semantic-ui-css/semantic.min.css');
import {Label} from 'semantic-ui-react';
import Identicon from 'polkadot-identicon';
import {Bond} from 'oo7';
import {ReactiveComponent, If} from 'oo7-react';
import {calls, runtime, ss58Encode, ss58Decode} from 'oo7-substrate';
import {AccountIdBond} from './AccountIdBond.jsx';
import {TransactButton} from './TransactButton.jsx';
import {Pretty} from './Pretty';

export class RespondentTest extends ReactiveComponent {
	constructor () {
		super()
		this.claimant = new Bond; 
		this.customer = new Bond; 		
		this.claimant.changed(ss58Decode('5CgFZFJ5oeQju7uTyaKjJgogF1grC9bECbFTJP8ZXKEupM7x'));
	}
	
	render() {
		return (<div>


				 <div style={{paddingBottom: '1em'}}>	
					<AccountIdBond 
					bond={this.customer}
					fluid
					placeholder='Test respondent'
					/>
				<If condition={this.customer.ready()} then={
					<Label>Validate address
						<Label.Detail>
							<Pretty value={this.customer}/>
						</Label.Detail>
					</Label>
				}/>
				</div>


					<Label size='small'>On chain storage value:  
			    		<Label.Detail>
			      			<Pretty value={runtime.totemtests.testAccount}/>
			    		</Label.Detail>
					</Label>


				<div>	    
			  	<TransactButton
			    content='Test Respondent'
			    icon='send'
			    tx={{
			      sender: this.claimant,
			      call: calls.totemtests.testRespondent(this.customer)}}
			  	/>
			 	</div>			



		</div>)
	}
}


					// <Label size='small'>On chain storage value:  
			  //   		<Label.Detail>
			  //     			<Pretty value={runtime.totemtests.testAccount}/>
			  //   		</Label.Detail>
					// </Label>
				


