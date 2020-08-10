import React from 'react'
import Message from '../../components/Message'
import { useSelected } from '../../services/identity'
import useLedgerAcBalances from './useLedgerAcBalances'
import AccountDrillDownList, { getNestedBalances } from './AccountDrillDownList'

export default function FinancialStatementView() {
    const selectedAddress = useSelected()
    const [glAcBalances, message] = useLedgerAcBalances(selectedAddress)
    const nestedBalances = getNestedBalances(glAcBalances)
    
    return (
        <div style={{ whiteSpace: 'pre' }}>
            {glAcBalances && (
                nestedBalances.map((level, i) => (
                    <AccountDrillDownList {...{
                        key: i + level.balance,
                        glAccounts: [level],
                        style: { margin: '15px 0' }
                    }} />
                ))
            )}
            <Message {...message} className='empty-message' />
        </div>
    )
}
