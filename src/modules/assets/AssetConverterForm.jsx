import PropTypes from 'prop-types'
import React from 'react'
import { BehaviorSubject } from 'rxjs'
import FormBuilder, { findInput } from '../../components/FormBuilder'
import { setToast } from '../../services/toast'
import { translated } from '../../utils/languageHelper'
import { iUseReducer, useRxSubject } from '../../utils/reactjs'
import {
    arrReverse,
    deferred,
    isDefined,
    isFn
} from '../../utils/utils'
import { MOBILE, rxLayout } from '../../utils/window'
import { convertTo } from '../currency/currency'
import { asInput } from '../currency/CurrencyDropdown'

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
                rxAmountTo.value !== amountConverted && rxAmountTo.next(amountConverted)
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
                            ...asInput({
                                autoHideName: true,
                                label: labels.asset,
                                lazyLoad: true,
                                name: inputNames.asset,
                                options: [],
                                placeholder: textsCap.assetPlaceholder,
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
                            })
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

        return state
    })

    return <FormBuilder {...{ ...props, ...state }} />
}
AssetConverterForm.propTypes = {
    rxAmount: PropTypes.instanceOf(BehaviorSubject),
    rxDate: PropTypes.instanceOf(BehaviorSubject),
}