import React from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import { arrReverse, deferred, isDefined, isFn } from '../../utils/utils'
import FormBuilder, { findInput } from '../../components/FormBuilder'
import FormInput from '../../components/FormInput'
import { translated } from '../../services/language'
import { iUseReducer, useRxSubject } from '../../services/react'
import { setToast } from '../../services/toast'
import { MOBILE, rxLayout } from '../../services/window'
import { convertTo, getCurrencies } from '../currency/currency'

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
        rxAmountFrom = new BehaviorSubject(),
        rxAmountTo = new BehaviorSubject(),
        rxAssetFrom = new BehaviorSubject(),
        rxAssetTo = new BehaviorSubject(),
        submitText
    } = props
    labels = {
        asset: textsCap.assetLabel,
        amountFrom: textsCap.amountFromLabel,
        amountTo: textsCap.amountToLabel,
        ...labels,
    }
    const [isMobile] = useRxSubject(rxLayout, l => l === MOBILE)
    const [state] = iUseReducer(null, () => {
        // rxAmountTo = rxAmountTo || new BehaviorSubject()
        const rxValues = new BehaviorSubject({})
        const updateAmountTo = async () => {
            try {
                const values = rxValues.value
                const amountFrom = rxAmountFrom.value //values[inputNames.amountFrom]
                const assetFrom = rxAssetFrom.value// values[inputNames.asset]
                const assetTo = rxAssetTo.value// values[inputNames.assetTo]
                const date = rxDate.value// values[inputNames.date]
                // conversion no required
                if (!assetFrom || !assetTo || !amountFrom) return
                const [_, amountConverted] = await convertTo(
                    amountFrom,
                    assetFrom,
                    assetTo,
                    null,
                    date,
                )
                rxAmountTo.value !== amountConverted &&  rxAmountTo.next(amountConverted)
            } catch (err) {
                rxAmountTo.next('')
                setToast({
                    content: `${err}`.replace('Error: ', ''),
                    status: 'error',
                }, 5000, 'AssetConverterForm')
            }
        }
        const state = {
            El: 'div',
            submitText: isDefined(submitText) && submitText || null,
            onChange: deferred((e, values, invalid) => {
                const { onChange } = props
                isFn(onChange) && onChange(e, values, invalid)
                updateAmountTo()
                rxValues.next(values)
            }, 500),
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
                    inputs: [
                        {
                            content: (
                                <FormInput {...{
                                    label: labels.asset,
                                    lazyLoad: true,
                                    name: inputNames.asset,
                                    options: [],
                                    placeholder: textsCap.assetPlaceholder,
                                    rxOptions: rxCurrencyOptions,
                                    rxValue: rxAssetFrom,
                                    search: [
                                        'text',
                                        'description',
                                        'value',
                                    ],
                                    selection: true,
                                    // improves performance by reducing number of onChange trigger
                                    selectOnNavigation: false,
                                    style: { maxHeight: 38 },
                                    type: 'dropdown',
                                    // value: (rxAmountFrom || {}).value,
                                }} />
                            ),
                            name: inputNames.asset,
                            rxValue: rxAssetFrom,
                            type: 'html',
                        },
                        {
                            label: labels.amountFrom,
                            name: inputNames.amountFrom,
                            min: 0,
                            placeholder: textsCap.amountFromPlaceholder,
                            rxValue: rxAmountFrom,
                            style: { minWidth: 135 },
                            type: 'number',
                        },
                        {
                            label: labels.amountTo,
                            name: inputNames.amountTo,
                            readOnly: true,
                            rxValue: rxAmountTo,
                            style: { minWidth: 170 },
                            type: 'text',
                        },
                    ]
                },
            ],
        }
 
        const groupIn = findInput(state.inputs, inputNames.group)
        groupIn.inputs = arrReverse(
            groupIn.inputs,
            !isMobile && reverseInputs,
        )
        
        // set currency dropdown options
        !rxCurrencyOptions.value.length && getCurrencies()
            .then(currencies => {
                const options = currencies.map(({ currency, name, _id }) => ({
                    description: currency,
                    text: name,
                    value: _id,
                }))
                rxCurrencyOptions.next(options)
            })

        return state
    })
    
    return <FormBuilder {...{ ...props, ...state }} />
}
AssetConverterForm.propTypes = {
    rxAmount: PropTypes.instanceOf(BehaviorSubject),
    rxDate: PropTypes.instanceOf(BehaviorSubject),
}