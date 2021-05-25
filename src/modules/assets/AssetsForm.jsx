import React, { useEffect, useState } from 'react'
import { BehaviorSubject } from 'rxjs'
import { Button, Divider } from 'semantic-ui-react'
import { isFn, objWithoutKeys } from '../../utils/utils'
import FormBuilder, { findInput } from "../../components/FormBuilder"
import { randomHex } from '../../services/blockchain'
import { translated } from '../../services/language'
import { unsubscribe, useRxSubject } from "../../services/react"
import { setToast } from '../../services/toast'
import { rxSelected } from '../currency/currency'
import AssetConverterForm from './AssetConverterForm'

const textsCap = translated({
    addAsset: 'add asset',
    btnSubtract: 'subtract all',
    btnAdd: 'add all to folio',
    labelFE: 'Selection Functional Currency',
    removeAsset: 'remove asset',
    searchAssets: 'search assets',
    tableHide: 'Hide Rates Table',
    tableShow: 'Show Rates Table',
    totalValueOfAssets: 'Total Value of Assets'
}, true)[1]
export const inputNames = {
    amount: 'amount',
    amountTotal: 'amountTotal',
    date: 'date',
    currencyId: 'currencyId',
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
const rxPortfolioValues = new BehaviorSubject({})
const rxAmountFrom = new BehaviorSubject('')
const rxAssetFrom = new BehaviorSubject('')
const lineIdPrefix = 'lineId-'

export default function AssetsForm(props) {
    const [portfolioInputs] = useRxSubject(rxPortfolioInputs)
    const [state] = useState(() => {
        const notImplemented = () => setToast('Feature not implemented yet!', 2000, 'not-implemented')
        const searchInput = {
            name: inputNames.keywords,
            // forces table to be visible on search change
            onChange: () => rxShowList.next(true),
            placeholder: textsCap.searchAssets,
            type: 'search',
        }
        const listToggle = {
            content: () => rxShowList.value
                ? textsCap.tableHide
                : textsCap.tableShow,
            name: inputNames.btnListToggle,
            onClick: () => rxShowList.next(!rxShowList.value),
            type: 'button',
        }
        const getEmptyField = () => ({
            name: 'empty-'+ randomHex(),
            type: 'hidden',
            width: 4,
        })
        let formValues = {}
        return {
            formProps: { className: 'assets-form' },
            submitText: null,
            onChange: (e, values, invalid) => {
                const { onChange } = props
                formValues = values
                isFn(onChange) && onChange(e, values, invalid)
            },
            inputs: [
                {
                    name: inputNames.groupDateSearch,
                    type: 'group',
                    inputs: [
                        {
                            name: inputNames.date,
                            onChange: () => rxShowList.next(true),
                            onReset: () => {
                                const { onChange } = props
                                if (!isFn(onChange)) return
                                formValues[inputNames.date] = undefined
                                onChange({}, formValues)
                            },
                            rxValue: rxDate,
                            type: 'date',
                            // only accept a date between 1999-01-01 and today
                            validate: (_, { value }) => {
                                if (!value) return
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
                            className: 'hide-on-mobile',
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
                    // inline: true,
                    name: inputNames.groupTotalValue,
                    type: 'group',
                    inputs: [
                        {
                            content: (
                                <h1 className='total-assets'>
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
                                    formProps: { className: 'total-form' },
                                    labels: { asset: textsCap.labelFE },
                                    inputsHidden: ['amountFrom'],
                                    rxDate,
                                    // rxAmountFrom,
                                    rxAmountTo: rxAmountFrom,
                                    rxAssetFrom,
                                    rxAssetTo: rxAssetFrom,
                                    reverseInputs: true,
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
                            hidden: true,
                            name: inputNames.currencyId,
                            rxValue: rxAssetFrom,
                            type: 'hidden',
                        },
                        {
                            ...listToggle,
                            className: 'hide-on-mobile',
                        },
                        {
                            className: 'hide-on-mobile',
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
                    className: 'hide-on-desktop',
                    style: { marginTop: 10 },
                },
                {
                    ...searchInput,
                    className: 'hide-on-desktop',
                },
            ],
        }
    })

    useEffect(() => {
        let mounted = true
        // update total amount automatically
        const subscriptions = {}
        subscriptions.inputs = rxPortfolioValues.subscribe(values => {
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
            rxPortfolioInputs.next(
                processLines(
                    [newPortfolioGroup()]
                )
            )
        }

        // set default functional currency 
        !rxAssetFrom.value && rxAssetFrom.next(rxSelected.value)

        return () => {
            mounted = false
            unsubscribe(subscriptions)
        }
    })

    if (state.inputs) {
        const input = findInput(state.inputs, inputNames.groupPortfolio)
        input.inputs = portfolioInputs
    }
    return <FormBuilder {...{ ...props, ...state }} />
}

const getGroupName = lineId => `group-${lineIdPrefix}-${lineId}`
const processLines = (portFolioInuts, removeLineId) => {
    const inputs = !removeLineId
        ? portFolioInuts
        : portFolioInuts.filter(({ name }) =>
            name !== getGroupName(removeLineId)
        )    
    return inputs
}
function newPortfolioGroup() {
    const lineId = randomHex(rxSelected.value)
    const valueKey = lineIdPrefix + lineId
    const inputForm = {
        name: lineId,
        type: 'html',
        width: 16,
        content: (
            <div className='portfolio'>
                <AssetConverterForm {...{
                    El: 'div',
                    key: lineId,
                    onChange: (_, values) => {
                        const { value: allValues } = rxPortfolioValues
                        allValues[valueKey] = values
                        rxPortfolioValues.next({ ...allValues })
                    },
                    rxAssetTo: rxAssetFrom,
                    rxDate,
                }} />
            </div>
        ),
    }
    return {
        className: 'portfolio-line',
        name: getGroupName(lineId),
        type: 'group',
        style: { margin: '0 -.5em 0' },
        inputs: [
            {
                ...inputForm,
                width: 12,
            },
            {
                name: `btnAdd-${lineId}-remove`,
                type: 'html',
                width: 2,
                content: (
                    <div className='action remove-asset'>
                        <Button {...{
                            as: 'div',
                            circular: true,
                            className: 'no-margin',
                            content: <span>{textsCap.removeAsset}</span>,
                            icon: 'minus',
                            negative: true,
                            onClick: () => {
                                // ignore if only one line left
                                if (rxPortfolioInputs.value.length <= 1) return
                                // remove from inputs list
                                rxPortfolioInputs.next(
                                    processLines(rxPortfolioInputs.value, lineId)
                                )
                                // remove from values
                                rxPortfolioValues.next(
                                    objWithoutKeys(rxPortfolioValues.value, valueKey)
                                )
                            },
                        }} />
                        <Divider />
                    </div>
                )
            },
            {
                name: `btnAdd-${lineId}-add`,
                type: 'html',
                width: 2,
                content: (
                    <div className='action add-asset'>
                        <Button {...{
                            as: 'div',
                            circular: true,
                            content: <span>{textsCap.addAsset}</span>,
                            icon: 'plus',
                            positive: true,
                            onClick: () => rxPortfolioInputs.next(
                                processLines([
                                    ...rxPortfolioInputs.value,
                                    // add new line item
                                    newPortfolioGroup()
                                ])
                            ),
                        }} />
                    </div>
                )
            },
        ]
    }
}