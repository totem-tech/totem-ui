import React from 'react';
require('semantic-ui-css/semantic.min.css');
import {Input} from 'semantic-ui-react';
import {Bond} from 'oo7';
import {ReactiveComponent, If} from 'oo7-react';
import {InputBond} from './InputBond.jsx';

export class Test extends ReactiveComponent {
	constructor () {
		super();
		
		this.units = new Bond;
		this.qty = new Bond;
		this.totals = new Bond;
		this.callMyFunction = this.callMyFunction.bind(this)
	}

	round(value, decimals) {
    	return Number(Math.round(value +'e'+ decimals) +'e-'+ decimals).toFixed(decimals);
	}	
	
	callMyFunction() {
		const p = document.getElementById('price');
		const q = document.getElementById('quantity');
		let t = document.getElementById('total');
		let unRoundedAmount = p.value * q.value;
		t.value = this.round(unRoundedAmount, 2)
		this.units = p.value;
		this.qty = q.value;
		this.totals = unRoundedAmount;
		console.log('Unit Price: ', this.units, 'Qty: ', this.qty, 'Total: ', this.totals);
	
	}

	render () {
		return (
			<div>
				<div style={{fontSize: 'small'}}>Units
				</div>
				<div>
					<InputBond
						id='price'
						input='number' 
						placeholder='number of units'
						onChange={this.callMyFunction}
					/>
				</div>
				<div>
					<Input
						id='quantity'
						input='number' 
						placeholder='number of units'
						onBlur={this.callMyFunction}
					/>
				</div>
				<div>
					<Input
						id='total'
						input='number'
						disabled 
						placeholder='number of units'
						onBlur={this.callMyFunction}
					/>
				</div>
			</div>
		)
	}
}
