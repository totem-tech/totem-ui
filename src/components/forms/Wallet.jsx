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
import { IfMobile, isDefined, isFn, isObj } from '../utils'

class Wallet extends ReactiveComponent {
    constructor(props) {
        super(props, { ensureRuntime: runtimeUp, secretStore: secretStore() })

        this.seed = new Bond()
        this.name = new Bond()
        this.lastSeed = null
        this.seedAccount = this.seed.map(s => s ? secretStore().accountFromPhrase(s) : undefined)
        this.seedAccount.use()

        this.handleClose = this.handleClose.bind(this)
        this.handleOpen = this.handleOpen.bind(this)
        this.handleSubmit = this.handleSubmit.bind(this)
        this.handleGenerate = this.handleGenerate.bind(this)

        this.state = {
            inputs: [
                {
                    action: <Button content="Generate" onClick={this.handleGenerate} />,
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


    handleClose(e, d) {
        const { onClose } = this.props
        this.setState({open: false})
        isFn(onClose) && onClose(e, d)
    }

    handleOpen(e, d) {
        const { onOpen } = this.props
        this.setState({open: true})
        isFn(onOpen) && onOpen(e, d)
    }

    handleSubmit(name, seed) {
        const { closeOnSubmit, onSubmit, modal } = this.props
        // generate a new seed to make sure there are no duplicate addresses
        setTimeout(this.handleGenerate, 50)
        isFn(onSubmit) && setTimeout(() => {
            onSubmit({ seed, name })
            modal && closeOnSubmit && this.handleClose()
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
            open: propsOpen,
            size,
            subheader,
            trigger,
            wallet
        } = this.props
        const { inputs, message, open } = this.state
        const { handleClose, handleOpen } = this
        const isOpenControlled = modal && !trigger && isDefined(propsOpen)
        const openModal = isOpenControlled ? propsOpen : open
        const getForm = mobile => () => (
            <FormBuilder
                header={header}
                headerIcon={headerIcon}
                hideFooter={true}
                inputs={inputs.map(input => { input.width = mobile || modal ? 16 : 8; return input})}
                message={message}
                modal={modal}
                onCancel={handleClose}
                onClose={handleClose}
                onOpen={handleOpen}
                open={openModal}
                size={size}
                style={mobile && !modal ? {marginBottom : 30} : {}}
                subheader={subheader}
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