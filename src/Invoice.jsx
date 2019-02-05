import React from 'react';
require('semantic-ui-css/semantic.min.css');
import {Icon, Image, List, Label, Header, Segment, Divider, Button, Grid, Input} from 'semantic-ui-react';
import {Bond, TransformBond} from 'oo7';
import {runtime, ss58Encode, ss58Decode, addCodecTransform, VecU8} from 'oo7-substrate';
import {ReactiveComponent, If, Rspan} from 'oo7-react';
import {InputBond} from './InputBond.jsx';
import {TransactButton} from './TransactButton.jsx';
import {AccountIdBond, SignerBond} from './AccountIdBond.jsx';
import {Pretty} from './Pretty';

// hardcoded here TODO: better dealt with dynamically
const decimal_to_int = 10000;
const int_to_decimal = 1/decimal_to_int; 

export class Invoice extends ReactiveComponent {
	constructor () {
		super();
		
		this.multiply = (x, y) => x * y;
	 	this.sumUp = (a, b) => a + b;
	 	this.equalTo = (c, d) => {if (c == d) return true};
	 	this.roundUpBondToInt = r => this.round(r, 0);


		// Transaction Bonds
		this.claimant = new Bond; 
		this.customer = new Bond; 
		// this.netAmount = new Bond; 
		this.taxJusridiction = new Bond; 
		this.taxAmount = new Bond; 
		this.invoiceRef = new Bond; 
		this.documentRef = new Bond; 
		
		this.unitPrice = new Bond; 
		this.quantity = new Bond; 
		this.productReference = ""; 
		// this.totalAmount = new Bond; 

		// dynamically updated Bonds
		this.netAmount = Bond.all([this.unitPrice, this.quantity]).map(([a, b]) => Number(this.round(this.multiply(a, b), 0)));
		this.totalAmount = Bond.all([this.netAmount, this.taxAmount]).map(([a, b]) => Number(this.round(this.sumUp(a, b), 0)));
		
		// function modules
		this.cleanupQuantityInput = this.cleanupQuantityInput.bind(this)
		this.getUnitPriceFromReferenceInput = this.getUnitPriceFromReferenceInput.bind(this)
		this.getTaxAmountFromTaxCodeInput = this.getTaxAmountFromTaxCodeInput.bind(this)
		this.calculateNetInvoiceAmount = this.calculateNetInvoiceAmount.bind(this)
		this.calculateInvoiceTotal = this.calculateInvoiceTotal.bind(this)
		this.preValidateInput = this.preValidateInput.bind(this)
		this.debugValues = this.debugValues.bind(this)

		// Default Values
		this.claimant.changed(ss58Decode('5CgFZFJ5oeQju7uTyaKjJgogF1grC9bECbFTJP8ZXKEupM7x'));

		// custom types
		addCodecTransform('AccountBalance', 'i64');
		addCodecTransform('ClaimIndex', 'u64');
		addCodecTransform('DocumentReference', VecU8);
		// addCodecTransform('DocumentReference', 'string'); // This doesn't work

	}

	debugValues() {
		let that = this;
		console.log(
			 "this.claimant: ", 
			 this.claimant,  "is ready?: ", this.claimant.isReady(), 
			 "\n  this.customer: ", 
			 this.customer, "is ready?: ", this.customer.isReady(),
			 "\n  this.netAmount: ", 
			 this.netAmount,  "is ready?: ", this.netAmount.isReady(), 
			 "\n  this.taxJusridiction: ", 
			 this.taxJusridiction, "is ready?: ", this.taxJusridiction.isReady(), 
			 "\n  this.taxAmount: ", 
			 this.taxAmount,  "is ready?: ", this.taxAmount.isReady(), 
			 "\n  this.invoiceRef: ", 
			 this.invoiceRef, "is ready?: ", this.invoiceRef.isReady(), 
			 "\n  this.documentRef: ",
			 this.documentRef, "is ready?: ", this.documentRef.isReady()
			 // "\n  that.props.tx: ", Bond.all([this.props.tx]).isReady(), 
			 // that.props
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
		let u = 1988700; // USGAAP says a maximum of 3 decimal places. We'll store 4 for accuracy
		p.value = this.round(u/10000, 2); // Hardcoded to test ensure two decimals (GAAP 3 decimal places, we display 2)

		this.unitPrice.changed(u); // onchain storage has no decimals
	}

	getTaxAmountFromTaxCodeInput(n) {
		// TODO lookup based on Tax code input
		const d_Tax = document.getElementById('taxAmount');

		let taxPercentAsInt = 2100; // hardcoded for testing. 4 decimals
		let taxPercent = taxPercentAsInt * int_to_decimal; // to match display in decimals for calculations

		// Horrible hack in two parts until I figure out how to do React Display formatting  
		// 9943500 * 0.21 = 2088135
		let rawTaxAmount = n * taxPercent ;

		// round and convert to Int for storage
		this.taxAmount.changed(Number(this.round(rawTaxAmount, 0))); // 2088135

		// change the display
		d_Tax.value = this.round((rawTaxAmount * int_to_decimal), 2); // 208.81	

		return rawTaxAmount;

	}

	calculateNetInvoiceAmount() {
		// Horrible hack in two parts until I figure out how to do React Display formatting 
		// Handle Displayed Amounts (decimals)
		const d_p = document.getElementById('unitPrice');
		const d_q = document.getElementById('quantity');
		const d_n = document.getElementById('netInvoiceAmount');

		// get latest values - need to check that this.unitPrice._value; is not null 
		let s_p = this.unitPrice._value;
		this.quantity.changed(d_q.value); 

		// Unit Price * Quantity = net amount
		// 5 * 1988700 = 9943500
		let rawNetAmount = d_q.value * s_p;		
		// should be 994.35
		d_n.value = this.round((rawNetAmount * int_to_decimal), 2); // display net amout formatted two decimals
		// console.log(rawNetAmount);
		// sending 9943500 tax amount should be updated to 2088135
		let rawTaxAmount = this.getTaxAmountFromTaxCodeInput(rawNetAmount);

		this.calculateInvoiceTotal(rawNetAmount, rawTaxAmount);
	
	}

	calculateInvoiceTotal(net, tax) {
		// Horrible hack in two parts until I figure out how to do React Display formatting 	
		const t = document.getElementById('totalInvoiceAmount');
		t.value = this.round(((net + tax) * int_to_decimal), 2); // Net amount + tax amount
		
		// for testing to check ready status.
		this.debugValues() ;
		
	}

	preValidateInput() {
		const invoice_reference = document.getElementById('invoice_reference');

		if (!invoice_reference) {
			this.invoiceRef.changed(0);	// set default value for blank field. Workaround for encoding bug.
		} else {
			this.invoiceRef.changed(Math.abs(Number(invoice_reference.value))); //ensure this is a valid number for input.
		}

	}

	


	readyRender () {
		  
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
							<Input
								id='invoice_reference'
								fluid 
								placeholder='System Invoice Reference (optional)'
								onBlur={this.preValidateInput}
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

			  <TransactButton
					content="Create Invoice"
					tx={{
						sender: this.claimant,
						call: calls.totem.processClaim(this.customer, this.netAmount, this.taxJusridiction, this.taxAmount, this.invoiceRef, this.documentRef)
					}}
				/>

			</React.Fragment>)
	}
}
