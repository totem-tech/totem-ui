import React from 'react';
import { calls, runtime } from 'oo7-substrate';
import { TransactButton } from '../TransactButton.jsx';
import { FileUploadBond } from '../FileUploadBond.jsx';

const UtilitiesView = props => (
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
);

export default UtilitiesView;
