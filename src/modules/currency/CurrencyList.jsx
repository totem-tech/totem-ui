import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Icon, Popup } from 'semantic-ui-react'
import { format } from '../../utils/time'
import { isDate } from '../../utils/utils'
import DataTable from '../../components/DataTable'
import Invertible from '../../components/Invertible'
import TimeSince from '../../components/TimeSince'
import { translated } from '../../services/language'
import { useRxSubject } from '../../services/react'
import client from '../chat/ChatClient'
import Converter from './Converter'
import Currency from './Currency'
import { getCurrencies, rxSelected } from './currency'

const textsCap = translated({
    emptyMessageDate: 'no data available for the selected date',
    name: 'name',
    price: 'daily reference rate',
    rank: 'rank',
    source: 'source',
    status: 'status',
    ticker: 'ticker',
    type: 'type',
    updated: 'updated',
}, true)[1]

export default function CurrencyList(props) {
    const { date = '' } = props
    const gotDate = `${date}`.length === 10 && isDate(new Date(date))
    const [selectedCurrency] = useRxSubject(rxSelected)
    const [tableData, setTableData] = useState([])
    const [tableProps] = useState({
        columns: [
            {
                collapsing: true,
                key: '_statusIndicator',
                sortKey: '_statusName',
                style: { cursor: 'pointer' },
                textAlign: 'center',
                title: textsCap.status,
            },
            {
                collapsing: true,
                key: 'rank',
                sortKey: '_rankSort',
                textAlign: 'center',
                title: textsCap.rank,
            },
            {
                key: 'name',
                title: textsCap.name,
            },
            {
                key: 'ticker',
                textAlign: 'center',
                title: textsCap.ticker,
            },
            {
                key: 'type',
                textAlign: 'center',
                title: textsCap.type,
            },
            {
                collapsing: true,
                key: '_priceEl',
                sortable: false,
                textAlign: 'center',
                title: textsCap.price,
            },
            {
                collapsing: true,
                key: 'source',
                title: textsCap.source,
            },
        ],
        tableProps: { celled: false },
    })

    useEffect(() => {
        let mounted = true
        const fetchData = async () => {
            let unitDisplayedROE, currencies = new Map(), USD
            let unitDisplayed = rxSelected.value
            const allCurrencies = new Map(
                (await getCurrencies())
                    .map(c => {
                        if (c.type === 'fiat' && c.ticker === 'USD') USD = c
                        return [c._id, c]
                    })
            )
            if (gotDate) {
                const prices = await client.currencyPricesByDate.promise(date, [])
                prices.map(p => {
                    const { currencyID, ratioOfExchange } = p
                    const currency = allCurrencies.get(currencyID || USD._id)
                    if (!currency) return 

                    currency.ratioOfExchange = ratioOfExchange
                    currency.priceUpdatedAt = date
                    currencies.set(currencyID, { ...currency })
                    
                    if (currency.currency !== unitDisplayed) return
                    unitDisplayedROE = ratioOfExchange
                })

                unitDisplayed = unitDisplayedROE
                    ? unitDisplayed
                    : USD.currency
                unitDisplayedROE = unitDisplayedROE || USD.ratioOfExchange
            } else {
                currencies = allCurrencies
            }

            const data = Array.from(currencies)
                .map(getRowData( unitDisplayed, unitDisplayedROE ))
            
            mounted && setTableData(data)
        }
        fetchData()

        return () => mounted = false
    }, [date, selectedCurrency])

    return (
        <DataTable {...{
            ...props,
            ...tableProps,
            data: tableData,
            emptyMessage: gotDate
                ? { content: textsCap.emptyMessageDate }
                : props.emptyMessage,
        }} />
    )
}
CurrencyList.propTypes = {
    // (optional) if specified will display prices for that date only
    // PS: currencies that does not have a daily historical price for that date will not be listed
    // Expected date format: YYYY-MM-DD
    date: PropTypes.string,
}
CurrencyList.defaultProps = {
    date: null, // show current prices
    topLeftMenu: [
        <Converter key='c' style={{ maxWidth: 500}}></Converter>
    ],
}

const getRowData = (unitDisplayed, unitDisplayedROE) => ([_, currency]) => {
    const {
        currency: unit,
        priceUpdatedAt: ts,
        rank,
        ratioOfExchange,
    } = currency
    // checks if price has been updated within 24 hours
    const isActive = (new Date() - new Date(ts)) <= 86400000
    const statusCode = !ts
        ? 3
        : !isActive
            ? 2
            : 1
    const statusColors = [
        'green',
        'yellow',
        'grey',
    ]
    const icon = (
        <div>
            <Icon {...{
                className: 'no-margin',
                color: statusColors[statusCode - 1],
                name: 'circle',
            }} />
        </div>
    )
    const _statusIndicator = statusCode === 3
        ? icon
        : (
            <Invertible {...{
                content: `${textsCap.updatedAt} ${format(new Date(ts), false)}`,
                content: (
                    <div>
                        {textsCap.updated + ' '}
                        <TimeSince {...{ El: 'span', date: ts, key: ts }} />
                    </div>
                ),
                El: Popup,
                eventsEnabled: false,
                on: ['click', 'focus', 'hover'],
                size: 'mini',
                trigger: icon,
            }} />
        )
    
    // display the price of one unit
    const _priceEl = <Currency {...{
        fromROE: ratioOfExchange,
        title: null,
        unit,
        unitDisplayed, 
        unitDisplayedROE,
        value: 1,
    }} />
    return {
        ...currency,
        _rankSort: rank || 999999,
        _priceEl,
        _statusIndicator,
        _statusName: statusCode + (rank || 999999),
    }
}