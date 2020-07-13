import React, { useReducer, useEffect } from 'react'
import uuid from 'uuid'
import { Bond } from 'oo7'
import { If, ReactiveComponent } from 'oo7-react'
import { calls, runtime, bytesToHex } from 'oo7-substrate'
import { TransactButton } from '../components/TransactButton'
import { FileUploadBond } from '../components/FileUploadBond'
import { translated } from '../services/language'
import { reducer } from '../services/react'
import FormBuilder, { findInput } from '../components/FormBuilder'
import { decodeUTF8 } from '../utils/convert'

const textsCap = translated({
	invalidFile: 'invalid file type selected',
	fileErr: 'failed to process file',
	selectRuntime: 'select runtime',
	upgrade: 'upgrade',
}, true)[1]

export function UpgradeForm(props) {
	const getState = () => state
	const [state, setState] = useReducer(reducer, {
		id: uuid.v1(),
		onSubmit: (e, v) => {
			console.log({ e, v })
		},
		selectedFile: null,
		submitText: textsCap.upgrade,
		inputs: [
			{
				// accept: '.wasm',
				label: textsCap.selectRuntime,
				name: 'file',
				required: true,
				type: 'file',
				onChange: (e, { action }) => {
					const { inputs } = getState()
					const fileIn = findInput(inputs, 'file')
					const fileHexIn = findInput(inputs, 'fileHex')
					try {
						const file = e.target.files[0]
						var reader = new FileReader()
						const { accept } = fileIn

						if (!file.name.endsWith(accept || '')) {
							e.target.value = null
							throw textsCap.invalidFile
						}

						reader.onload = function () { //le.target.result
							// const result = this.result
							// let hexStr = ''
							// for (var i = 0; i < result.length; i++) {
							// 	let byteStr = result.charCodeAt(i).toString(16);
							// 	if (byteStr.length < 2) {
							// 		byteStr = "0" + byteStr;
							// 	}
							// 	hexStr += " " + byteStr;
							// }
							// const bytes = result.split('').map(char => parseInt('0x' + char.toString(16)))
							// const hex = bytesToHex(bytes)
							// const bytes2 = decodeUTF8(result)
							// const hex2 = bytesToHex(bytes2)
							// alert(hex === hex2)
							// fileHexIn.value = hex
							// setState({ inputs })
							// e.target.value = null
						}
						// reader.readAsBinaryString(file)
						// reader.onload = le => {
						// 	fileHexIn.value = le.target.result
						// 	setState({ inputs })
						// 	e.target.value = null
						// }
						reader.readAsText(file)
					} catch (err) {
						console.log(err)
						fileHexIn.value = ''
						fileIn.message = {
							content: `${err}`,
							header: textsCap.fileErr,
							showIcon: true,
							status: 'error',
						}
						setState({ inputs })
					}
				}
			},
			{
				name: 'fileHex',
				readOnly: true,
				// onChange: (_, { fileHex }) => {
				// 	const { inputs } = state
				// 	const fileHexIn = findInput(inputs, 'fileHex')
				// 	fileHexIn.message = {
				// 		content: fileHex
				// 	}
				// 	setState({ inputs })
				// },
				required: true,
				type: 'textarea',
				value: '',
			},
		],

	})

	return !state.inputs ? '' : <FormBuilder {...{ ...props, ...state }} />
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
				<UpgradeForm style={{ maxWidth: 400 }} />
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
