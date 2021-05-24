import React, { useEffect, useState } from 'react'
import { BehaviorSubject } from 'rxjs'
import { isFn, isValidNumber, objWithoutKeys } from '../../utils/utils'
import FormBuilder, { findInput } from "../../components/FormBuilder"
import { randomHex } from '../../services/blockchain'
import { translated } from '../../services/language'
import { iUseReducer, unsubscribe, useRxSubject } from "../../services/react"
import AssetConverterForm from './AssetConverterForm'
import { rxSelected } from '../identity/identity'
import { Button } from 'semantic-ui-react'
import { MOBILE, rxLayout } from '../../services/window'
import { setToast } from '../../services/toast'
import { currencyDefault } from '../currency/currency'

const textsCap = translated({
    btnSubtract: 'subtract all',
    btnAdd: 'add all to folio',
    labelFE: 'Selection Functional Currency',
    searchAssets: 'search assets',
    tableHide: 'Hide Rates Table',
    tableShow: 'Show Rates Table',
    totalValueOfAssets: 'Total Value of Assets'
}, true)[1]
export const inputNames = {
    amount: 'amount',
    amountTotal: 'amountTotal',
    date: 'date',
    btnListToggle: 'btnListToggle',
    btnSubtract: 'btnSubtract',
    btnAdd: 'btnAdd',
    groupDateSearch: 'groupDateSearch',
    groupPortfolio: 'groupPortfolio',
    group3: 'group3',
    groupTotalValue: 'group4',
    groupButtons: 'groupButtons',
    htmlTotalValue: 'htmlTotalValue',
    keywords: 'keywords',
    portfolioIds: 'portfolioIds',
    showList: 'showList',
    total: 'total',
}

const rxPortfolioInputs = new BehaviorSubject([])
const rxShowList = new BehaviorSubject(false)
const rxDate = new BehaviorSubject()
const rxValues = new BehaviorSubject({})
const rxAmountFrom = new BehaviorSubject('')
const rxAssetFrom = new BehaviorSubject('')
const lineIdPrefix = 'lineId-'
function newPortfolioGroup(valuePrefix, isMobile) {
    const lineId = randomHex(rxSelected.value)
    return {
        content: (
            <div style={{ display: 'block', width: '100%' }}>
                <AssetConverterForm {...{
                    El: 'div',
                    key: lineId,
                    onChange: (_, values) => {
                        const { value: allValues } = rxValues
                        allValues[valuePrefix + lineId] = values
                        rxValues.next({...allValues})
                    },
                    style: {
                        display: 'inline-block',
                        width: isMobile ? '100%': '75%',
                    },
                    rxAssetTo: rxAssetFrom,
                    rxDate,
                }} />
                <div style={{ display: 'inline-block', position: 'relative' }}>
                    <Button {...{
                        as: 'div',
                        circular: !isMobile,
                        className: 'no-margin',
                        fluid: isMobile,
                        icon: 'plus',
                        name: `btnAdd-${lineId}`,
                        onClick: () => rxPortfolioInputs.next([
                            ...rxPortfolioInputs.value,
                            // add new line item
                            newPortfolioGroup(lineIdPrefix, isMobile)
                        ]),
                        positive: true,
                        style: isMobile
                            ? {}
                            : {
                                position: 'absolute',
                                top: 10,
                                left: 10,
                            },
                        type: 'button',
                    }} />
                    <Button {...{
                        as: 'div',
                        circular: !isMobile,
                        className: 'no-margin',
                        fluid: isMobile,
                        icon: 'minus',
                        name: `btnAdd-${lineId}`,
                        negative: true,
                        onClick: () => {
                            // ignore if only one line left
                            if (rxPortfolioInputs.value.length <= 1) return
                            // remove from inputs list
                            rxPortfolioInputs.next(
                                rxPortfolioInputs.value.filter(({ name }) => name !== lineId)
                            )
                            // remove from values
                            rxValues.next(
                                objWithoutKeys(rxValues.value, lineIdPrefix + lineId)
                            )
                        },
                        style: isMobile
                            ? {}
                            : {
                                position: 'absolute',
                                top: 10,
                                left: 50,
                            },
                        type: 'button',
                    }} />
                </div>
            </div>
        ),
        name: lineId,
        type: 'html',
        width: 16,
    }
}
export default function AssetForm(props) {
    const [portfolioInputs] = useRxSubject(rxPortfolioInputs)
    const [state] = useState(() => {
        const checkIfMobile = ({ layout }) => layout === MOBILE
        const notImplemented = () => setToast('Feature not implemented yet!', 2000, 'not-implemented')
        const searchInput = {
            name: inputNames.keywords,
            // forces table to be visible on search change
            onChange: () => rxShowList.next(true),
            placeholder: textsCap.searchAssets,
            type: 'search',
        }
        const listToggle = {
            content: () => rxShowList.value ? textsCap.tableHide : textsCap.tableShow,
            name: inputNames.btnListToggle,
            onClick: () => rxShowList.next(!rxShowList.value),
            type: 'button',
        }
        const getEmptyField = () => ({
            name: 'empty-'+ randomHex(),
            type: 'hidden',
            width: 4,
        })
        return {
            submitText: null,
            onChange: (e, values, invalid) => {
                const { onChange } = props
                isFn(onChange) && onChange(e, values, invalid)
            },
            inputs: [
                {
                    name: 'layout',
                    rxValue: rxLayout,
                    type: 'hidden',
                },
                {
                    name: inputNames.groupDateSearch,
                    type: 'group',
                    inputs: [
                        {
                            name: inputNames.date,
                            onChange: () => rxShowList.next(true),
                            rxValue: rxDate,
                            type: 'date',
                            // only accept a date between 1999-01-01 and today
                            validate: (_, { value }) => {
                                if (!value) return console.log('value', value)
                                const date = new Date(value)
                                const invalid = (date - new Date()) > 0 || value.substr(0, 4) < 1999
                                return invalid
                            },
                            width: 4,
                        },
                        getEmptyField(),
                        getEmptyField(),
                        {
                            ...searchInput,
                            hidden: checkIfMobile,
                            width: 4,
                        },
                    ]
                },
                {
                    grouped: true,
                    name: inputNames.groupPortfolio,
                    inputs: [],
                    type: 'group',
                },
                {
                    inline: true,
                    name: inputNames.groupTotalValue,
                    type: 'group',
                    widths: 'equal',
                    inputs: [
                        {
                            content: (
                                <h1 style={{ fontWeight: 400, fontSize: 25, paddingLeft: 10, width: '50%' }}>
                                    {textsCap.totalValueOfAssets}
                                </h1>
                            ),
                            name: inputNames.htmlTotalValue,
                            type: 'html',
                        },
                        {
                            content: (
                                <AssetConverterForm {...{
                                    El: 'div',
                                    labels: { asset: textsCap.labelFE },
                                    inputsHidden: ['amountFrom'],
                                    rxDate,
                                    // rxAmountFrom,
                                    rxAmountTo: rxAmountFrom,
                                    rxAssetFrom,
                                    rxAssetTo: rxAssetFrom,
                                    reverseInputs: true,
                                    style: {
                                        padding: '0 10px',
                                        width: '50%',
                                    },
                                }} />
                            ),
                            name: inputNames.total,
                            type: 'html',
                        }
                    ]
                },
                {
                    name: inputNames.groupButtons,
                    type: 'group',
                    inputs: [
                        {
                            ...listToggle,
                            hidden: checkIfMobile,
                        },
                        {
                            hidden: checkIfMobile,
                            name: inputNames.showList,
                            rxValue: rxShowList,
                            type: 'hidden',
                        },
                        {
                            content: textsCap.btnSubtract,
                            fluid: true,
                            name: inputNames.btnSubtract,
                            negative: true,
                            onClick: notImplemented,
                            type: 'button',
                        },
                        {
                            content: textsCap.btnAdd,
                            fluid: true,
                            name: inputNames.btnAdd,
                            onClick: notImplemented,
                            positive: true,
                            type: 'button',
                        },
                    ],
                },
                {
                    ...listToggle,
                    hidden: v => !checkIfMobile(v),
                    style: { marginTop: 10 },
                },
                {
                    ...searchInput,
                    hidden: v => !checkIfMobile(v),
                },
            ],
        }
    })

    useEffect(() => {
        let mounted = true
        // update total amount automatically
        const subscription = rxValues.subscribe(values => {
            if (!mounted) return
            const lineItems = Object.keys(values)
                .filter(name =>
                    `${name}`.startsWith(lineIdPrefix)
                    && !!values[name].amountTo
                )
                .map(key => values[key].amountTo)
            if (!lineItems.length) return

            const total = lineItems.reduce((sum, next) => sum + parseFloat(next), 0)        
            rxAmountFrom.next(`${total|| ''}`)
        })

        // add first asset line item
        if (!rxPortfolioInputs.value.length) {
            rxPortfolioInputs.next([
                newPortfolioGroup(
                    lineIdPrefix,
                    rxLayout.value === MOBILE,
                )
            ])
        }

        // set default functional currency 
        !rxAssetFrom.value && rxAssetFrom.next(currencyDefault)

        return () => {
            mounted = false
            unsubscribe({subscription})
        }
    })

    if (state.inputs) {
        const input = findInput(state.inputs, inputNames.groupPortfolio)
        input.inputs = portfolioInputs
    }
    return <FormBuilder {...{ ...props, ...state }} />
}