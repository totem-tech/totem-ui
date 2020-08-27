import { Subject } from 'rxjs'
import { generateHash, arrSort } from '../utils/utils'
import client from './chatClient'
import storage from './storage'
import { useState, useEffect } from 'react'
import PromisE from '../utils/PromisE'

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
export const getCurrencies = async () => {
    await updateCurrencies()
    return rwCache().currencies || []
}

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
    const { updatePromise } = updateCurrencies
    if (lastUpdated && new Date() - lastUpdated < updateFrequencyMs) return
    try {
        // prevents making multiple requests
        if (updatePromise) return await updatePromise

        const sortedArr = rwCache().currencies
        const hash = generateHash(sortedArr)
        const currencyPromise = client.currencyList.promise(hash)
        const handleCurrencies = async (currencies) => {
            if (currencies.length === 0) return
            currencies.forEach(x => {
                x.nameInLanguage = x.nameInLanguage || x.currency
                x.ISO = x.ISO || x.currency
            })
            rwCache('currencies', arrSort(currencies, 'ISO'))
            lastUpdated = new Date()
            console.log('Currency list updated', currencies)
        }
        currencyPromise.then(handleCurrencies)

        // for first time user wait as long at it takes otherwise, timeout and force use cached
        // cached list of currencies exists, timeout if list not loaded within 3 seconds
        updateCurrencies.updatePromise = !sortedArr ? currencyPromise : PromisE.timeout(currencyPromise, 3000)
        await updateCurrencies.updatePromise
    } catch (err) {
        console.error('Failed to retrieve currencies', err)
    }
}

/**
 * @name useSelected
 * @summary custom React hook to get/set the latest selected currency
 */
export const useSelected = () => {
    const [value, setValue] = useState(getSelected())

    useEffect(() => {
        let mounted = true
        const subscribed = rxSelected.subscribe(value => mounted && setValue(value))
        return () => {
            mounted = false
            subscribed.unsubscribe()
        }
    }, [])

    return [value, setSelected]
}