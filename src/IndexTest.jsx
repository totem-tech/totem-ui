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


export class IndexTest extends ReactiveComponent {
	constructor () {
		super()			
			addCodecTransform("AnIndexNr", "u64");
			this.sender = new Bond;
			this.my_index = new Bond;
			// Default Values
			this.sender.changed(ss58Decode('5CgFZFJ5oeQju7uTyaKjJgogF1grC9bECbFTJP8ZXKEupM7x'));
			this.preValidateInputIndex = this.preValidateInputIndex.bind(this);		
	}

	preValidateInputIndex() {
		const index_id = document.getElementById('indexId') ;

		if (!index_id) {
			this.my_index.changed(0);	
		} else {
			this.my_index.changed(Math.abs(Number(index_id.value)));
		}

	}
	
	readyRender() {
		return (
			<React.Fragment>
				<div style={{textAlign: 'left', paddingBottom: '8px'}}>
					<Label size='small'>On-Chain Data Index Counter:  
			    		<Label.Detail>
			      			<Pretty value={runtime.totemtests.testIndexCount}/>
			    		</Label.Detail>
					</Label>
				</div>

				<div style={{textAlign: 'left', paddingBottom: '8px'}}>
					<Label size='small'>On-Chain Data Index by Account:  
			    		<Label.Detail>
			      			<Pretty value={runtime.totemtests.testIndexByAccount(this.sender)}/>
			    		</Label.Detail>
					</Label>
				</div>

			  			<div>
			  				<div style={{fontSize: 'small'}}>Enter an Index</div>
							<div>
							<Input
								id='indexId'
								onBlur={this.preValidateInputIndex}
								fluid
								default='0'
								placeholder='Enter an Index (optional)'
							/>
							</div>
						</div>
				
				<TransactButton
						content="Send Index"
						tx={{
							sender: this.sender,
							call: calls.totemtests.testAnIndex(this.my_index)
						}}
				/>			
			</React.Fragment>)
	}
}