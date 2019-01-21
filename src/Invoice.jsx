import React from 'react';
require('semantic-ui-css/semantic.min.css');
import {Icon, Image, List, Label, Header, Segment, Divider, Button, Grid, Input} from 'semantic-ui-react';
import {Bond, TransformBond} from 'oo7';
import {runtime, ss58Encode, ss58Decode} from 'oo7-substrate';
import {ReactiveComponent, If, Rspan} from 'oo7-react';
import {InputBond} from './InputBond.jsx';
import {TransactButton} from './TransactButton.jsx';
import {AccountIdBond, SignerBond} from './AccountIdBond.jsx';
import {Pretty} from './Pretty';


export class Invoice extends ReactiveComponent {
	constructor () {
		super();

		this.multiply = (x, y) => x * y;
	 	this.sumUp = (a, b) => a + b;

		// Transaction Bonds
		this.claimant = new Bond; 
		this.customer = new Bond;  
		this.taxJusridiction = new Bond; 

		this.invoiceRef = new Bond; 
		this.documentRef = new Bond; 
		this.productReference = new Bond; // perform lookup to populate this.unitPrice 

		// Auxilliary display amounts for calculations
		this.quantity = new Bond; 

		// Calculated Amounts
		this.unitPrice = Bond.all([this.productReference])
							.map(([a]) => 
							this.lookupUnitPrice([a]));
		
		this.netAmount = Bond.mapAll([this.quantity, this.unitPrice], this.multiply);
		this.taxAmount = Bond.mapAll([this.netAmount, this.lookupTaxAmount(this.taxJusridiction)], this.multiply);
		this.totalAmount = Bond.mapAll([this.netAmount, this.taxAmount], this.sumUp);

		/*Default Values*/
		this.claimant.changed(ss58Decode('5CgFZFJ5oeQju7uTyaKjJgogF1grC9bECbFTJP8ZXKEupM7x')); // default office world account;		
		this.invoiceRef.changed(0);

	 	// * let netAmount = Bond.mapAll([this.quantity, this.unitPrice], this.multiply);

		this.round = this.round.bind(this);
		this.lookupUnitPrice = this.lookupUnitPrice.bind(this);
		this.lookupTaxAmount = this.lookupTaxAmount.bind(this);

	}

	round(value, decimals) {
    	return Number(Math.round(value +'e'+ decimals) +'e-'+ decimals).toFixed(decimals);
	}

	lookupUnitPrice(p) {
		console.log(p._value);
		let r = Bond.mapAll([p, 198.87], this.multiply);
		console.log(r);
		return r;
	}

	lookupTaxAmount(j) {
		return 0.21;
	}
	
	readyRender () {
		return (
			<React.Fragment>	
				<Header as='h2'>
				    <Header.Content>
				      Create or Amend an Invoice
				      <Header.Subheader>This demo generates an invoice entry in customer, vendor, and tax jurisdiction accounting records.</Header.Subheader>
				    </Header.Content>
				</Header>		
				<div style={{paddingBottom: '1em', fontSize: '13px'}}>
					<div>Normal ERP accounting systems only generate accounting entries in only one of these ledgers.</div>
					<div>Data security is acheived because costcenter (buyer) and profitcenter (seller) addresses are not visibly connected to their parent company on the blockchain.</div>
					<div>Buyers and Sellers have limited visibility restricted to only the General Ledger Accounts for which they are specifically responsible.</div>
					<div>Third-parties are unable to reconstruct the General Ledger of any company because they have no knowledge of which addresses are connected.</div>
				</div>
				<Grid celled padded columns='5' stackable>
			  	<Grid.Row>

			  		<Grid.Column>
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
			  		</Grid.Column>	
			  	
			  		<Grid.Column>
			  			<div>
			  				<div style={{fontSize: 'small'}}>Amend code</div>
							<div>
							<InputBond
								fluid 
								bond={this.invoiceRef}
								placeholder='System Invoice Reference (optional)'
							/>
							</div>
						</div>
			  		</Grid.Column>
			  	
			  		<Grid.Column>
			  			<div>
			  				<div style={{fontSize: 'small'}}>Unique Doc Ref</div>
							<div>
							<InputBond
								fluid
								bond={this.documentRef}
								placeholder='Unique Document Reference'
							/>
							</div>
						</div>
			  		</Grid.Column>

			  		<Grid.Column>
			  			<div>				
						    <div style={{fontSize: 'small'}}>Enter Tax Code</div>
							<div>
							<AccountIdBond 
								fluid
								bond={this.taxJusridiction}
								placeholder='Search for Tax Code'
							/>
							<If condition={this.taxJusridiction.ready()} then={
								<Label>Validate address
									<Label.Detail>
										<Pretty value={this.taxJusridiction}/>
									</Label.Detail>
								</Label>
							}/>
							</div>
						</div>
			  		</Grid.Column>	
			  		
			  		<Grid.Column>
			  			<div>				
						    <div style={{fontSize: 'small'}}>Total</div>
							<div>
							<InputBond
								bond={this.totalAmount}
								fluid
								placeholder='Total Invoice Amount'
								disabled								
							/>
							</div>
						</div>	
			  		</Grid.Column>	
			  	
			  	</Grid.Row>
			  	<Grid.Row>
				  	<Grid.Column>
				  		<If condition={this.productReference.ready()} then={
				  			<Pretty value={this.lookupUnitPrice(this.productReference)}/>
				  		}/>
				  	</Grid.Column>
				  	<Grid.Column>
				  		<div>
			  				<div style={{fontSize: 'small'}}>Enter Product</div>
							<div>
							<InputBond
								bond={this.productReference}
								fluid
								placeholder='Product Reference Code'
							/></div>
						</div>
				  	</Grid.Column>
				  	<Grid.Column>
				  	</Grid.Column>
				  	<Grid.Column>
				  	</Grid.Column>
				  	<Grid.Column>
				  	</Grid.Column>
			  	</Grid.Row>
			  </Grid>
			</React.Fragment>
		);
	}
}
