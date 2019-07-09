import React from 'react'
import { Button, Segment } from 'semantic-ui-react'
const { generateMnemonic } = require('bip39')
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import { runtimeUp, secretStore } from 'oo7-substrate'
import { InputBond } from '../InputBond.jsx'
import { TransformBondButton } from '../TransformBondButton'
import Identicon from 'polkadot-identicon'
import WalletList from './lists/WalletList'
import { IfMobile } from './utils'
import WalletForm from './forms/Wallet'

class WalletView extends ReactiveComponent {
  constructor() {
    super([], {ensureRuntime: runtimeUp, secretStore: secretStore()})

    this.name = new Bond()
    this.seed = new Bond()
    this.lastSeed = null
    this.seedAccount = this.seed.map(s => s ? secretStore().accountFromPhrase(s) : undefined)
    this.seedAccount.use()

    this.handleCreate = this.handleCreate.bind(this)
    this.handleGenerate = this.handleGenerate.bind(this)
  }

  handleCreate(name, seed) {
    // generate a new seed to make sure there are no duplicate addresses
    setTimeout(this.handleGenerate, 50)
    return secretStore().submit(seed, name)
  }

  handleGenerate() {
    this.seed.trigger(generateMnemonic())
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
        transform={this.handleCreate}
        args={[this.name, this.seed]}
        disabled={false}
        immediate
      />
    )

    const seedGenBtn = (
      <Button
        content="Another"
        onClick={this.handleGenerate}
      />
    )

    return (
      <React.Fragment>
        {/* <div style={{ paddingBottom: '1em' }}>
            <div style={{ fontSize: 'small' }}>Seed</div>
            <ResponsiveInputBond
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
            <div style={{ fontSize: 'small' }}>Name</div>
            <ResponsiveInputBond
              bond={this.name}
              placeholder="A name for this key"
              validator={n =>n ? secretStore().map(ss => (ss.byName[n] ? null : n)) : null}
              action={transformBondBtn}
            />
        </div> */}
        <WalletForm />
        <div style={{ paddingBottom: '1em' }}>
          <WalletList itemsPerRow={1} />
        </div>
      </React.Fragment>
    )
  }
}

export default WalletView

const ResponsiveInputBond = props => (
  <IfMobile 
    then={() => <InputBond {...props} fluid={true} />}
    else={() => <InputBond {...props} />}
  />
)
