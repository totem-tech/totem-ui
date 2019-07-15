import React from 'react'
import PropTypes from 'prop-types'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import { runtimeUp, secretStore } from 'oo7-substrate'
import Identicon from 'polkadot-identicon'
const { generateMnemonic } = require('bip39')
import { Button } from 'semantic-ui-react'
import FormBuilder, { fillValues } from './FormBuilder'
import { TransformBondButton } from '../../TransformBondButton'
import { IfMobile, isFn, isObj } from '../utils'

class Wallet extends ReactiveComponent {
    constructor(props) {
        super(props, { ensureRuntime: runtimeUp, secretStore: secretStore() })

        this.seed = new Bond()
        this.name = new Bond()
        this.lastSeed = null
        this.seedAccount = this.seed.map(s => s ? secretStore().accountFromPhrase(s) : undefined)
        this.seedAccount.use()
    
        this.handleSubmit = this.handleSubmit.bind(this)

        this.state = {
            success: false,
            inputs: [
                {
                    action: <Button content="Generate new seed or restore backup" onClick={this.handleGenerate.bind(this)} />,
                    bond: this.seed,
                    icon: (
                        <i style={{ opacity: 1 }} className="icon">
                            <Identicon
                                account={this.seedAccount}
                                size={28}
                                style={{ marginTop: '5px' }}
                            />
                        </i>
                    ),
                    iconPosition: 'left',
                    label: 'Seed',
                    name: 'seed',
                    placeholder: 'Some seed for this key',
                    reversible: true,
                    type: 'InputBond',
                    validator: seed => seed || null
                },
                {
                    action: (
                        <TransformBondButton
                            content={props.submitText}
                            transform={this.handleSubmit}
                            args={[this.name, this.seed]}
                            disabled={false}
                            immediate
                        />
                    ),
                    bond: this.name,
                    label: 'Name',
                    name: 'name',
                    placeholder: 'A name for the wallet',
                    type: 'InputBond',
                    validator: n =>n ? secretStore().map(ss => (ss.byName[n] ? null : n)) : null
            
                }
            ],
            message: {},
            open: props.open,
        }
    }

    handleSubmit(name, seed) {
        const { onSubmit } = this.props
        isFn(onSubmit) && setTimeout(() => {
            onSubmit({ seed, name })
            this.setState({success: true})
        }, 100)
        return secretStore().submit(seed, name)
    }

    handleGenerate() {
      this.seed.trigger(generateMnemonic())
    }

    render() {
        const {
            closeOnSubmit,
            header,
            headerIcon,
            modal,
            onOpen,
            onClose,
            open,
            size,
            subheader,
            trigger,
            wallet
        } = this.props
        const { inputs, message, success } = this.state
        const getForm = mobile => () => (
            <FormBuilder
                closeOnSubmit={closeOnSubmit}
                header={header}
                headerIcon={headerIcon}
                hideFooter={true}
                inputs={inputs.map(input => { input.width = mobile || modal ? 16 : 8; return input})}
                message={message}
                modal={modal}
                onClose={onClose}
                onOpen={onOpen}
                open={open}
                size={size}
                style={mobile && !modal ? {marginBottom : 30} : {}}
                subheader={subheader}
                success={success}
                trigger={trigger}
            />
        )

        if ( isObj(wallet) ) {
            // prefill values if needed
            fillValues(inputs, wallet, true)
        }

        return <IfMobile then={getForm(true)} else={getForm(false)} /> 
    }

}
Wallet.propTypes = {
    closeOnSubmit: PropTypes.bool,
    wallet: PropTypes.object
}
Wallet.defaultProps = {
    closeOnSubmit: true,
    header: 'Create a new wallet',
    headerIcon: '', //plus
    size: 'tiny',
    submitText: 'Create'
}
export default Wallet