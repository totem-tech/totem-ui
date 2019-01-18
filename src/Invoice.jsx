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
		// Transaction Bonds
		this.claimant = new Bond; 
		this.customer = new Bond; 
		this.netAmount = new Bond; 
		this.taxJusridiction = new Bond; 
		this.taxAmount = new Bond; 
		this.invoiceRef = new Bond; 
		this.documentRef = new Bond; 
		
		this.unitPrice = 0; 
		this.quantity = 0; 
		this.productReference = ""; 
		this.totalAmount = 0; 

		this.cleanupQuantityInput = this.cleanupQuantityInput.bind(this)
		this.getUnitPriceFromReferenceInput = this.getUnitPriceFromReferenceInput.bind(this)
		this.getTaxAmountFromTaxCodeInput = this.getTaxAmountFromTaxCodeInput.bind(this)
		this.calculateNetInvoiceAmount = this.calculateNetInvoiceAmount.bind(this)
		this.calculateInvoiceTotal = this.calculateInvoiceTotal.bind(this)
		this.debugValues = this.debugValues.bind(this)

	}

	debugValues() {
		let that = this;
		console.log(
			 "this.claimant: ", 
			 this.claimant, // "is ready?: ", this.claimant.isReady(), 
			 "\n  this.customer: ", 
			 this.customer, "is ready?: ", this.customer.isReady(),
			 "\n  this.netAmount: ", 
			 this.netAmount, // "is ready?: ", this.netAmount.isReady(), 
			 "\n  this.taxJusridiction: ", 
			 this.taxJusridiction, "is ready?: ", this.taxJusridiction.isReady(), 
			 "\n  this.taxAmount: ", 
			 this.taxAmount, // "is ready?: ", this.taxAmount.isReady(), 
			 "\n  this.invoiceRef: ", 
			 this.invoiceRef, "is ready?: ", this.invoiceRef.isReady(), 
			 "\n  this.documentRef: ",
			 this.documentRef, "is ready?: ", this.documentRef.isReady(),
			 "\n  that.props.tx: ",
			 // Bond.all([this.props.tx]).isReady(), 
			 that.props
			)
	}

	round(value, decimals) {
    	return Number(Math.round(value +'e'+ decimals) +'e-'+ decimals).toFixed(decimals);
	}

	cleanupQuantityInput() {
	// Qty always return absolute values Math.abs()
	// Qty always return integer values parseInt("10.9876") also returns NaN
	// Qty Is not a number isNan(valueToTest)		
	}

	getUnitPriceFromReferenceInput() {
		// This function takes a reference value and completes the relevant fields
		const p = document.getElementById('unitPrice');
		p.value = 198.98; // Hardcoded to test

		this.unitPrice.changed(p.value);
	}

	getTaxAmountFromTaxCodeInput(n) {
		// lookup from array r values
		//const n = document.getElementById('netInvoiceAmount');
		const x = document.getElementById('taxAmount');
		// Hardcoded to test
		let taxPercent = 0.21;
		let unRoundedTaxAmount = taxPercent * n.value; 
		x.value = this.round(unRoundedTaxAmount, 2);

		this.taxAmount.changed(unRoundedTaxAmount);
		//this.taxAmount._ready = true;
		return unRoundedTaxAmount;
	}

	calculateNetInvoiceAmount() {
		const p = document.getElementById('unitPrice');
		const q = document.getElementById('quantity');
		const n = document.getElementById('netInvoiceAmount');

		let unRoundedNetAmount = p.value * q.value;
		
		n.value = this.round(unRoundedNetAmount, 2);
		let x = this.getTaxAmountFromTaxCodeInput(n);

		// Set bonded vales
		this.quantity.changed(q.value);
		this.netAmount.changed(unRoundedNetAmount);
		// this.netAmount._ready = true;

		this.calculateInvoiceTotal(p, q, x);	
	}

	calculateInvoiceTotal(p, q, x) {
		const t = document.getElementById('totalInvoiceAmount');

		let unRoundedNetAmount = p.value * q.value;
		let unRoundedTotal = x + unRoundedNetAmount;

		t.value = this.round(unRoundedTotal, 2);
		
		// Set bonded vales
		this.totalAmount.changed(unRoundedTotal);
		this.debugValues();
	}




	render () {
		this.claimant = ss58Decode('5CgFZFJ5oeQju7uTyaKjJgogF1grC9bECbFTJP8ZXKEupM7x');  
		return (<React.Fragment>						    
			  <Header as='h2'>
			    <Header.Content>
			      Create or Amend an Invoice
			      <Header.Subheader>This demo generates an invoice entry in customer, vendor, and tax jurisdiction accounting records.</Header.Subheader>
			    </Header.Content>
			  </Header>
			  <div style={{fontSize: '13px'}}>
			  Normal ERP accounting systems only generate accounting entries in only one of these ledgers.
			  </div>
			  <div style={{fontSize: '13px'}}>
			  Data security is acheived because costcenter (buyer) and profitcenter (seller) addresses are not visibly connected to their parent company on the blockchain.
			  </div>
			  <div style={{fontSize: '13px'}}>
			  Buyers and Sellers have limited visibility restricted to only the General Ledger Accounts for which they are specifically responsible.
			  </div>
			  <div style={{paddingBottom: '1em', fontSize: '13px'}}>
			  Third-parties are unable to reconstruct the General Ledger of any company because they have no knowledge of which addresses are connected.
			  </div>
			  <div style={{paddingBottom: '3px'}}>
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
			  				<div style={{fontSize: 'small'}}>To amend invoice enter System Ref Code</div>
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
			  				<div style={{fontSize: 'small'}}>Enter Unique Doc Ref Code</div>
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
						    <div style={{fontSize: 'small'}}>Total Invoice Amount</div>
							<div>
							<Input
								id='totalInvoiceAmount' 
								fluid
								disabled								
							/>
							</div>
						</div>
			  		</Grid.Column>	

			  	</Grid.Row>
			  	</Grid>
			  	</div>

			  	<Grid celled='true' columns='5' stackable>			  	
			  	<Grid.Row>
			  		<Grid.Column>
			  			<div>
			  				<div style={{fontSize: 'small'}}>Enter Product</div>
							<div>
							<Input
								id='productReference'
								fluid
								placeholder='Product Reference Code'
								onBlur={this.getUnitPriceFromReferenceInput}
							/>
							</div>
						</div>
			  		</Grid.Column>			  	
				  	<Grid.Column>
					<div style={{fontSize: 'small'}}>Unit Price</div>
						<div>
							<Input 
								id='unitPrice'
								fluid
								label='$'
								labelPosition='left'
								placeholder='Unit Price'
								disabled
							/>
						</div>				  	
				  	</Grid.Column>
				  	
				  	
				  	<Grid.Column>
							<div style={{fontSize: 'small'}}>Enter Quantity</div>
							<div>
							<Input
								id='quantity'
								fluid
								placeholder='Quantity'
								onBlur={this.calculateNetInvoiceAmount}
							/>
							</div>				  	
				  	</Grid.Column>
				  	
				  	<Grid.Column>
				  		<div style={{fontSize: 'small'}}>Tax Amount</div>
						<div>
							<Input
								id='taxAmount'
								fluid
								label='$'
								labelPosition='left'
								placeholder='Tax Amount'
								disabled
							/>
						</div>				  	
				  	</Grid.Column>

			  		<Grid.Column>
						<div style={{fontSize: 'small'}}>Net Invoice Amount</div>
						<div>
							<Input
								id='netInvoiceAmount'
								fluid
								label='$'
								labelPosition='left' 
								placeholder='Net Amount'
								disabled
							/>
						</div>				  	
				  	</Grid.Column>

			  	</Grid.Row>
			  </Grid>

			</React.Fragment>)
	}
}
