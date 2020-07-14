import React, { useReducer, useEffect } from 'react'
import uuid from 'uuid'
import { Bond } from 'oo7'
import { If, ReactiveComponent } from 'oo7-react'
import { calls, runtime, bytesToHex } from 'oo7-substrate'
import { TransactButton } from '../components/TransactButton'
import { FileUploadBond } from '../components/FileUploadBond'

import { decodeUTF8, hashToStr } from '../utils/convert'
import FormBuilder, { findInput } from '../components/FormBuilder'
// services
import { getConnection } from '../services/blockchain'
import { get as getIdentity, getSelected } from '../services/identity'
import { reducer } from '../services/react'

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

export const UpgradeForm = props => {
	const [state, setState] = useReducer(reducer, {
		message: {},
		onSubmit: async (_, { codeHex }) => {
			try {
				const { api, keyring } = await getConnection()
				const adminAddress = getSelected().address //await api.query.sudo.key()
				const identity = getIdentity(adminAddress)
				setState({
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
				const proposal = await setCode(codeHex)
				const sudoProposal = await api.tx.sudo.sudo(proposal)
				console.log('Upgrading runtime. Size: ', ((codeHex.length - 2) / 2), 'bytes. Admin identity:', identity)
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

					setState({
						message: {
							header: includedInBlock ? textsCap.upgradeSuccessful : textsCap.upgradeFailed,
							showIcon: true,
							status: includedInBlock ? 'success' : 'error',
						},
						submitDisabled: false,
					})
				})
			} catch (err) {
				setState({
					message: {
						content: `${err}`,
						header: textsCap.upgradeFailed,
						showIcon: true,
						status: 'error',
					},
					submitDisabled: false,
				})
			}
		},
		selectedFile: null,
		submitText: textsCap.upgrade,
		inputs: [
			{
				accept: '.wasm',
				id: 'file-input',
				label: textsCap.selectRuntime,
				name: 'file',
				required: true,
				type: 'file',
				onChange: event => {
					const { inputs } = state
					const fileIn = findInput(inputs, 'file')
					const codeHexIn = findInput(inputs, 'codeHex')
					try {
						const file = event.target.files[0]
						var reader = new FileReader()
						reader.onload = e => {
							codeHexIn.bond.changed(hashToStr(decodeUTF8(e.target.result)))
							setState({ inputs })
							e.target.value = null
						}
						reader.readAsText(file)
					} catch (err) {
						event.target.value = null
						codeHexIn.bond.changed('')
						fileIn.message = {
							content: `${err}`,
							header: textsCap.fileErr,
							showIcon: true,
							status: 'error',
						}
						setState({ inputs })
					}
				},
				validate: event => {
					const { accept } = findInput(state.inputs, 'file')
					const file = event.target.files[0]
					if (file.name.endsWith(accept || '')) return

					// reset textarea
					findInput(state.inputs, 'codeHex').bond.changed('')
					// reset file input
					event.target.value = null
					return textsCap.invalidFile
				}
			},
			{
				bond: new Bond(),
				name: 'codeHex',
				readOnly: true,
				required: true,
				type: 'textarea',
				value: '',
			},
		],
	})

	return <FormBuilder {...{ ...props, ...state }} />
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
				<UpgradeForm />
				<h1>Old Upgrade Form</h1>
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
