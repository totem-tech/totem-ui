import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import { runtimeUp } from 'oo7-substrate'
import PartnerList from '../lists/PartnerList'
import addressbook from '../services/addressbook'

class PartnerView extends ReactiveComponent {
	constructor() {
		super([], { bond: addressbook.getBond() })
	}

	readyRender() {
		return <PartnerList />
	}
}

export default PartnerView
