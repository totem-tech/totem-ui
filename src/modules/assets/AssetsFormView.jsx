import React from 'react'
import { BehaviorSubject } from 'rxjs'
import { iUseReducer } from '../../utils/reactHelper'
import CurrencyList from "../currency/CurrencyList"
import AssetsForm, { inputNames } from './AssetsForm'
import './style.css'

export default function AssetFormView() {
    const [state] = iUseReducer(null, rxSetState => {
        const rxCurrencyId = new BehaviorSubject()
        return {
            date: undefined,
            keywords: '',
            rxCurrencyId,
            showList: false,
            handleChange: (_, values) => {
                rxSetState.next({ ...values })
                const currencyId = values[inputNames.currencyId]
                if (!currencyId) return
                rxCurrencyId.next(currencyId)
            },
        }
    })
    const {
        date,
        handleChange,
        keywords,
        rxCurrencyId,
        showList,
    } = state
    
    return (
        <div>
            <AssetsForm {...{ onChange: handleChange }} />
            {showList && (
                <CurrencyList {...{
                    date,
                    keywords,
                    rxCurrencyId,
                    // hide search field as it will be manually handled
                    searchable: false,
                    // hide the default converter
                    topLeftMenu: [],
                }} />
            )}
        </div>
    )
}