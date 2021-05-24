import React from 'react'
import { BehaviorSubject } from 'rxjs'
import { iUseReducer } from '../../services/react'
import { deferred } from '../../utils/utils'
import { rxSelected } from '../currency/currency'
import CurrencyList from "../currency/CurrencyList"
import AssetForm, { inputNames } from './AssetsForm'

export default function AssetFormView() {
    const [state] = iUseReducer(null, rxSetState => {
        const rxCurrencyId = new BehaviorSubject()
        return {
            date: undefined,
            keywords: '',
            rxCurrencyId,
            showList: false,
            handleChange: deferred((_, values) => {
                rxSetState.next(values)
                const currencyId = values[inputNames.currencyId]
                if (!currencyId) return
                rxCurrencyId.next(currencyId)
            }, 200),
        }
    })
    const { date, handleChange, keywords, rxCurrencyId, showList } = state
    return (
        <div>
            <AssetForm {...{ onChange: handleChange }} />
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