import React from 'react'
import { BehaviorSubject } from 'rxjs'
import FormBuilder from "../../components/FormBuilder"
import { translated } from '../../services/language'
import { iUseReducer } from "../../services/react"
import { isFn } from '../../utils/utils'

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
    showList: 'showList',
}
export default function AssetForm(props) {
    const [state] = iUseReducer(null, rxSetState => {
        const rxShowList = new BehaviorSubject(false)
        const state = {
            onChange: (...args) => {
                const { onChange } = props
                isFn(onChange) && onChange(...args)
            },
            inputs: [
                {
                    name: inputNames.groupDateSearch,
                    type: 'group',
                    inputs: [
                        {
                            name: inputNames.date,
                            type: 'date',
                            with: 4
                        },
                        {
                            name: 'empty1',
                            type: 'html',
                            width: 4,
                        },
                        {
                            name: 'empty2',
                            type: 'html',
                            width: 4,
                        },
                        {
                            name: inputNames.keywords,
                            // forces table to be visible on search change
                            onChange: () => rxShowList.next(true),
                            placeholder: textsCap.searchAssets,
                            type: 'search',
                            width: 4,
                        },
                    ]
                },
                {
                    name: inputNames.groupPortfolio,
                    type: 'group',
                    inputs: [],
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
                            content: () => rxShowList.value ? textsCap.tableHide : textsCap.tableShow ,
                            name: inputNames.btnListToggle,
                            onClick: () => rxShowList.next(!rxShowList.value),
                            type: 'button',
                        },
                        {
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
            ],
        }

        return state
    })

    return (
        <FormBuilder {...{
            ...props,
            ...state,
            submitText: null,
        }} />
    )
}