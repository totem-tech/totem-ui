import { Subject } from 'rxjs'
import { generateHash, arrSort } from '../utils/utils'
import client from './chatClient'
import storage from './storage'
import { useState, useEffect } from 'react'

const MODULE_KEY = 'currency'
// read or write to currency settings storage
const rw = value => storage.settings.module(MODULE_KEY, value) || {}
// read or write to cache storage
const rwCache = (key, value) => storage.cache(MODULE_KEY, key, value) || {}
let lastUpdated = null
const updateFrequencyMs = 24 * 60 * 60 * 1000

// default currency
export const currencyDefault = 'XTX'
// RxJS Subject to keep track of selected currencly changes
export const rxSelected = new Subject()

// convert currency 
//
// Params:
// @amount  number: amount to convert
// @from    string: currency ticker to convert from
// @to      string: currency ticker to convert to
//
// retuns   number
export const convertTo = async (amount, from, to) => await client.currencyConvert.promise(from, to, amount)

// get selected currency code
export function getSelected() {
    return rw().selected || currencyDefault
}

// get list of currencies 
export const getCurrencies = async () => await updateCurrencies() || rwCache().currencies

// get/set default currency
//
// Params:
// @ISO   string: currency code
export const setSelected = async (ISO) => {
    const currencies = await getCurrencies()
    const exists = currencies.find(x => x.ISO === ISO)
    const newValue = exists ? { selected: ISO } : undefined
    newValue && rxSelected.next(ISO)
    return rw(newValue).selected || currencyDefault
}

export const updateCurrencies = async () => {
    if (lastUpdated && new Date() - lastUpdated < updateFrequencyMs) return
    try {
        const sortedArr = rwCache().currencies
        const hash = generateHash(sortedArr)
        const currencies = await client.currencyList.promise(hash)
        if (currencies.length === 0) return
        currencies.forEach(x => {
            x.nameInLanguage = x.nameInLanguage || x.currency
            x.ISO = x.ISO || x.currency
        })
        rwCache('currencies', arrSort(currencies, 'ISO'))
        lastUpdated = new Date()
        console.log({ currencies })
        return currencies
    } catch (err) {
        console.error('Failed to retrieve currencies', err)
    }
}

/**
 * @name useSelected
 * @summary custom React hook to get/set the latest selected currency
 */
export const useSelected = () => {
    const [selected] = useState(getSelected())

    useEffect(() => {
        const subscribed = rxSelected.subscribe(value => setSelected(value))
        return () => subscribed.unsubscribe
    }, [])

    return [selected, setSelected]
}