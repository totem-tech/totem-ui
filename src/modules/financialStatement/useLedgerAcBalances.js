import React, { useState, useEffect } from 'react'
import { query, getConnection } from '../../services/blockchain'
import { isFn, isAddress } from '../../utils/utils'
import client from '../../services/chatClient'

export default function useLedgerAcBalances(address) {
    const [glAccountBalances, setGlAccountBalances] = useState()

    useEffect(() => {
        let mounted = true
        const unsubscribers = {}
        const handleAccounts = async (accounts) => {
            const glAccounts = await client.glAccounts.promise(accounts.map(a => `${a}`)) // convert to string
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
            balances = balances.map(({ negative, words }) => (negative ? -1 : 1) * words[0])
            glAccounts.forEach(glAccount => {
                const { number: account } = glAccount
                const index = accounts.indexOf(parseInt(account))
                glAccount._balance = balances[index] || 0
            })

            setGlAccountBalances(glAccounts)
        }
        isAddress(address) && getConnection().then(async () => {
            if (!mounted) return
            unsubscribers.accounts && unsubscribers.accounts()
            unsubscribers.accounts = await query(
                'api.query.accounting.accountsById',
                [address, handleAccounts],
            )
        })

        return () => {
            mounted = false
            Object.values(unsubscribers).forEach(fn => isFn(fn) && fn())
        }
    }, [address])

    return glAccountBalances
}