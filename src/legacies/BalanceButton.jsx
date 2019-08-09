import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import { pretty, runtime, ss58Decode } from 'oo7-substrate'
import { Button } from 'semantic-ui-react'
import { setState, setStateTimeout } from '../utils/utils'

class BalanceButton extends ReactiveComponent {
    constructor(props) {
      super([], {
        balance: runtime.balances.balance(ss58Decode(props.address))
      })
  
      this.state = {
        show: false,
        disabled: false,
      }
  
      this.handleClick = this.handleClick.bind(this)
    }
  
    handleClick() {
      const delay = this.props.delay || 5000
      let doShow = true;
      ['show', 'disabled'].map(s => setStateTimeout(this, s, doShow, !doShow, delay))
    }
  
    render() {
        const { persist } = this.props
        const { balance, disabled, show } = this.state
        return !persist && !show ? (
            <Button
                icon="dollar"
                content="Show Balance"
                disabled={disabled}
                onClick={this.handleClick}
            />
        ) : ( 
            <div>{pretty(balance)}</div>
            // <Button
            //     icon="dollar"
            //     content="Balance"
            //     label={pretty(balance)}
            //     labelPosition="right"
            // />
        )
    }
  }

  export default BalanceButton