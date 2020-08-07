import React from 'react'
import useBalancesByLedger from './useBalancesByLedger'
import { useSelected } from '../../services/identity'


export default function () {
    const selectedAddress = useSelected()
    const data = useBalancesByLedger(selectedAddress)

    return <div style={{ whiteSpace: 'pre' }}>
        {JSON.stringify(Array.from(data || ''), null, 16)}
    </div>
}