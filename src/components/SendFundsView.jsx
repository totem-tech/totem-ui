import React from "react";
import { Label } from "semantic-ui-react";
import { calls, runtime } from "oo7-substrate";
import { If } from "oo7-react";
import { AccountIdBond, SignerBond } from "../AccountIdBond.jsx";
import { BalanceBond } from "../BalanceBond.jsx";
import { TransactButton } from "../TransactButton.jsx";
import { Pretty } from "../Pretty";

const SendFundsView = props => (
  <React.Fragment>
    <div style={{ paddingBottom: "1em" }}>
      <div style={{ fontSize: "small" }}>from</div>
      <SignerBond bond={props.source} />
      <If
        condition={props.source.ready()}
        then={
          <span>
            <Label>
              Balance
              <Label.Detail>
                <Pretty value={runtime.balances.balance(props.source)} />
              </Label.Detail>
            </Label>
            <Label>
              Nonce
              <Label.Detail>
                <Pretty value={runtime.system.accountNonce(props.source)} />
              </Label.Detail>
            </Label>
          </span>
        }
      />
    </div>
    <div style={{ paddingBottom: "1em" }}>
      <div style={{ fontSize: "small" }}>to</div>
      <AccountIdBond bond={props.destination} />
      <If
        condition={props.destination.ready()}
        then={
          <Label>
            Balance
            <Label.Detail>
              <Pretty value={runtime.balances.balance(props.destination)} />
            </Label.Detail>
          </Label>
        }
      />
    </div>
    <div style={{ paddingBottom: "1em" }}>
      <div style={{ fontSize: "small" }}>amount</div>
      <BalanceBond bond={props.amount} />
    </div>
    <TransactButton
      content="Send"
      icon="send"
      inverted={true}
      tx={{
        sender: runtime.indices.tryIndex(props.source),
        call: calls.balances.transfer(props.destination, props.amount)
      }}
    />
  </React.Fragment>
);

export default SendFundsView;
