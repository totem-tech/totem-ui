import React from 'react'
import { iUseReducer } from '../../services/react'
import CurrencyList from "../currency/CurrencyList"
import AssetForm from './AssetsForm'


export default function AssetFormView(props) {
    const [values, setState] = iUseReducer(null,{
        date: undefined,
        keywords: '',
        showList: false,
    })
    return (
        <div>

            <AssetForm {...{
                onChange:(_, values) => setState(values),
            }} />
            {values.showList && (
                <CurrencyList {...{
                    date: values.date,
                    keywords: values.keywords,
                    // hide search field as it will be manually handled
                    searchable: false,
                    // hide the default converter
                    topLeftMenu: [],
                }} />
            )}
        </div>
    )
}