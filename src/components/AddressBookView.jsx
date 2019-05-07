import React from 'react'
import { Label } from 'semantic-ui-react'
import { ReactiveComponent, If } from 'oo7-react'
import { runtime, runtimeUp, addressBook } from 'oo7-substrate'
import { InputBond } from '../InputBond'
import { AccountIdBond, SignerBond } from '../AccountIdBond'
import { Pretty } from '../Pretty'
import { AddressBookList } from '../AddressBookList'
import { TransformBondButton } from '../TransformBondButton'
import { Bond, TransformBond } from 'oo7'

class AddressBookView extends ReactiveComponent{
  constructor() {
    super([], {ensureRuntime: runtimeUp})
    this.nick = new Bond()
    this.lookup = new Bond()
  }

  readyRender() {
    const addressDetails = (
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
        <Label>
          Address
          <Label.Detail>
            <Pretty value={this.lookup} />
          </Label.Detail>
        </Label>
      </div>
    )

    const transformBondBtn = (
      <TransformBondButton
        content="Add"
        transform={(name, account) => { addressBook().submit(account, name); return true}}
        args={[this.nick, this.lookup]}
        immediate
      />
    )

    return (
      <React.Fragment>
        <div style={{ paddingBottom: '1em' }}>
          <div style={{ fontSize: 'small' }}>lookup account</div>
          <AccountIdBond bond={this.lookup} />
          <If condition={this.lookup.ready()} then={addressDetails} />
        </div>
        <div style={{ paddingBottom: '1em' }}>
          <div style={{ fontSize: 'small' }}>name</div>
          <InputBond
            bond={this.nick}
            placeholder="A name for this address"
            validator={n => n ? addressBook().map(ss => (ss.byName[n] ? null : n)) : null}
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
