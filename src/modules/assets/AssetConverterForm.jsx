import React from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import { arrReverse, deferred, isDefined, isFn } from '../../utils/utils'
import FormBuilder, { findInput } from '../../components/FormBuilder'
import { iUseReducer } from '../../services/react'
import { translated } from '../../services/language'
import { convertTo, getCurrencies } from '../currency/currency'
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
    date: 'date',
    group: 'group',
}
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
                const assetTo = values[inputNames.assetTo]
                const date = values[inputNames.date]
                // conversion no required
                if (!assetFrom || !assetTo || !amountFrom) return
                const [_, amountConverted] = await convertTo(
                    amountFrom,
                    assetFrom,
                    assetTo,
                    null,
                    date,
                )
                rxAmountTo.next(amountConverted)
            } catch (err) {
                rxAmountTo.next('')
                setToast({
                    content: `${err}`.replace('Error: ', ''),
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
                    hidden: true,
                    name: inputNames.date,
                    rxValue: rxDate,
                    type: 'hidden',
                },
                {
                    hidden: true,
                    name: inputNames.assetTo,
                    rxValue: rxAssetTo,
                    type: 'hidden',
                },
                {
                    inline: true,
                    // grouped: true,
                    name: inputNames.group,
                    type: 'group',
                    // widths: 'equal',
                    style: { margin: '0 -10px' },
                    unstackable: true,
                    inputs: arrReverse([
                        {
                            label: labels.asset,
                            name: inputNames.asset,
                            options: [],
                            placeholder: textsCap.assetPlaceholder,
                            rxOptions: rxCurrencyOptions,
                            rxValue: rxAssetFrom,
                            search: [ 'text', 'description', 'value'],
                            selection: true,
                            style: {
                                maxHeight: 38,
                                // marginTop: 3,
                            },
                            styleContainer: {
                                // minWidth: 210,
                                // marginTop: '0.8em'
                            },
                            type: 'dropdown',
                            value: (rxAmountFrom || {}).value
                        },
                        {
                            containerProps: {
                                className: 'six wide tablet'
                            },
                            label: labels.amountFrom,
                            name: inputNames.amountFrom,
                            min: 0,
                            placeholder: textsCap.amountFromPlaceholder,
                            rxValue: rxAmountFrom,
                            type: 'number',
                        },
                        {
                            containerProps: {
                                className: 'six wide tablet'
                            },
                            label: labels.amountTo,
                            name: inputNames.amountTo,
                            readOnly: true,
                            rxValue: rxAmountTo,
                            type: 'text',
                        },
                    ], reverseInputs),
                },
            ],
        }
        
        // set currency dropdown options
        !rxCurrencyOptions.value.length && getCurrencies()
            .then(currencies => {
                const options = currencies.map(({ currency, name }) => ({
                    description: currency,
                    text: name,
                    value: currency,
                }))
                rxCurrencyOptions.next(options)
                window.rxCurrencyOptions = rxCurrencyOptions
            })

        return state
    })

    return <FormBuilder {...{ ...props, ...state }} />
}
AssetConverterForm.propTypes = {
    rxAmount: PropTypes.instanceOf(BehaviorSubject),
    rxDate: PropTypes.instanceOf(BehaviorSubject),
}