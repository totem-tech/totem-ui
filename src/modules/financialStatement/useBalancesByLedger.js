import React, { useState, useEffect } from 'react'
import { query, getConnection } from '../../services/blockchain'
import { isFn, isAddress } from '../../utils/utils'
import client from '../../services/chatClient'

export default function useBalancesByLedger(address) {
    const [balances, setBalances] = useState([])

    useEffect(() => {
        let mounted = true
        const unsubscribers = {}
        const handleAccounts = async (accounts) => {
            const glAccounts = await client.glAccounts.promise(accounts.map(a => `${a}`)) // convert to string
            console.log(glAccounts)
            // unsubscribe if there is already an existing subscription
            unsubscribers.balance && unsubscribers.balance()
            unsubscribers.balance = await query(
                'api.query.accounting.balanceByLedger',
                [
                    accounts.map(() => address),
                    accounts,
                    handleBalancesCb(accounts, glAccounts)
                ],
                true,
            )
        }
        const handleBalancesCb = (accounts, glAccounts) => (_, balances) => {
            setBalances(new Map(
                balances.map(({ negative, words }, i) => [
                    accounts[i],
                    (negative ? -1 : 1) * words[0],
                ])
            ))
        }
        isAddress(address) && getConnection().then(async () => {
            if (!mounted) return
            unsubscribers.accounts && unsubscribers.accounts()
            unsubscribers.accounts = await query(
                'api.query.accounting.accountsById',
                [address, handleAccounts], //
            )
        })

        return () => {
            mounted = false
            Object.values(unsubscribers).forEach(fn => isFn(fn) && fn())
        }
    }, [address])

    return balances
}