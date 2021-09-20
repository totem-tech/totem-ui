import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Button } from 'semantic-ui-react'
import { translated } from '../../services/language'
import { useRxSubject } from '../../services/react'
import DataTable from '../../components/DataTable'
import query from './query'
import useLedgerAcPostings from './useLedgerAcPostings'
import { blockNumberToTS } from '../../utils/time'
import { rxBlockNumber } from '../../services/blockchain'
import { getAddressName } from '../partner/partner'

const textsCap = translated({
    actions: 'actions',
    credit: 'credit',
    date: 'date',
    debit: 'debit',
    partner: 'partner',
    postingId: 'posting ID',
}, true)[0]

const PostingList = props => {
    const { address, ledgerAccount } = props
    if (!address || !ledgerAccount) return ''

    const [state] = useState(() => ({
        columns: [
            {
                textAlign: 'center',
                key: 'tsEffective',
                title: textsCap.date,
            },
            {
                textAlign: 'center',
                key: 'id',
                title: textsCap.postingId,
            },
            {
                textAlign: 'center',
                key: 'debit',
                title: textsCap.debit,
            },
            {
                textAlign: 'center',
                key: 'credit',
                title: textsCap.credit,
            },
            {
                key: '_partnerName',
                textAlign: 'center',
                title: textsCap.partner,
            },
            {
                collapsing: true,
                content: getActions,
                textAlign: 'center',
                title: textsCap.actions,
            },
        ],
    }))
    const data = useLedgerAcPostings(address, ledgerAccount, postingModifier)

    return (
        <DataTable {...{
            ...props,
            ...state,
            data,
            defaultSort: 'id',
            defaultSortAsc: false,
            searchable: data.length > 10,
        }} />
    )
}
PostingList.propTypes = {
    address: PropTypes.string,
    ledgerAccount: PropTypes.oneOfType([
        PropTypes.number,
        PropTypes.string,
    ]),
}

const getActions = (posting) => (
    <Button {...{
        icon: 'eye',
        onClick: () => setTimeout(() => alert('To be implemented'))
    }} />
)

const postingModifier = (posting = {}) => {
    const { blockNrSubmitted, blockNrEffective, id, isCredit, amount, partnerAddress } = posting
    posting.tsSubmitted = blockNumberToTS(blockNrSubmitted, rxBlockNumber.value)
    posting.tsEffective = blockNumberToTS(blockNrEffective, rxBlockNumber.value)
    posting.credit = isCredit && amount || 0
    posting.debit = !isCredit && amount || 0
    posting.key = id
    posting._partnerName = getAddressName(partnerAddress)
    return posting
}

export default React.memo(PostingList)