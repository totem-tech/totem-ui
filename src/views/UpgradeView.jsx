import React from 'react'
import { Bond } from 'oo7'
import { If, ReactiveComponent } from 'oo7-react'
import { calls, runtime } from 'oo7-substrate'
import { TransactButton } from '../TransactButton'
import { FileUploadBond } from '../FileUploadBond'

class UpgradeView extends ReactiveComponent {
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
				<div style={{paddingBottom: '20px'}}>
					<FileUploadBond bond={this.newRuntime} content="Select Runtime" />
				</div>
				<div>
					<TransactButton
						content="Upgrade"
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

export default UpgradeView
