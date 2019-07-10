import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import { runtimeUp } from 'oo7-substrate'
import { AddressBookList } from './AddressBookList'
import addressbook from '../services/addressbook'
import AddressbookEntryForm from './forms/AddressbookEntry'

class AddressBookView extends ReactiveComponent {
	constructor() {
		super([], {ensureRuntime: runtimeUp, bond: addressbook.getBond()})
	}

	readyRender() {

		return (
			<div style={{ paddingBottom: '1em' }}>
				<AddressbookEntryForm />
				<AddressBookList />
			</div>
		)
	}
}

export default AddressBookView
