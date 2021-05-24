import React from 'react'
import { iUseReducer } from '../../services/react'
import { deferred } from '../../utils/utils'
import CurrencyList from "../currency/CurrencyList"
import AssetForm from './AssetsForm'

export default function AssetFormView(props) {
    const [state, setState] = iUseReducer(null, rxSetState => ({
        date: undefined,
        keywords: '',
        showList: false,
        handleChange: deferred((_, values) => rxSetState.next(values), 200),
    }))
    return (
        <div>

            <AssetForm {...{
                onChange: state.handleChange,
            }} />
            {state.showList && (
                <CurrencyList {...{
                    date: state.date,
                    keywords: state.keywords,
                    // hide search field as it will be manually handled
                    searchable: false,
                    // hide the default converter
                    topLeftMenu: [],
                }} />
            )}
        </div>
    )
}