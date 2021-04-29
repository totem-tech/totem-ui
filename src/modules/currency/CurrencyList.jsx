import React from 'react'
import { Icon, Popup } from 'semantic-ui-react'
import DataTable from '../../components/DataTable'
import Invertible from '../../components/Invertible'
import TimeSince from '../../components/TimeSince'
import { translated } from '../../services/language'
import { useRxSubject } from '../../services/react'
import { format } from '../../utils/time'
import Converter from './Converter'
import Currency from './Currency'
import { getCurrencies, rxSelected } from './currency'

const textsCap = translated({
    name: 'name',
    price: 'daily reference rate',
    status: 'status',
    ticker: 'ticker',
    updated: 'updated',
}, true)[1]

export default () => {
    const [data] = useRxSubject(rxSelected, async (selectedISO) => {
        const arr = await getCurrencies()
        const data = arr.map(currency => {
            const { ISO, nameInLanguage, priceUpdatedAt: ts } = currency
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
                                <TimeSince {...{
                                    El: 'span',
                                    date: ts,
                                }} />
                            </div>
                        ),
                        El: Popup,
                        eventsEnabled: false,
                        on: ['click', 'focus', 'hover'],
                        size: 'mini',
                        trigger: icon,
                    }} />
                )
            const _priceEl = (
                <Currency {...{
                    title: null,
                    unit: ISO,
                    unitDisplayed: selectedISO,
                    value: 1, // display the price of one unit
                }} />
            )
            return {
                ...currency,
                _priceEl,
                _statusIndicator,
                _statusName: statusCode + nameInLanguage,
            }
        })

        return data
    })


    const tableProps = {
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
                key: 'nameInLanguage',
                title: textsCap.name,
            },
            {
                key: 'ISO',
                textAlign: 'center',
                title: textsCap.ticker,
            },
            {
                collapsing: true,
                key: '_priceEl',
                textAlign: 'center',
                title: textsCap.price,
            }
        ],
        topLeftMenu: [
            <Converter key='c' style={{ maxWidth: 470}}></Converter>
        ],
    }
    return <DataTable {...{ ...tableProps, data } } />
}