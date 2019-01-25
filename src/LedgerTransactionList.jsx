import React from 'react';
require('semantic-ui-css/semantic.min.css');
import {Icon, Image, List, Label, Header, Segment, Divider, Button, Grid, Input} from 'semantic-ui-react';
import {Bond, TransformBond} from 'oo7';
import {ReactiveComponent, If, Rspan} from 'oo7-react';
import {Pretty} from './Pretty';


export class LedgerTransactionList extends ReactiveComponent {
	constructor () {
		super()
		this.officeWorldAccount = new Bond;			
		this.officeWorldAccount.changed(ss58Decode('5CgFZFJ5oeQju7uTyaKjJgogF1grC9bECbFTJP8ZXKEupM7x')); // hardcoded account

		// this.getDenomination = this.getDenomination.bind(this)

	}

	getDenomination(u) {
		// TODO Get the relevant unit of measure
		u = 'USD';

		switch (u) {
			case 'EUR':
				u = 'Euros'; 
			break;

			case 'USD':
				u = 'Dollars'; 
			break;
			
			default:
				u = '';
			break;		
		}

		let r = ' '+u+' ';
		return r;
	}

	getNumeratorDenominator(x) {
		// TODO get the relevant numerator / denominator for this unit
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

	int_to_decimal(n, d) {
		return Number(this.round((n * this.getNumeratorDenominator(false)), d)); 		
	}

	format_output(o) {
		let r = (o ? this.int_to_decimal(o, 2) : '0')+this.getDenomination();
		return r;
	}
	
	readyRender() {
		return (<Grid celled='internally' padded columns='4' stackable>
					<Grid.Row>					
						<Grid.Column >
							<Header as='h5' textAlign='left'>
				    			<Header.Content>
				      			Sales Ledger
				 				</Header.Content>
				  			</Header>
							<div style={{textAlign: 'left', paddingBottom: '8px'}}>
								<Label size='small'>Customer Name:  
						    		<Label.Detail>
						      			<Pretty value={runtime.totem.slCustomerAccount([])}/>
						    		</Label.Detail>
								</Label>
							</div>
						</Grid.Column>
						<Grid.Column >
							<Header as='h5' textAlign='left'>
				    			<Header.Content>
				      			Purchase Ledger
				 				</Header.Content>
				  			</Header>
							<div style={{textAlign: 'left', paddingBottom: '8px'}}>
								<Label size='small'>Vendor Name:  
						    		<Label.Detail>
						      			<Pretty value={runtime.totem.plVendorAccount([])}/>
						    		</Label.Detail>
								</Label>
							</div>
						</Grid.Column>
						<Grid.Column >
							<Header as='h5' textAlign='left'>
				    			<Header.Content>
				      			General Ledger
				 				</Header.Content>
				  			</Header>
				  			<div style={{textAlign: 'left', paddingBottom: '8px'}}>
								<Label size='small'>Purchase Control:
									<Label.Detail>
					      				<Pretty value={runtime.totem.glPurchasingControl(this.officeWorldAccount).map(x => this.format_output(x))}/>
					    			</Label.Detail>
								</Label>
							</div>
							<div style={{textAlign: 'left', paddingBottom: '8px'}}>
								<Label size='small'>Sales Control:
									<Label.Detail>
										<Pretty value={runtime.totem.glSalesControl(this.officeWorldAccount).map(x => this.format_output((19900+x)))}/>
					    			</Label.Detail>
								</Label>
							</div>
							<div style={{textAlign: 'left', paddingBottom: '8px'}}>
								<Label size='small'>Stock Value:
									<Label.Detail>
										<Pretty value={runtime.totem.glStockAccount(this.officeWorldAccount).map(x => this.format_output(x))}/>
					    			</Label.Detail>
								</Label>
							</div>
							<div style={{textAlign: 'left', paddingBottom: '8px'}}>
								<Label size='small'>Sales Tax (VAT):
									<Label.Detail>
										<Pretty value={runtime.totem.glvatAccount([]).map(x => this.format_output(x))}/>
					    			</Label.Detail>
								</Label>
							</div>
							<div style={{textAlign: 'left', paddingBottom: '8px'}}>
								<Label size='small'>Stationary:
									<Label.Detail>
										<Pretty value={runtime.totem.glStationaryAccount(this.officeWorldAccount).map(x => this.format_output(x))}/>
					    			</Label.Detail>
								</Label>
							</div>
						</Grid.Column>
						<Grid.Column >
							<Header as='h5' textAlign='left'>
				    			<Header.Content>
				      			Budget Allocation
				 				</Header.Content>
				  			</Header>
							<div style={{textAlign: 'left', paddingBottom: '8px'}}>
								<Label size='small'>Spendable Balance:  
						    		<Label.Detail>
						      			<Pretty value={runtime.totem.bkSpendAccount(this.officeWorldAccount).map(x => this.format_output(x))}/>
						    		</Label.Detail>
								</Label>
							</div>
							<div style={{textAlign: 'left', paddingBottom: '8px'}}>
								<Label size='small'>Reserve Balance:  
						    		<Label.Detail>
						      			<Pretty value={runtime.totem.bkReserveVatAccount(this.officeWorldAccount).map(x => this.format_output(x))}/>
						    		</Label.Detail>
								</Label>
							</div>
						</Grid.Column>

					</Grid.Row>
				</Grid>)
	}
}
