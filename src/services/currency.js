import { Bond } from 'oo7'
import { generateHash, isMap, arrSort } from '../utils/utils'
import client from './chatClient'
import storage from './storage'

const MODULE_KEY = 'currency'
// read or write to currency settings storage
const rw = value => storage.settings.module(MODULE_KEY, value) || {}
// read or write to cache storage
const rwCache = (key, value) => storage.cache(MODULE_KEY, key, value) || {}
let lastUpdated = null
const updateFrequencyMs = 24 * 60 * 60 * 1000

// selected currency bond
export const bond = new Bond()
// default currency
export const currencyDefault = 'XTX'

// convert currency 
//
// Params:
// @amount  number: amount to convert
// @from    string: currency ticker to convert from
// @to      string: currency ticker to convert to
//
// retuns   number
export const convertTo = async (amount, from, to) => {
    let convertedAmount, error
    await client.currencyConvert.promise(from, to, amount, (err, result) => {
        convertedAmount = result
        error = err
    })
    if (error) throw new Error(error)
    return convertedAmount
}

// get selected currency code
export const getSelected = () => rw().selected || currencyDefault
bond.changed(getSelected())

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
    newValue && setTimeout(() => bond.changed(ISO))
    return rw(newValue).selected || currencyDefault
}

export const updateCurrencies = async () => {
    if (lastUpdated && new Date() - lastUpdated < updateFrequencyMs) return

    const sortedTickers = rwCache().currencies
    const tickersHash = generateHash(sortedTickers)
    let currencies = null
    await client.currencyList.promise(tickersHash, ((err, currencies = []) => {
        err && console.error('Failed to retrieve currencies', err)
        if (currencies.size === 0) return
        currencies.forEach(x => {
            x.nameInLanguage = x.nameInLanguage || x.currency
            x.ISO = x.ISO || x.currency
        })
        rwCache('currencies', arrSort(currencies, 'ISO'))
        lastUpdated = new Date()
        console.log({ currencies })
    }))
    return currencies
}