import React from 'react';
require('semantic-ui-css/semantic.min.css');
import {Icon, Image, List, Label, Header, Segment, Divider, Button, Grid, Input} from 'semantic-ui-react';
import {Bond, TransformBond} from 'oo7';
import {ReactiveComponent, If, Rspan} from 'oo7-react';
import {AccountIdBond, SignerBond} from './AccountIdBond.jsx';
import {Pretty} from './Pretty';


export class LedgerTransactionList extends ReactiveComponent {
	constructor () {
		super()
		this.officeWorldAccount = new Bond;			
		this.bayerAccount = new Bond;		
		this.cargillAccount = new Bond;
		this.bungeAccount = new Bond;
		this.tX9000099XAccount = new Bond;
		this.tX3334099GAccount = new Bond;
		this.tX27600PGAAccount = new Bond;
		this.frutaromAccount = new Bond;
		this.iFFAccount = new Bond;

		this.officeWorldAccount.changed(ss58Decode('5CgFZFJ5oeQju7uTyaKjJgogF1grC9bECbFTJP8ZXKEupM7x')); // hardcoded account
		this.bayerAccount.changed(ss58Decode('5DJ1WJgk4LYyceBMauBhMHg2yZQBbEjtqu8u7ASxb3SaC9Na')); // hardcoded account
		this.cargillAccount.changed(ss58Decode('5CrWGt91jXwPKQ9oZHDUChTmaRAWJBZBcdNjzJXyabDDopRq')); // hardcoded account
		this.bungeAccount.changed(ss58Decode('5Eok2dmTkXuGWoxWP4hqCuKcDxFUkekbcpFfPXcZTbCfiU5u')); // hardcoded account
		this.tX9000099XAccount.changed(ss58Decode('5CTpNeAMjX8EPXNuxh4dakGD2A715LeT7gCfQWtbLw98YXtZ')); // hardcoded account
		this.tX3334099GAccount.changed(ss58Decode('5FLyityGivbrdxn8jsmRcYHZm5BP5pLj1TKGMRq7xesux4Ef')); // hardcoded account
		this.tX27600PGAAccount.changed(ss58Decode('5DdverAiQXHmKZNin4igERQGRmMEHdpU3dzR2W34jSwHF95c')); // hardcoded account
		this.frutaromAccount.changed(ss58Decode('5DdverAiQXHmKZNin4igERQGRmMEHdpU3dzR2W34jSwHF95c')); // hardcoded account
		this.iFFAccount.changed(ss58Decode('5FWqm8DxVss9sXxWmxy17v3Pa6MbVxDD6c3pX1iKMBhJwVJY')); // hardcoded account

	}

	getDenomination(u) {
		// TODO Get the relevant unit of measure
		u = 'USD';

		switch (u) {
			case 'EUR':
				u = ' €'; 
			break;

			case 'USD':
				u = ' $'; 
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
				      			Sales Ledger (Customers)
				 				</Header.Content>
				  			</Header>
							<div style={{textAlign: 'left', paddingBottom: '8px'}}>
								<Label size='small'>Unpaid Balance :   
						    		<Label.Detail>
						      			<Pretty value={runtime.totem.slCustomerAccount([this.officeWorldAccount, this.iFFAccount]).map(x => 'IFF : ' + this.format_output(x))}/>
						    		</Label.Detail>
						    	</Label>
						    </div>
						    <div style={{textAlign: 'left', paddingBottom: '8px'}}>	
						    	<Label size='small'>Unpaid Balance : 	
						    		<Label.Detail>
						      			<Pretty value={runtime.totem.slCustomerAccount([this.officeWorldAccount, this.cargillAccount]).map(x => 'Cargill : ' + this.format_output(x))}/>
						    		</Label.Detail>
						    	</Label>
						    </div>
						    <div style={{textAlign: 'left', paddingBottom: '8px'}}>	
						    	<Label size='small'>Unpaid Balance : 	
						    		<Label.Detail>
						      			<Pretty value={runtime.totem.slCustomerAccount([this.officeWorldAccount, this.frutaromAccount]).map(x => 'Frutarom : ' + this.format_output(x))}/>
						    		</Label.Detail>
						    	</Label>
						    </div>
						    <div style={{textAlign: 'left', paddingBottom: '8px'}}>	
						    	<Label size='small'>Unpaid Balance : 	
						    		<Label.Detail>
						      			<Pretty value={runtime.totem.slCustomerAccount([this.officeWorldAccount, this.bayerAccount]).map(x => 'Bayer : ' + this.format_output(x))}/>
						    		</Label.Detail>						    		
						    	</Label>
						    </div>
						    <div style={{textAlign: 'left', paddingBottom: '8px'}}>	
						    	<Label size='small'>Unpaid Balance : 	
						    		<Label.Detail>
						      			<Pretty value={runtime.totem.slCustomerAccount([this.officeWorldAccount, this.bungeAccount]).map(x => 'Bunge : ' + this.format_output(x))}/>
						    		</Label.Detail>					    		
								</Label>	
							</div>
						</Grid.Column>
						<Grid.Column >
							<Header as='h5' textAlign='left'>
				    			<Header.Content>
				      			Purchase Ledger (Vendors)
				 				</Header.Content>
				  			</Header>
							<div style={{textAlign: 'left', paddingBottom: '8px'}}>
								<Label size='small'>Unpaid Balance :  
						    		<Label.Detail>
						      			<Pretty value={runtime.totem.plVendorAccount([this.officeWorldAccount, this.bayerAccount]).map(x => 'Bayer ' + this.format_output(x))}/>
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
								<Label size='small'>Live Purchase Control Balance :
									<Label.Detail>
					      				<Pretty value={runtime.totem.glPurchasingControl(this.officeWorldAccount).map(x => this.format_output(x))}/>
					    			</Label.Detail>
								</Label>
							</div>
							<div style={{textAlign: 'left', paddingBottom: '8px'}}>
								<Label size='small'>Live Sales Control Balance :
									<Label.Detail>
										<Pretty value={runtime.totem.glSalesControl(this.officeWorldAccount).map(x => this.format_output(x))}/>
					    			</Label.Detail>
								</Label>
							</div>
							{/*<div style={{textAlign: 'left', paddingBottom: '8px'}}>
								<Label size='small'>Stock Value:
									<Label.Detail>
										<Pretty value={runtime.totem.glStockAccount(this.officeWorldAccount).map(x => this.format_output(x))}/>
					    			</Label.Detail>
								</Label>
							</div>*/}
							<div style={{textAlign: 'left', paddingBottom: '8px'}}>
								<Label size='small'>Stationary:
									<Label.Detail>
										<Pretty value={runtime.totem.glStationaryAccount(this.officeWorldAccount).map(x => this.format_output(x))}/>
					    			</Label.Detail>
								</Label>
							</div>
							<Header as='h5' textAlign='left'>
				    			<Header.Content>
				      			Sales Tax (VAT):
				 				</Header.Content>
				  			</Header>							
							<div style={{textAlign: 'left', paddingBottom: '8px'}}>
								<Label size='small'>
									<Label.Detail>
										<Pretty value={runtime.totem.glvatAccount([this.officeWorldAccount, this.tX9000099XAccount]).map(x => 'Tax Code: TX9000099X ' + this.format_output(x))}/>
				    				</Label.Detail>
						    	</Label>
						    </div>
						    <div style={{textAlign: 'left', paddingBottom: '8px'}}>	
								<Label size='small'>
									<Label.Detail>
										<Pretty value={runtime.totem.glvatAccount([this.officeWorldAccount, this.tX3334099GAccount]).map(x => 'Tax Code: TX3334099G ' + this.format_output(x))}/>
					    			</Label.Detail>
								</Label>
						    </div>
						    <div style={{textAlign: 'left', paddingBottom: '8px'}}>	
								<Label size='small'>
									<Label.Detail>
										<Pretty value={runtime.totem.glvatAccount([this.officeWorldAccount, this.tX27600PGAAccount]).map(x => 'Tax Code: TX27600PGA ' + this.format_output(x))}/>
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
						      			<Pretty value={runtime.balances.balance(this.officeWorldAccount).map(x => this.format_output(x))}/>
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
