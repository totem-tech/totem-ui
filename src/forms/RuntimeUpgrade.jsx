import React, { Component } from 'react'
import { blake2AsHex } from '@polkadot/util-crypto'
import { compactAddLength } from '@polkadot/util'
import FormBuilder, { findInput } from '../components/FormBuilder'
import { getConnection, query } from '../services/blockchain'
import { get as getIdentity, getSelected } from '../modules/identity/identity'

// Translation not required
const texts = {
    accessDenied: 'Access denied',
    invalidFile: 'Invalid file type selected',
    fileErr: 'Failed to process file',
    selectRuntime: 'Select runtime',
    upgrade: 'Upgrade',
    upgradeFailed: 'Upgrade failed',
    upgradeTXNotInBlock: 'Transaction was rejected by runtime',
    upgradingRuntime: 'Upgrading runtime',
    upgradeSuccessful: 'Upgrade successful',
}

export default class UpgradeForm extends Component {
    constructor() {
        super()

        this.state = {
            message: {},
            onSubmit: this.handleSubmit,
            selectedFile: null,
            submitText: texts.upgrade,
            inputs: [{
                accept: '.wasm',
                label: texts.selectRuntime,
                name: 'file',
                required: true,
                type: 'file',
                onChange: this.handleFileChange,
                validate: this.validateFile
            }],
        }
    }

    handleFileChange = event => {
        const { inputs } = this.state
        const fileIn = findInput(inputs, 'file')
        const file = event.target.files[0]
        if (!file) return

        this.setState({ submitDisabled: true })
        try {
            if (!file.name.endsWith(fileIn.accept || '')) throw texts.invalidFile
            var reader = new FileReader()
            reader.onload = e => {
                const bytes = new Uint8Array(e.target.result)
                const codeBytes = compactAddLength(bytes)
                e.target.value = null
                fileIn.message = {
                    content: (
                        <div>
                            <div><b>Original length:</b><br />{bytes.length}</div>
                            <div><b>Original blake2AsHex:</b><br />{blake2AsHex(bytes, 256)}</div>
                            <div><b>Processed length:</b><br />{codeBytes.length}</div>
                            <div><b>Processed hash:</b><br />{blake2AsHex(codeBytes, 256)}</div>
                        </div>
                    ),
                    icon: true,
                    status: 'info',
                }
                this.setState({
                    inputs,
                    codeBytes,
                    submitDisabled: false,
                })
            }
            reader.readAsArrayBuffer(file)
        } catch (err) {
            event.target.value = null
            fileIn.message = {
                content: `${err}`,
                header: texts.fileErr,
                icon: true,
                status: 'error',
            }
            this.setState({
                inputs,
                codeBytes: null,
                submitDisabled: false,
            })
        }
    }

    handleSubmit = async () => {
        try {
            const { codeBytes } = this.state
            const { api, keyring } = await getConnection()
            // tx will fail if selected is not sudo identity
            const adminAddress = await query('api.query.sudo.key')  //getSelected().address
            const identity = getIdentity(adminAddress)
            this.setState({
                message: {
                    header: identity
                        ? texts.upgradingRuntime
                        : texts.accessDenied,
                    icon: true,
                    status: identity
                        ? 'loading'
                        : 'error',
                },
                submitDisabled: !!identity,
            })
            if (!identity) return
            // add idenitity to keyring on demand
            !keyring.contains(adminAddress) && keyring.add([identity.uri])
            const adminPair = await keyring.keyring.getPair(adminAddress)
            const useNewVersion = api.tx.system && api.tx.system.setCode
            const { setCode } = useNewVersion ? api.tx.system : api.tx.consensus
            const proposal = await setCode(codeBytes)
            const sudoProposal = await api.tx.sudo.sudo(proposal)
            console.log('Upgrading runtime. Size: ', codeBytes.length, 'bytes. Admin identity:', adminAddress)

            // Perform the actual chain upgrade via the sudo module
            await sudoProposal.signAndSend(adminPair, ({ events = [], status }) => {
                console.log('Proposal status:', status.type)

                if (status.isInBlock) {
                    console.error('Upgrade chain transaction included in block')
                    console.log('Upgrade chain transaction included in block', status.asInBlock.toHex())
                    console.log('Events:', JSON.parse(JSON.stringify(events.toHuman())))
                    return
                }

                if (!status.isFinalized) return
                console.log('Finalized block hash', status.asFinalized.toHex())

                this.setState({
                    message: {
                        header: texts.upgradeSuccessful,// : textsCap.upgradeFailed,
                        icon: true,
                        status: 'success',// : 'error',
                    },
                    submitDisabled: false,
                })
            })
        } catch (err) {
            console.error(err)
            this.setState({
                message: {
                    content: `${err}`,
                    header: texts.upgradeFailed,
                    icon: true,
                    status: 'error',
                },
                submitDisabled: false,
            })
        }
    }

    render = () => <FormBuilder {...{ ...this.props, ...this.state }} />
}
