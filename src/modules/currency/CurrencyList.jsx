import React from 'react'
import { Button, Icon, Popup } from 'semantic-ui-react'
import DataTable from '../../components/DataTable'
import Invertible from '../../components/Invertible'
import TimeSince from '../../components/TimeSince'
import SettingsForm, { inputNames as settingsInputNames } from '../../forms/Settings'
import { translated } from '../../services/language'
import { showForm } from '../../services/modal'
import { useRxSubject } from '../../services/react'
import { format } from '../../utils/time'
import Currency from './Currency'
import { getCurrencies, rxSelected } from './currency'

const textsCap = translated({
    name: 'name',
    price: 'price',
    status: 'status',
    ticker: 'ticker',
    updated: 'updated',
}, true)[1]

export default () => {
    const [data] = useRxSubject(rxSelected, async (selectedISO) => {
        const arr = await getCurrencies()
        const data = arr.map(currency => {
            const { ISO, priceUpdatedAt: ts } = currency
            // checks if price has been updated within 24 hours
            const isActive = (new Date() - new Date(ts)) <= 86400000
            const _status = !ts
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
                        color: statusColors[_status - 1],
                        name: 'circle',
                    }} />
                </div>
            )
            const _statusIndicator = _status === 3
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
            return { ...currency, _priceEl, _status, _statusIndicator }
        })

        return data
    })


    const tableProps = {
        defaultSort: '_status',
        defaultSortAsc: true,
        columns: [
            {
                collapsing: true,
                content: ({_statusIndicator}) => _statusIndicator,
                key: '_status',
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
                title: (
                    <span>
                        {textsCap.price}
                        <Button {...{
                            circular: true,
                            className: 'no-margin',
                            icon: 'pencil',
                            size: 'mini',
                            onClick: e => {
                                // e.preventDefault()
                                e.stopPropagation()
                                showForm(SettingsForm, {
                                    header: null,
                                    // hide all inputs except the currency dropdown
                                    inputsHidden: Object.values(settingsInputNames)
                                        .filter(x => x !== settingsInputNames.currency),
                                    size: 'mini',
                                })
                            },
                        }} />
                    </span>
                ),
            }
        ],
    }
    return <DataTable {...{ ...tableProps, data } } />
}