import React, { useState, useEffect } from 'react'
import { translated } from '../../services/language'
import { useRxSubject } from '../../services/react'
import { isAddress, isFn } from '../../utils/utils'
import client from '../chat/ChatClient'
import { rxSelected } from '../identity/identity'
import query from './query'

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
 * @param   {String}    address     identity of the user. If falsy, will use selected identity.
 * @param   {Function}  modifier    (optional) function to modify balances before updating state.
 *                                  Args: balances, address
 * 
 * @returns {Array} [
 *                      @result     {Array|null} list of ledger accounts with balances,
 *                      @message    {Object}     message with request status for use with `Message` component
 *                      @address    {String}     user identity
 *                  ]
 */
export default function useLedgerAcBalances(address, modifier, timeout = 10000) {
    address = address || useRxSubject(rxSelected)[0]
    const [balances, setBalancesOrg] = useState()
    const [message, setMessage] = useState()

    useEffect(() => {
        let mounted = true
        const unsubscribers = {}
        let loaded = false
        let error = false
        const setBalances = balances => setBalancesOrg(
            !isFn(modifier)
                ? balances
                : modifier(balances, address)
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

    return [balances, message, address]
}
