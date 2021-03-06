import React, { useState, useEffect } from 'react'
import { isAddress, isFn, isDefined } from '../../utils/utils'
import { query as queryHelper } from '../../services/blockchain'
import client from '../chat/ChatClient'
import { translated } from '../../services/language'
import { iUseReducer, useRxSubject } from '../../services/react'
import { rxSelected } from '../identity/identity'

const textsCap = translated({
    errorHeader: 'failed to retrieve accounts',
    invalidAddress: 'invalid or no identity supplied',
    loading: 'loading accounts',
    timeoutMsg: 'request is taking longer than expected',
    emptyMessage: 'no data available'
}, true)[1]

/**
 * @name    useLedgerAcBalances
 * @summary a custom React hook that retrieves a list of ledger accounts and their balances by identity
 * 
 * @param   {String}    address             identity of the user. If falsy, will use selected identity.
 * @param   {Function}  balancesModifier    (optional) modifier for `balances returned`
 * 
 * @returns {Array} [
 *                      @result     {Array|null} list of ledger accounts with balances,
 *                      @message    {Object}    message with request status for use with `Message` component
 *                  ]
 */
export default function useLedgerAcBalances(address, balancesModifier, timeout = 10000) {
    address = address || useRxSubject(rxSelected)[0]
    const [balances, setBalancesOrg] = useState()
    const [message, setMessage] = useState()

    useEffect(() => {
        let mounted = true
        const unsubscribers = {}
        let loaded = false
        let error = false
        const setBalances = balances => setBalancesOrg(
            !isFn(balancesModifier)
                ? balances
                : balancesModifier(balances)
        )
        const loadingMsg = {
            content: textsCap.loading,
            icon: true,
            status: 'loading',
        }
        const errorMsg = {
            header: textsCap.errorHeader,
            icon: true,
            status: 'error',
        }
        if (!isAddress(address)) return setMessage({ ...errorMsg, header: textsCap.invalidAddress })

        const handleAccounts = async (accounts = []) => {
            if (!mounted) return
            let empty = !accounts.length
            try {
                if (empty) throw textsCap.emptyMessage
                const glAccounts = await client.glAccounts.promise(accounts.map(a => `${a}`)) // convert to string
                // unsubscribe if there is already an existing subscription
                unsubscribers.balance && unsubscribers.balance()
                unsubscribers.balance = await query.balanceByLedger(
                    accounts.map(() => address), // construct an array for multi query
                    accounts,
                    handleBalancesCb(accounts, glAccounts),
                    true,
                )
            } catch (err) {
                error = true
                setBalances(null)
                setMessage({
                    ...(!empty ? errorMsg : {
                        status: 'basic',
                    }),
                    content: `${err}`,
                })
            }
        }
        const handleBalancesCb = (accounts, glAccounts) => (_, balances) => {
            if (!mounted) return
            // convert BN (BigNumber) to JS Number type
            balances = balances.map(b => b.toNumber())
            glAccounts.forEach(glAccount => {
                const { number: account } = glAccount
                const index = accounts.indexOf(parseInt(account))
                glAccount.balance = balances[index] || 0
            })
            loaded = true
            setBalances(glAccounts)
        }

        // in case of address change, force empty result and show loading message
        setBalances(null)
        setMessage(loadingMsg)

        query.accountsById(address, handleAccounts)
            .then(unsubscribe =>
                unsubscribers.accounts = unsubscribe
            )

        // update message if accounts and balances hasn't been loaded after timeout duration
        setTimeout(() => {
            if (!mounted || loaded || error) return
            setMessage({
                ...loadingMsg,
                content: textsCap.timeoutMsg,
            })
        }, timeout)

        return () => {
            mounted = false
            Object.values(unsubscribers)
                .forEach(fn => isFn(fn) && fn())
        }
    }, [address])

    return [balances, message]
}

const query = {
    /**
     * @name    accountsById
     * @summary retrieve a list of accounts by identity
     * 
     * @param {String|Array}    address user identity
     * @param {Function|null}   callback (optional) callback function to subscribe to changes.
     *                              If supplied, once result is retrieved function will be invoked with result.
     *                              Default: null
     * @param {Boolean}         multi (optional) indicates whether it is a multi query. Default: false.
     * 
     * @returns {*|Function}    if a @callback is a function, will return a function to unsubscribe. Otherwise, result.
     */
    accountsById: async (address, callback = null, multi = false) => await queryHelper(
        'api.query.accounting.accountsById',
        [address, callback].filter(isDefined),
        multi,
    ),
    /**
     * @name    balanceByLedger
     * @summary retrieve ledger account balance
     * 
     * @param {String|Array}    address user identity
     * @param {Number|Array}    ledgerAccount ledger account number
     * @param {Function|null}   callback (optional) callback function to subscribe to changes.
     *                              If supplied, once result is retrieved function will be invoked with result.
     *                              Default: null
     * @param {Boolean}         multi (optional) indicates whether it is a multi query. Default: false.
     * 
     * @returns {*|Function}    if a @callback is a function, will return a function to unsubscribe. Otherwise, result.
     */
    balanceByLedger: async (address, ledgerAccount, callback = null, multi = false) => await queryHelper(
        'api.query.accounting.balanceByLedger',
        [address, ledgerAccount, callback].filter(isDefined),
        multi,
    ),
    glAccounts: async (accountNumbers) => await client.glAccounts.promise(accountNumbers.map(a => `${a}`))
}