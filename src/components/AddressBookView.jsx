import React from 'react'
import { Label } from 'semantic-ui-react'
import { If, ReactiveComponent, Rspan} from 'oo7-react'
import { runtime, runtimeUp, addressBook } from 'oo7-substrate'
import { InputBond } from '../InputBond'
import { AccountIdBond } from '../AccountIdBond'
import { Pretty } from '../Pretty'
import { AddressBookList } from './AddressBookList'
import { TransformBondButton } from '../TransformBondButton'
import { Bond } from 'oo7'
import addressbook from '../services/addressbook'

class AddressBookView extends ReactiveComponent {
	constructor() {
		super([], {ensureRuntime: runtimeUp, bond: addressbook.getBond()})
		this.nick = new Bond()
		this.lookup = new Bond()

		this.getAddressDetails = this.getAddressDetails.bind(this)
	}

	getAddressDetails() {
		return (
			<div>
				<Label>
					Balance
					<Label.Detail>
						<Pretty value={runtime.balances.balance(this.lookup)} />
					</Label.Detail>
				</Label>
				<Label>
					Nonce
					<Label.Detail>
						<Pretty value={runtime.system.accountNonce(this.lookup)} />
					</Label.Detail>
				</Label>
				<If
					condition={runtime.indices.tryIndex(this.lookup, null).map(x => x !== null)}
					then={
						<Label>
							Short-form
							<Label.Detail>
								<Rspan>
									{runtime.indices.tryIndex(this.lookup).map(i => ss58Encode(i) + ` (index ${i})`)}
								</Rspan>
							</Label.Detail>
						</Label>
					}
				/>
				<Label>
					Address
					<Label.Detail>
						<Pretty value={this.lookup} />
					</Label.Detail>
				</Label>
			</div>
		)
	}

	readyRender() {
		const transformBondBtn = (
			<TransformBondButton
				content="Add"
				transform={(name, account) => { addressbook.add(name, account); return true}}
				args={[this.nick, this.lookup]}
				immediate
			/>
		)

		return (
			<React.Fragment>
				<div style={{ paddingBottom: '1em' }}>
					<div style={{ fontSize: 'small' }}>lookup account</div>
					<AccountIdBond bond={this.lookup} />
					<If condition={this.lookup.ready()} then={this.getAddressDetails()} />
				</div>
				<div style={{ paddingBottom: '1em' }}>
					<div style={{ fontSize: 'small' }}>name</div>
					<InputBond
						bond={this.nick}
						placeholder="A name for this address"
						validator={name => name ? (addressbook.getByName(name) ? null : name) : null}
						action={transformBondBtn}
					/>
				</div>
				<div style={{ paddingBottom: '1em' }}>
					<AddressBookList />
				</div>
			</React.Fragment>
		)
	}
}

export default AddressBookView
