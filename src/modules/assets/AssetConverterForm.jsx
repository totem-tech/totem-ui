import React from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import { arrReverse, deferred, isDefined, isFn } from '../../utils/utils'
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
    assetTo: 'assetTo',
    amountFrom: 'amountFrom',
    amountTo: 'amountTo',
    group: 'group',
}
const datesCache = new Map()
const rxCurrencyOptions = new BehaviorSubject([])

export default function AssetConverterForm(props) {
    let {
        labels,
        reverseInputs = false,
        rxDate,
        rxAmountFrom,
        rxAmountTo,
        rxAssetFrom,
        rxAssetTo,
        submitText
    } = props
    labels = {
        asset: textsCap.assetLabel,
        amountFrom: textsCap.amountFromLabel,
        amountTo: textsCap.amountToLabel,
        ...labels,
    }
    const [state] = iUseReducer(null, () => {
        rxAmountTo = rxAmountTo || new BehaviorSubject()
        const rxValues = new BehaviorSubject({})
        const updateAmountTo = async () => {
            try {
                const values = rxValues.value
                const amountFrom = values[inputNames.amountFrom]
                const assetFrom = values[inputNames.asset]
                const assetTo =  values[inputNames.assetTo]//rxAssetTo.value
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
        }
        const state = {
            submitText: isDefined(submitText) && submitText || null,
            onChange: deferred((e, values, invalid) => {
                const { onChange } = props
                isFn(onChange) && onChange(e, values, invalid)
                updateAmountTo()
                rxValues.next(values)
            }, 200),
            inputs: [
                {
                    inline: true,
                    name: inputNames.group,
                    type: 'group',
                    // widths: 'equal',
                    style: { margin: '0 -10px'},
                    inputs: [
                        {
                            label: labels.asset,
                            name: inputNames.asset,
                            options: [],
                            placeholder: textsCap.assetPlaceholder,
                            rxOptions: rxCurrencyOptions,
                            rxValue: rxAssetFrom,
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
                            label: labels.amountFrom,
                            name: inputNames.amountFrom,
                            min: 0,
                            placeholder: textsCap.amountFromPlaceholder,
                            rxValue: rxAmountFrom,
                            type: 'number',
                        },
                        {
                            label: labels.amountTo,
                            name: inputNames.amountTo,
                            readOnly: true,
                            rxValue: rxAmountTo,
                            type: 'text',
                        },
                    ],
                },
                {
                    name: inputNames.assetTo,
                    rxValue: rxAssetTo,
                    type: 'hidden',
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

    return <FormBuilder {...{
        ...props,
        ...state,
        inputs: reverseInputs
            ? arrReverse(state.inputs, true, true)
            : state.inputs,
    }} />
}
AssetConverterForm.propTypes = {
    rxAmount: PropTypes.instanceOf(BehaviorSubject),
    rxDate: PropTypes.instanceOf(BehaviorSubject),
}