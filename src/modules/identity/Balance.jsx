import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { Icon } from 'semantic-ui-react'
import { isArr, isValidNumber } from '../../utils/utils'
// services
import { query } from '../../services/blockchain'
import { translated } from '../../services/language'
import { unsubscribe } from '../../services/react'
// modules
import { currencyDefault } from '../currency/currency'
import Currency from '../currency/Currency'

const textsCap = translated({
    loadingAccBal: 'loading account balance',
    locked: 'locked',
    total: 'total',
}, true)[1]

export const Balance = (props) => {
    let { address, emptyMessage, lockSeparator, showDetailed, style, unitDisplayed } = props
    const [showLocked, setShowLocked] = useState(showDetailed)
    const balance = useBalance(address)
    const locks = userLocks(address)
    const isLoading = !isValidNumber(balance)
    const lockedBalance = locks.reduce((sum, next) => sum + next.amount, 0)
    const freeBalance = isLoading ? undefined : balance - lockedBalance
    style = { cursor: 'pointer', ...style }
    const handleClick = showDetailed === null ? undefined : (
        e => e.stopPropagation() | setShowLocked(!showLocked)
    )

    if (!isLoading && showLocked) return (
        <Currency {...{
            ...props,
            onClick: handleClick,
            prefix: `${textsCap.total}: `,
            style,
            value: balance,
            unit: currencyDefault,
            suffix: (
                <Currency {...{
                    prefix: <span>{lockSeparator}{textsCap.locked}: </span>,
                    value: lockedBalance,
                    unit: currencyDefault,
                    unitDisplayed,
                }} />
            )
        }} />
    )
    return (
        <Currency {...{
            ...props,
            onClick: handleClick,
            style,
            value: freeBalance,
            emptyMessage: emptyMessage === null ? '' : (
                <span title={!isLoading ? '' : textsCap.loadingAccBal}>
                    <Icon {...{
                        className: 'no-margin',
                        name: 'spinner',
                        loading: true,
                        style: { padding: 0 },
                    }} />
                    {emptyMessage}
                </span>
            )
        }} />
    )
}
Balance.propTypes = {
    address: PropTypes.string.isRequired,
    // use null to prevent  displaying loading spinner
    emptyMessage: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.element,
    ]),
    // @showDetailed: if truthy will display total balance and locked balance. Otherwise, free balance.
    showDetailed: PropTypes.bool,
    // any other props accepted by Currency component will be passed through
}
Balance.defaultProps = {
    lockSeparator: ' | ',
    showDetailed: false,
}
export default React.memo(Balance)

/**
 * @name    useBalance
 * @summary custom React hook to retrieve identity balance and subscribe to changes
 * 
 * @param   {String|Array}  address user identity
 * 
 * @returns {Number|Array} account balance amount in TOTEM
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