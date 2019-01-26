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

export class TestAmount extends ReactiveComponent {
	constructor () {
		super()
			this.multiply = (x, y) => x * y;

			this.sender = new Bond;
			this.quantity = new Bond;
			this.unitPrice = new Bond;
			
			// Default Values
			this.sender.changed(ss58Decode('5CgFZFJ5oeQju7uTyaKjJgogF1grC9bECbFTJP8ZXKEupM7x'));
			this.unitPrice.changed(1988700);

			// creates a transform bond
			this.amount = Bond.all([this.quantity, this.unitPrice]).map(([a, b]) => Number(this.round(this.multiply(a, b), 0)));

			// transform for custom types in module
			addCodecTransform('IntegerBalance', 'i64');
	}

	getNumeratorDenominator(x) {
		let n = 10000;
		if (x) {
			return n;
		} else {
			return 1/n;
		};
	}

	round(value, decimals) {
    	return Number(Math.round(value +'e'+ decimals) +'e-'+ decimals).toFixed(decimals);
	}

	decimal_to_int(n) {
		return Number(this.round((n * this.getNumeratorDenominator(true)), 0)); 
	}

	processQuantity() {
		// Horrible hack in two parts until I figure out how to do React Display formatting 
		// Handle Displayed Amounts (decimals)
		const d_q = document.getElementById('quantity');

		// get latest values - need to check that this.unitPrice._value; is not null 
		this.quantity.changed(this.decimal_to_int(d_q.value)); 
	
	}
	
	readyRender() {
		return (
			<React.Fragment>
				<div style={{textAlign: 'left', paddingBottom: '8px'}}>
					<Label size='small'>On-Chain Data Amount:  
			    		<Label.Detail>
			      			<Pretty value={runtime.totemtests.testIntegerBalanceStorage}/>
			    		</Label.Detail>
					</Label>
				</div>
				
				<div style={{textAlign: 'left', paddingBottom: '8px'}}>
					<Label size='small'>On-Chain Data Amount by sender:  
			    		<Label.Detail>
			      			<Pretty value={runtime.totemtests.testIntegerBalanceStorageForAccount(this.sender)}/>
			    		</Label.Detail>
					</Label>
				</div>

	    		<div style={{fontSize: 'small'}}>Enter Quantity</div>
				<div>
					<Input
						id='quantity'
						fluid
						placeholder='Enter quantity'
						onBlur={this.processQuantity()}
					/>
				</div>	
				
				<TransactButton
						content="Send Index"
						tx={{
							sender: this.sender,
							call: calls.totemtests.testAmount(this.amount)
						}}
					/>			
			</React.Fragment>
		)
	}
}