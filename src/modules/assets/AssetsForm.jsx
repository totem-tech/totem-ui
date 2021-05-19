import React, { useEffect, useState } from 'react'
import { BehaviorSubject } from 'rxjs'
import { isFn } from '../../utils/utils'
import FormBuilder, { findInput } from "../../components/FormBuilder"
import { randomHex } from '../../services/blockchain'
import { translated } from '../../services/language'
import { iUseReducer, useRxSubject } from "../../services/react"
import AssetConverterForm from './AssetConverterForm'
import { rxSelected } from '../identity/identity'
import { Button } from 'semantic-ui-react'
import { MOBILE, rxLayout } from '../../services/window'

const textsCap = translated({
    searchAssets: 'search assets',
    tableHide: 'Hide Rates Table',
    tableShow: 'Show Rates Table',
    btnSubtract: 'subtract all',
    btnAdd: 'add all to folio',
    totalValueOfAssets: 'Total Value of Assets'
}, true)[1]
export const inputNames = {
    amount: 'amount',
    amountFE: 'amountFE',
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
}

const rxPortfolioInputs = new BehaviorSubject([])
const rxShowList = new BehaviorSubject(false)
const rxDate = new BehaviorSubject()
function newPortfolioGroup(onChange, isMobile) {
    const lineId = randomHex(rxSelected.value)


    return {
        content: (
            <div
                style={{
                    display: 'block',
                    width: '100%',
                }}
            >
                <AssetConverterForm {...{
                    El: 'div',
                    key: lineId,
                    onChange,
                    style: {
                        display: 'inline-block',
                        width: isMobile ? '100%': '80% ',
                    },
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
                            newPortfolioGroup(onChange, isMobile)
                        ]),
                        style: isMobile
                            ? {}
                            : {
                                position: 'absolute',
                                top: 10,
                                left: 10,
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
const removePortfolioGroup = lineId => {
    
}
export default function AssetForm(props) {
    const [portfolioInputs] = useRxSubject(rxPortfolioInputs)
    const [isMobile] = useRxSubject(rxLayout, l => l === MOBILE)
    const [state] = iUseReducer(null, rxSetState => {
        const isMobile = ({layout}) => layout === MOBILE
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
        return {
            vales: {},
            handleFolioChange: (lineId, values) => {
                const s = {}
                s[lineId] = values
                rxSetState.next(s)
            },
            onChange: (e, values, invalid) => {
                const { onChange } = props
                rxSetState.next({ values })
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
                        {
                            hidden: isMobile,
                            name: 'empty1',
                            type: 'html',
                            width: 4,
                        },
                        {
                            hidden: isMobile,
                            name: 'empty2',
                            type: 'html',
                            width: 4,
                        },
                        {
                            ...searchInput,
                            hidden: isMobile,
                            width: 4,
                        },
                        // {
                        //     name: inputNames.keywords,
                        //     // forces table to be visible on search change
                        //     onChange: () => rxShowList.next(true),
                        //     placeholder: textsCap.searchAssets,
                        //     type: 'search',
                        //     width: 4,
                        // },
                    ]
                },
                {
                    grouped: true,
                    name: inputNames.groupPortfolio,
                    inputs: [],
                    type: 'group',
                },
                {
                    name: inputNames.groupTotalValue,
                    type: 'group',
                    inputs: [
                        {
                            content: (
                                <h1 style={{ paddingLeft: 10, fontWeight: 400 }}>
                                    {textsCap.totalValueOfAssets}
                                </h1>
                            ),
                            name: inputNames.htmlTotalValue,
                            type: 'html',
                        }
                    ],
                },
                {
                    name: inputNames.groupButtons,
                    type: 'group',
                    inputs: [
                        {
                            ...listToggle,
                            hidden: isMobile,
                        },
                        {
                            hidden: isMobile,
                            name: inputNames.showList,
                            rxValue: rxShowList,
                            type: 'hidden',
                        },
                        {
                            content: textsCap.btnSubtract,
                            disabled: true,
                            fluid: true,
                            name: inputNames.btnSubtract,
                            negative: true,
                            type: 'button',
                        },
                        {
                            content: textsCap.btnAdd,
                            disabled: true,
                            fluid: true,
                            name: inputNames.btnAdd,
                            positive: true,
                            type: 'button',
                        },
                    ],
                },
                {
                    ...listToggle,
                    hidden: v => !isMobile(v),
                    style: { marginTop: 10 },
                },
                {
                    ...searchInput,
                    hidden: v => !isMobile(v),
                },
            ],
        }
    })

    useEffect(() => {
        if (!rxPortfolioInputs.value.length) {
            rxPortfolioInputs.next([newPortfolioGroup(state.handleFolioChange, isMobile)])
        }
    })
    if (state.inputs) {
        const input = findInput(state.inputs, inputNames.groupPortfolio)
        input.inputs = portfolioInputs
    }
    return (
        <FormBuilder {...{
            ...props,
            ...state,
            submitText: null,
        }} />
    )
}