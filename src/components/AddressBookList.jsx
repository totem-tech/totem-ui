import React from 'react';
import {List, Button} from 'semantic-ui-react';
import {ReactiveComponent} from 'oo7-react';
import {runtime, addressBook, pretty} from 'oo7-substrate';
import Identicon from 'polkadot-identicon';
import addressbook from '../services/addressbook'

export class AddressBookList extends ReactiveComponent {
	constructor () {
		super([], {
			addressbook: addressbook.getBond(),
			shortForm: addressbook.getBond().map(accounts => {
				let r = {}
				accounts.forEach(account => r[account.name] = runtime.indices.ss58Encode(runtime.indices.tryIndex(account.address)))
				return r
			})
		})
	}

	readyRender () {
		return <List divided verticalAlign='bottom' style={{padding: '0 0 4px 4px', overflow: 'auto', maxHeight: '20em'}}>{
			this.state.addressbook.map((account, i) =>
				<List.Item key={i+account.name}>
					<List.Content floated='right'>
						<Button size='small' onClick={() => addressbook.remove(account.name, account.address)}>Delete</Button>
					</List.Content>
					<span className='ui avatar image' style={{minWidth: '36px'}}>
						<Identicon account={account.account} />
					</span>
					<List.Content>
						<List.Header>{account.name}</List.Header>
						<List.Description>
							{this.state.shortForm[account.name] || account.address}
						</List.Description>
					</List.Content>
				</List.Item>
			)
		}</List>
	}
}