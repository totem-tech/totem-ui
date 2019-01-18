import React from 'react';
require('semantic-ui-css/semantic.min.css');
import {Icon, Image, List, Label, Header, Segment, Divider, Button, Grid, Input} from 'semantic-ui-react';
import {Bond, TransformBond} from 'oo7';
import {ReactiveComponent, If, Rspan} from 'oo7-react';
import {Pretty} from './Pretty';


export class LedgerTransactionList extends ReactiveComponent {
	constructor () {
		super()
	}
	
	render() {
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
					      				<Pretty value={runtime.totem.glPurchasingControl('5HmG48RSPxoG6S34mpPs2Lytwr4ox4sfQCSLw6gpvMhsLt9J')}/>
					    			</Label.Detail>
								</Label>
							</div>
							<div style={{textAlign: 'left', paddingBottom: '8px'}}>
								<Label size='small'>Sales Control:
									<Label.Detail>
										<Pretty value={runtime.totem.glSalesControl('5HmG48RSPxoG6S34mpPs2Lytwr4ox4sfQCSLw6gpvMhsLt9J')}/>
					    			</Label.Detail>
								</Label>
							</div>
							<div style={{textAlign: 'left', paddingBottom: '8px'}}>
								<Label size='small'>Stock Value:
									<Label.Detail>
										<Pretty value={runtime.totem.glStockAccount('5HmG48RSPxoG6S34mpPs2Lytwr4ox4sfQCSLw6gpvMhsLt9J')}/>
					    			</Label.Detail>
								</Label>
							</div>
							<div style={{textAlign: 'left', paddingBottom: '8px'}}>
								<Label size='small'>Sales Tax (VAT):
									<Label.Detail>
										<Pretty value={runtime.totem.glvatAccount([])}/>
					    			</Label.Detail>
								</Label>
							</div>
							<div style={{textAlign: 'left', paddingBottom: '8px'}}>
								<Label size='small'>Stationary:
									<Label.Detail>
										<Pretty value={runtime.totem.glStationaryAccount('5HmG48RSPxoG6S34mpPs2Lytwr4ox4sfQCSLw6gpvMhsLt9J')}/>
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
						      			<Pretty value={runtime.totem.bkSpendAccount('5HmG48RSPxoG6S34mpPs2Lytwr4ox4sfQCSLw6gpvMhsLt9J')}/>
						    		</Label.Detail>
								</Label>
							</div>
							<div style={{textAlign: 'left', paddingBottom: '8px'}}>
								<Label size='small'>Reserve Balance:  
						    		<Label.Detail>
						      			<Pretty value={runtime.totem.bkReserveVatAccount('5HmG48RSPxoG6S34mpPs2Lytwr4ox4sfQCSLw6gpvMhsLt9J')}/>
						    		</Label.Detail>
								</Label>
							</div>
						</Grid.Column>

					</Grid.Row>
				</Grid>)
	}
}
