import React from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import { deferred, isDefined, isFn } from '../../utils/utils'
import FormBuilder from '../../components/FormBuilder'
import { iUseReducer } from '../../services/react'
import { translated } from '../../services/language'
import { convertTo, currencyDefault, getCurrencies } from '../currency/currency'
import client from '../chat/ChatClient'
import { setToast } from '../../services/toast'

const textsCap = translated({
    assetLabel: 'asset',
    assetPlaceholder: 'select an asset',
    amountFromLabel: 'quantity',
    amountFromPlaceholder: 'enter quantity',
    amountToLabel: 'Value in Functional Currency',
}, true)[1]
const inputNames = {
    asset: 'asset',
    amountFrom: 'amount',
    amountTo: 'amountTo',
    group: 'group',
}
const datesCache = new Map()
const rxCurrencyOptions = new BehaviorSubject([])

export default function AssetConverterForm(props) {
    const { rxDate, submitText } = props
    const [state] = iUseReducer(null, () => {
        const rxAmountTo = new BehaviorSubject()
        const rxValues = new BehaviorSubject({})
        const handleAmountFromChange = deferred(async () => {
            try {
                const amountFrom = rxValues.value[inputNames.amountFrom]
                const assetFrom = rxValues.value[inputNames.asset]
                const assetTo = currencyDefault
                let roeFrom, roeTo
                // conversion no required
                if (!assetFrom || !assetTo || !amountFrom) return

                if (rxDate.value && assetFrom !== assetTo) {
                    const result = await client.currencyPricesByDate.promise(rxDate.value, [assetFrom, assetTo])
                    result.forEach(({ currencyId, ratioOfExchange }) => {
                        roeFrom = currencyId === assetFrom
                            ? ratioOfExchange
                            : roeFrom
                        roeTo = currencyId === assetTo
                            ? ratioOfExchange
                            : roeTo
                    })
                }
                const [_, amountConverted] = await convertTo(
                    amountFrom,
                    assetFrom,
                    assetTo,
                    undefined,
                    roeFrom,
                    roeTo,
                )
                rxAmountTo.next(amountConverted)
            } catch (err) {
                setToast({
                    content: `${err}`,
                    status: 'error',
                }, 5000, 'AssetConverterForm')
            }
        }, 300)
        const state = {
            submitText: isDefined(submitText) && submitText || null,
            onChange: (e, values, invalid) => {
                const { onChange } = props
                isFn(onChange) && onChange(e, values, invalid)
                rxValues.next(values)
            },
            inputs: [
                {
                    inline: true,
                    name: inputNames.group,
                    type: 'group',
                    // widths: 'equal',
                    style: { margin: '0 -10px'},
                    inputs: [
                        {
                            label: textsCap.assetLabel,
                            name: inputNames.asset,
                            options: [],
                            placeholder: textsCap.assetPlaceholder,
                            rxOptions: rxCurrencyOptions,
                            search: [ 'text', 'description'],
                            selection: true,
                            style: { maxHeight: 36},
                            styleContainer: {
                                minWidth: 210,
                                // marginTop: '0.8em'
                            },
                            type: 'dropdown',
                        },
                        {
                            label: textsCap.amountFromLabel,
                            name: inputNames.amountFrom,
                            min: 0,
                            placeholder: textsCap.amountFromPlaceholder,
                            onChange: handleAmountFromChange,
                            type: 'number',
                        },
                        {
                            label: textsCap.amountToLabel,
                            name: inputNames.amountTo,
                            readOnly: true,
                            rxValue: rxAmountTo,
                            type: 'text',
                        },
                    ]
                },
            ],
        }
        // set currency dropdown options
        !rxCurrencyOptions.value.length && getCurrencies()
            .then(currencies => {
                const options = currencies.map(({ currency, name, ticker, type }) => ({
                    description: currency,
                    text: name,
                    value: currency,
                }))
                rxCurrencyOptions.next(options)
            })

        return state
    })

    return <FormBuilder {...{...props, ...state }} />
}
AssetConverterForm.propTypes = {
    rxDate: PropTypes.instanceOf(BehaviorSubject),
}