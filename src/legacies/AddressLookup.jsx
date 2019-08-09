import React from 'react'
import { Label } from 'semantic-ui-react'
import { Bond } from 'oo7'
import { If, ReactiveComponent, Rspan} from 'oo7-react'
import { runtime, runtimeUp } from 'oo7-substrate'
import { Pretty } from '../Pretty'
import { isObj, isFn } from '../utils/utils'

class AddressLookup extends ReactiveComponent{
    constructor(props) {
        super(props, {runtimeUp})
    }

    render() {
        const { address } = this.props
        const ready = address instanceof Bond ? address.ready() : true
        return !ready ? '' : (
            <div>
                <Label>
                    Balance
                    <Label.Detail>
                        <Pretty value={runtime.balances.balance(address)} />
                    </Label.Detail>
                </Label>
                <Label>
                    Nonce
                    <Label.Detail>
                        <Pretty value={runtime.system.accountNonce(address)} />
                    </Label.Detail>
                </Label>
                <If
                    condition={runtime.indices.tryIndex(address, null).map(x => x !== null)}
                    then={
                        <Label>
                            Short-form
                            <Label.Detail>
                                <Rspan>
                                    {runtime.indices.tryIndex(address).map(i => ss58Encode(i) + ` (index ${i})`)}
                                </Rspan>
                            </Label.Detail>
                        </Label>
                    }
                />
                <div>
                    <Label>
                        Address
                        <Label.Detail>
                            <Pretty value={address} />
                        </Label.Detail>
                    </Label>
                </div>
            </div>
        )
    }
}
export default AddressLookup