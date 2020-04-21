import { generateHash, isMap } from '../utils/utils'
import client from './chatClient'
import { translated } from './language'
import storage from './storage'

const [_, textsCap] = translated({
    notImplemented: 'this currency is not supported at the moment',
    unsupportedCurrency: 'unsupported currency'
}, true)
const MODULE_KEY = 'currency'
// read or write to currency settings storage
const rw = value => storage.settings.module(MODULE_KEY, value) || {}
// read or write to cache storage
const rwCache = value => storage.cache(MODULE_KEY, value) || {}
const lastUpdated = null
const updateFrequencyMs = 24 * 60 * 60 * 1000

export const currencies = {
    XTX: 'Transaction',
    // USD: 'United States Dollar',
    // EUR: 'Euro',
    // AUD: 'Australian Dollar'
}

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

// get/set default currency
//
// Params:
// @value   string: currency code/ticker
export const selected = value => rw(currencies[value] ? {selected: value} : undefined).selected || currencyDefault

// get list of currency tickers
//
// Returns  object: key => ticker, value => currency name, if available, or ticker 
export const getTickers = async () => {
    await updateTickers() // frequently update list of currencies
    return rw().tickers || { XTX: 'Transaction' }
}

export const updateTickers = async (timeout = 2000) => {
    if (lastUpdated && new Date() - lastUpdated < updateFrequencyMs) return

    console.log('Updating list of currencies')

    const tickersHash = generateHash(Object.keys(rwCache().tickers || {}).sort())
    await client.currencyList.promise(tickersHash, ((err, currencyList) => {
        err && console.error('Failed to retrieve currencies', err)
        if (!isMap(currencyList) || currencyList.size === 0) return

        const tickers = Array.from(currencyList).reduce((tickers, [_, c]) => {
            tickers[c.currency] = c.name || c.currency
            return tickers
        }, {})
        rw({ tickers })
    }))
}