import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { Icon } from 'semantic-ui-react'
import { isArr, isValidNumber } from '../utils/utils'
import Currency from './Currency'
import { query } from '../services/blockchain'
import { translated } from '../services/language'
import { unsubscribe } from '../services/react'

const textsCap = translated({
    lockedAmount: 'locked amount'
}, true)[1]

export const Balance = (props) => {
    const { address, emptyMessage } = props
    const balance = useBalance(address)
    const locks = userLocks(address)
    const lockedBalance = locks.reduce((sum, next) => sum + next.amount, 0)
    const freeBalance = !isValidNumber(balance) ? undefined : balance - lockedBalance

    return <Currency {...{
        ...props,
        title: lockedBalance && `${textsCap.lockedAmount}: ${lockedBalance} XTX`,// use conversion??
        value: freeBalance,
        emptyMessage: emptyMessage === null ? '' : (
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
    // use null to prevent  displaying loading spinner
    emptyMessage: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.element,
    ])
    // any other props accepted by Currency component will be passed through
}
export default React.memo(Balance)

/**
 * @name    useBalance
 * @summary custom React hook to retrieve identity balance and subscribe to changes
 * 
 * @param   {String|Array}  address user identity
 * 
 * @returns {Number|Array} account balance amount in XTX
 */
export const useBalance = (address) => {
    const [balance, setBalance] = useState()

    useEffect(() => {
        if (!address) return () => { }
        let mounted = true
        let subscriptions = {}
        // subscribe to address balance change
        const subscribe = async () => {
            subscriptions.balance = await query(
                'api.query.balances.freeBalance',
                [address, balance => mounted && setBalance(balance)],
                isArr(address),
            )
        }

        // ignore errors
        subscribe().catch(() => { })
        return () => {
            mounted = false
            unsubscribe(subscriptions)
        }
    }, [address])

    return balance
}
useBalance.propTypes = {
    address: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.arrayOf(PropTypes.string),
    ]).isRequired,
}

/**
 * @name    userLocks
 * @summary custom React hook to retrieve locked balances by identity and subscribe to changes
 *
 * @param   {String|Array}  address user identity
 *
 * @returns {Object|Array}
 */
export const userLocks = (address) => {
    const [locks, setLocks] = useState([])

    useEffect(() => {
        if (!address) return () => { }
        let mounted = true
        let subscriptions = {}
        const subscribe = async () => {
            subscriptions.locks = await query(
                'api.query.balances.locks',
                [address, locks => mounted && setLocks(locks)],
                isArr(address),
            )
        }

        // ignore error
        subscribe().catch(() => { })

        return () => {
            mounted = false
            unsubscribe(subscriptions)
        }
    }, [address])

    return locks
}
userLocks.propTypes = {
    address: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.arrayOf(PropTypes.string),
    ]).isRequired,
}