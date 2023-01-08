import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { Button } from '../../components/buttons'
import DataTable from '../../components/DataTable'
import { rxBlockNumber } from '../../services/blockchain'
import { translated } from '../../services/language'
import { useRxSubject } from '../../services/react'
import { MOBILE, rxLayout } from '../../services/window'
import { blockToDate } from '../../utils/time'
import Currency from '../currency/Currency'
import { currencyDefault } from '../currency/currency'
import AddressName from '../partner/AddressName'
import useLedgerAcPostings from './useLedgerAcPostings'

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

    const [isMobile] = useRxSubject(rxLayout, l => l === MOBILE)
    const [state] = useState(() => ({
        columns: [
            !isMobile && {
                collapsing: true,
                textAlign: 'center',
                key: 'tsEffective',
                title: textsCap.date,
            },
            {
                collapsing: true,
                content: ({ partnerAddress }) => <AddressName {...{ address: partnerAddress }} />,
                draggableValueKey: 'partnerAddress',
                key: 'partnerAddress',
                textAlign: 'left',
                title: textsCap.partner,
            },
            {
                textAlign: 'center',
                key: '_debit',
                sortKey: 'debit',
                title: textsCap.debit,
            },
            {
                textAlign: 'center',
                key: '_credit',
                sortKey: 'credit',
                title: textsCap.credit,
            },
            !isMobile && {
                textAlign: 'center',
                key: 'id',
                title: textsCap.postingId,
            },
            {
                collapsing: true,
                content: getActions,
                textAlign: 'center',
                title: textsCap.actions,
            },
        ].filter(Boolean),
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
            style: {
                padding: undefined, // overrides 0 padding in DataTable component
                paddingTop: 1,
                marginTop: isMobile
                    ? undefined
                    : -10
            }
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
    const {
        blockNrSubmitted,
        blockNrEffective,
        id,
        isCredit,
        amount,
        partnerAddress,
    } = posting
    posting.tsSubmitted = blockToDate(blockNrSubmitted, rxBlockNumber.value)
    posting.tsEffective = blockToDate(blockNrEffective, rxBlockNumber.value)
    posting.credit = isCredit && amount || 0
    posting.debit = !isCredit && amount || 0
    posting.key = id
    // posting._partnerName = <AddressName {...{ address: partnerAddress }} />
    posting._credit = !isCredit
        ? 0
        : (
            <Currency {...{
                unit: currencyDefault,
                value: posting.credit,
            }} />
        )
    posting._debit = isCredit
        ? 0
        : (
            <Currency {...{
                unit: currencyDefault,
                value: posting.debit,
            }} />
        )

    return posting
}

export default React.memo(PostingList)