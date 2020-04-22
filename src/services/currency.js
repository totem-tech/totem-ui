import { Bond } from 'oo7'
import { generateHash, isMap } from '../utils/utils'
import client from './chatClient'
import storage from './storage'

const MODULE_KEY = 'currency'
// read or write to currency settings storage
const rw = value => storage.settings.module(MODULE_KEY, value) || {}
// read or write to cache storage
const rwCache = value => storage.cache(MODULE_KEY, value) || {}
let lastUpdated = null
const updateFrequencyMs = 24 * 60 * 60 * 1000

// selected currency bond
export const bond = new Bond()
//  default currency
export const currencyDefault = 'XTX'

// convert currency 
//
// Params:
// @amount  number: amount to convert
// @from    string: currency ticker to convert from
// @to      string: currency ticker to convert to
//
// retuns   number
export const convertTo = async(amount, from, to) => {
    let convertedAmount, error
    await client.currencyConvert.promise(from, to, amount, (err, result) => {
        convertedAmount = result
        error = err
    })
    if (error) throw new Error(error)
    return convertedAmount
}

// get default currency
//
// Params:
// @value   string: currency code/ticker
export const getSelected = () => rw().selected || currencyDefault

// get list of currency tickers
//
// Returns  object: key => ticker, value => currency name, if available, or ticker 
export const getTickers = async () => await updateTickers() || rw().tickers || { XTX: 'Transaction' }

// get/set default currency
//
// Params:
// @value   string: currency code/ticker
export const setSelected = async (value) => {  
    const currencies = await getTickers()
    const newValue = currencies[value] ? { selected: value } : undefined
    newValue && bond.changed(value)
    return rw(newValue).selected || currencyDefault
}

export const updateTickers = async (timeout = 2000) => {
    if (lastUpdated && new Date() - lastUpdated < updateFrequencyMs) return
    console.log('Updating list of currencies')

    const tickersHash = generateHash(Object.keys(rwCache().tickers || {}).sort())
    let tickers = null
    await client.currencyList.promise(tickersHash, ((err, currencyList) => {
        err && console.error('Failed to retrieve currencies', err)
        if (!isMap(currencyList) || currencyList.size === 0) return

        tickers = Array.from(currencyList).reduce((tickers, [_, c]) => {
            tickers[c.currency] = c.name || c.currency
            return tickers
        }, {})
        rw({ tickers })
        lastUpdated = new Date()
    }))
    return tickers
}