import React from "react";
import { Icon, Label } from "semantic-ui-react";
import { If } from "oo7-react";
import { runtime, addressBook } from "oo7-substrate";
import { InputBond } from "../InputBond";
import { AccountIdBond, SignerBond } from "../AccountIdBond";
import { Pretty } from "../Pretty";
import { AddressBookList } from "../AddressBookList";
import { TransformBondButton } from "../TransformBondButton";

const AddressBookView = props => (
  <React.Fragment>
    <div style={{ paddingBottom: "1em" }}>
      <div style={{ fontSize: "small" }}>lookup account</div>
      <AccountIdBond bond={props.lookup} />
      <If
        condition={props.lookup.ready()}
        then={
          <div>
            <Label>
              Balance
              <Label.Detail>
                <Pretty value={runtime.balances.balance(props.lookup)} />
              </Label.Detail>
            </Label>
            <Label>
              Nonce
              <Label.Detail>
                <Pretty value={runtime.system.accountNonce(props.lookup)} />
              </Label.Detail>
            </Label>
            <Label>
              Address
              <Label.Detail>
                <Pretty value={props.lookup} />
              </Label.Detail>
            </Label>
          </div>
        }
      />
    </div>
    <div style={{ paddingBottom: "1em" }}>
      <div style={{ fontSize: "small" }}>name</div>
      <InputBond
        bond={props.nick}
        placeholder="A name for this address"
        validator={n =>
          n ? addressBook().map(ss => (ss.byName[n] ? null : n)) : null
        }
        action={
          <TransformBondButton
            content="Add"
            transform={(name, account) => {
              addressBook().submit(account, name);
              return true;
            }}
            args={[props.nick, props.lookup]}
            immediate
          />
        }
      />
    </div>
    <div style={{ paddingBottom: "1em" }}>
      <AddressBookList />
    </div>
  </React.Fragment>
);

export default AddressBookView;
