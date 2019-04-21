import React from "react";
import { Button } from "semantic-ui-react";
const { generateMnemonic } = require("bip39");
import { secretStore } from "oo7-substrate";
import { InputBond } from "../InputBond.jsx";
import { TransformBondButton } from "../TransformBondButton";
import Identicon from "polkadot-identicon";
import { WalletList, SecretItem } from "../WalletList";

class WalletView extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <React.Fragment>
        <div style={{ paddingBottom: "1em" }}>
          <div style={{ fontSize: "small" }}>seed</div>
          <InputBond
            bond={props.seed}
            reversible
            placeholder="Some seed for this key"
            validator={n => n || null}
            action={
              <Button
                content="Another"
                onClick={() => props.seed.trigger(generateMnemonic())}
              />
            }
            iconPosition="left"
            icon={
              <i style={{ opacity: 1 }} className="icon">
                <Identicon
                  account={props.seedAccount}
                  size={28}
                  style={{ marginTop: "5px" }}
                />
              </i>
            }
          />
        </div>
        <div style={{ paddingBottom: "1em" }}>
          <div style={{ fontSize: "small" }}>name</div>
          <InputBond
            bond={props.name}
            placeholder="A name for this key"
            validator={n =>
              n ? secretStore().map(ss => (ss.byName[n] ? null : n)) : null
            }
            action={
              <TransformBondButton
                content="Create"
                transform={(name, seed) => secretStore().submit(seed, name)}
                args={[props.name, props.seed]}
                immediate
              />
            }
          />
        </div>
        <div style={{ paddingBottom: "1em" }}>
          <WalletList />
        </div>
      </React.Fragment>
    );
  }
}

export default WalletView;
