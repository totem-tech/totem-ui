import React from 'react'
import { Button } from 'semantic-ui-react'
const { generateMnemonic } = require('bip39')
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import { runtimeUp, secretStore } from 'oo7-substrate'
import { InputBond } from '../InputBond.jsx'
import { TransformBondButton } from '../TransformBondButton'
import Identicon from 'polkadot-identicon'
import { WalletList, SecretItem } from '../WalletList'

class WalletView extends ReactiveComponent {
  constructor() {
    super([], {ensureRuntime: runtimeUp})

    this.name = new Bond()
    this.seed = new Bond()
    this.seedAccount = this.seed.map(s => s ? secretStore().accountFromPhrase(s) : undefined)
    this.seedAccount.use()
  }

  readyRender() {
    const seedIcon = (
      <i style={{ opacity: 1 }} className="icon">
        <Identicon
          account={this.seedAccount}
          size={28}
          style={{ marginTop: '5px' }}
        />
      </i>
    )

    const transformBondBtn = (
      <TransformBondButton
        content="Create"
        transform={(name, seed) => secretStore().submit(seed, name)}
        args={[this.name, this.seed]}
        immediate
      />
    )

    const seedGenBtn = (
      <Button
        content="Another"
        onClick={() => this.seed.trigger(generateMnemonic())}
      />
    )

    return (
      <React.Fragment>
        <div style={{ paddingBottom: '1em' }}>
          <div style={{ fontSize: 'small' }}>seed</div>
          <InputBond
            bond={this.seed}
            reversible
            placeholder="Some seed for this key"
            validator={n => n || null}
            action={seedGenBtn}
            iconPosition="left"
            icon={seedIcon}
          />
        </div>
        <div style={{ paddingBottom: '1em' }}>
          <div style={{ fontSize: 'small' }}>name</div>
          <InputBond
            bond={this.name}
            placeholder="A name for this key"
            validator={n =>n ? secretStore().map(ss => (ss.byName[n] ? null : n)) : null}
            action={transformBondBtn}
          />
        </div>
        <div style={{ paddingBottom: '1em' }}>
          <WalletList />
        </div>
      </React.Fragment>
    )
  }
}

export default WalletView
