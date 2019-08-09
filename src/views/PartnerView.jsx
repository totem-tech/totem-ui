import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import { runtimeUp } from 'oo7-substrate'
import { PartnerList } from '../lists/PartnerList'
import addressbook from '../services/addressbook'
import PartnerForm from '../forms/Partner'

class PartnerView extends ReactiveComponent {
	constructor() {
		super([], {ensureRuntime: runtimeUp, bond: addressbook.getBond()})
	}

	readyRender() {

		return (
			<div style={{ paddingBottom: '1em' }}>
				<PartnerForm />
				<PartnerList />
			</div>
		)
	}
}

export default PartnerView
