import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { Icon } from 'semantic-ui-react'
import Currency from './Currency'
import { ss58Decode } from '../utils/convert'
import { query } from '../services/blockchain'

export const Balance = (props) => {
    const { address, emptyMessage } = props
    const balance = useBalance(address)

    return <Currency {...{
        ...props,
        value: balance,
        emptyMessage: (
            <span>
                <Icon
                    name='spinner'
                    loading={true}
                    style={{ padding: 0 }}
                />
                {emptyMessage}
            </span>
        )
    }} />
}
Balance.propTypes = {
    address: PropTypes.string.isRequired,
    emptyMessage: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.element,
    ])
    // any other props accepted by Currency component will be passed through
}
export default React.memo(Balance)

/**
 * @name useBalance
 * @summary custom React hook to retrieve identity balance and subscribe to changes
 * @param {String} address user identity
 * 
 * @returns {Number} account balance amount in XTX
 */
export function useBalance(address) {
    const [value, setValue] = useState()
    useEffect(() => {
        if (!ss58Decode(address)) return () => { }
        let mounted = true
        let unsubscribe = null
        // subscribe to address balance change
        const subscribe = async () => {
            unsubscribe = await query(
                'api.query.balances.freeBalance',
                [address, value => mounted && setValue(value)],
            )
        }

        // ignore errors
        subscribe().catch(() => { })
        return () => {
            mounted = false
            unsubscribe && unsubscribe()
        }
    }, [address])

    return value
}
useBalance.propTypes = {
    address: PropTypes.string.isRequired,
}

export const useBalances = (addresses = []) => addresses.map(address => useBalance(address))