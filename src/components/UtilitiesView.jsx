import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import { calls, runtime, runtimeUp } from 'oo7-substrate'
import { TransactButton } from '../TransactButton.jsx'
import { FileUploadBond } from '../FileUploadBond.jsx'

class UtilitiesView extends ReactiveComponent {
  constructor() {
    super([], {ensureRuntime: runtimeUp})
  }

  readyRender() {
    return (
      <div style={{ paddingBottom: '1em' }}>
        <FileUploadBond bond={runtime} content="Select Runtime" />
        <TransactButton
          content="Upgrade"
          icon="warning"
          tx={{
            sender: runtime.sudo.key,
            call: calls.sudo.sudo(calls.consensus.setCode(runtime))
          }}
        />
      </div>
    )
  }
}


export default UtilitiesView
