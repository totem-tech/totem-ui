import React, { Component } from 'react'
import { Bond } from 'oo7'
import { If, ReactiveComponent } from 'oo7-react'
import { calls, runtime } from 'oo7-substrate'
import { TransactButton } from '../components/TransactButton'
import { FileUploadBond } from '../components/FileUploadBond'

import FormBuilder, { findInput } from '../components/FormBuilder'
// services
import { getConnection } from '../services/blockchain'
import { get as getIdentity } from '../services/identity'
import { compactAddLength } from '@polkadot/util'
import { blake2AsHex } from '@polkadot/util-crypto'

// Translation not required
const textsCap = {
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

export class UpgradeForm extends Component {
	constructor() {
		super()

		this.state = {
			message: {},
			onSubmit: this.handleSubmit,
			selectedFile: null,
			submitText: textsCap.upgrade,
			inputs: [{
				accept: '.wasm',
				label: textsCap.selectRuntime,
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
			if (!file.name.endsWith(fileIn.accept || '')) throw textsCap.invalidFile
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
					showIcon: true,
					status: 'info',
				}
				this.setState({ inputs, codeBytes, submitDisabled: false })
			}
			reader.readAsArrayBuffer(file)
		} catch (err) {
			event.target.value = null
			fileIn.message = {
				content: `${err}`,
				header: textsCap.fileErr,
				showIcon: true,
				status: 'error',
			}
			this.setState({ inputs, codeBytes: null, submitDisabled: false })
		}
	}

	handleSubmit = async () => {
		try {
			const { codeBytes } = this.state
			const { api, keyring } = await getConnection()
			// tx will fail if selected is not sudo identity
			const adminAddress = await api.query.sudo.key() //getSelected().address
			const identity = getIdentity(adminAddress)
			this.setState({
				message: {
					header: identity ? textsCap.upgradingRuntime : textsCap.accessDenied,
					showIcon: true,
					status: identity ? 'loading' : 'error',
				},
				submitDisabled: !!identity,
			})
			if (!identity) return

			const adminPair = await keyring.getPair(adminAddress)
			const useNewVersion = api.tx.system && api.tx.system.setCode
			const { setCode } = useNewVersion ? api.tx.system : api.tx.consensus
			const proposal = await setCode(codeBytes)
			const sudoProposal = await api.tx.sudo.sudo(proposal)
			console.log('Upgrading runtime. Size: ', (codeBytes.length / 2),
				'bytes. Admin identity:', identity)
			let includedInBlock = false

			// Perform the actual chain upgrade via the sudo module
			await sudoProposal.signAndSend(adminPair, ({ events = [], status }) => {
				console.log('Proposal status:', status.type)

				if (status.isInBlock) {
					console.error('Upgrade chain transaction included in block')
					console.log('Upgrade chain transaction included in block', status.asInBlock.toHex())
					console.log('Events:', JSON.parse(JSON.stringify(events.toHuman())))
					includedInBlock = true
					return
				}

				if (!status.isFinalized) return
				console.log('Finalized block hash', status.asFinalized.toHex())

				this.setState({
					message: {
						header: includedInBlock ? textsCap.upgradeSuccessful : textsCap.upgradeFailed,
						showIcon: true,
						status: includedInBlock ? 'success' : 'error',
					},
					submitDisabled: false,
				})
			})
		} catch (err) {
			this.setState({
				message: {
					content: `${err}`,
					header: textsCap.upgradeFailed,
					showIcon: true,
					status: 'error',
				},
				submitDisabled: false,
			})
		}
	}

	render = () => <FormBuilder {...this.state} />
}


export default class UpgradeViewOld extends ReactiveComponent {
	constructor() {
		super()
		this.conditionBond = runtime.metadata.map(m =>
			m.modules && m.modules.some(o => o.name === 'sudo')
			|| m.modules.some(o => o.name === 'upgrade_key')
		)
		this.newRuntime = new Bond
	}

	render() {
		const contents = (
			<div>
				<h1>PolkadotJS Upgrade Form</h1>
				<UpgradeForm />
				<h1>oo7-substrate Upgrade Form</h1>
				<div style={{ paddingBottom: '20px' }}>
					<FileUploadBond bond={this.newRuntime} content={textsCap.selectRuntime} />
				</div>
				<div>
					<TransactButton
						content={textsCap.upgrade}
						icon="warning"
						tx={{
							sender: runtime.sudo
								? runtime.sudo.key
								: runtime.upgrade_key.key,
							call: calls.sudo
								? calls.sudo.sudo(calls.consensus.setCode(this.newRuntime))
								: calls.upgrade_key.upgrade(this.newRuntime)
						}}
					/>
				</div>
			</div>
		)
		return <If condition={this.conditionBond} then={contents} />
	}
}
