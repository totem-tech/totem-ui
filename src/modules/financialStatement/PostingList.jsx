import PropTypes from 'prop-types'
import React, { useState } from 'react'
import { Button } from '../../components/buttons'
import DataTable from '../../components/DataTable'
import { rxBlockNumber } from '../../services/blockchain'
import { translated } from '../../utils/languageHelper'
import { useIsMobile } from '../../utils/reactjs'
import { blockToDate } from '../../utils/time'
import Currency from '../currency/Currency'
import { currencyDefault } from '../currency/currency'
import AddressName from '../partner/AddressName'
import useLedgerAcPostings from './useLedgerAcPostings'

const textsCap = {
    actions: 'actions',
    credit: 'credit',
    date: 'date',
    debit: 'debit',
    partner: 'partner',
    postingId: 'posting ID',
}
translated(textsCap, true)

const PostingList = props => {
    const { address, ledgerAccount } = props
    if (!address || !ledgerAccount) return ''

    const isMobile = useIsMobile()
    const [state] = useState(() => ({
        columns: [
            !isMobile && {
                collapsing: true,
                textAlign: 'center',
                key: 'tsEffective',
                title: textsCap.date,
            },
            {
                // collapsing: true,
                content: ({ partnerAddress }) => (
                    <AddressName {...{
                        address: partnerAddress,
                        maxLength: 15,
                    }} />
                ),
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
                key: '_id',
                title: textsCap.postingId,
            },
            {
                collapsing: true,
                content: getActions,
                print: 'no',
                textAlign: 'center',
                title: textsCap.actions,
            },
        ].filter(Boolean),
        defaultSortAsc: false,
        style: {
            padding: undefined, // overrides 0 padding in DataTable component
            paddingTop: 1,
            marginTop: isMobile
                ? undefined
                : -10
        },
        tableProps: {
            name: 'FiSt-PostingList',
        }
    }))
    const data = useLedgerAcPostings(
        address,
        ledgerAccount,
        postingModifier
    )

    return (
        <DataTable {...{
            ...props,
            ...state,
            data,
            searchable: data.length > 1,
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
        onClick: () => setTimeout(() => alert('To be implemented')) | console.log({ posting })
    }} />
)

const postingModifier = (posting = {}) => {
    const {
        blockNrSubmitted,
        blockNrEffective,
        id,
        isCredit,
        amount,
        // partnerAddress,
    } = posting
    posting.tsSubmitted = blockToDate(blockNrSubmitted, rxBlockNumber.value)
    posting.tsEffective = blockToDate(blockNrEffective, rxBlockNumber.value)
    posting.credit = isCredit && amount || 0
    posting.debit = !isCredit && amount || 0
    posting.key = id
    posting._id = `${id}`
    // posting._partnerName = <AddressName {...{ address: partnerAddress }} />
    posting._credit = (
        <Currency {...{
            unit: currencyDefault,
            value: !isCredit
                ? 0
                : posting.credit,
        }} />
    )
    posting._debit = (
        <Currency {...{
            unit: currencyDefault,
            value: isCredit
                ? 0
                : posting.debit,
        }} />
    )

    return posting
}

export default React.memo(PostingList)