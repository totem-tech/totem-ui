import {translated} from './language'
import storage from './storage'

const [_, textsCap] = translated({
    notImplemented: 'this currency is not supported at the moment',
    unsupportedCurrency: 'unsupported currency'
}, true)
const MODULE_KEY = 'currency'
// read or write to currency settings storage
const rw = value => storage.settings.module(MODULE_KEY, value) || {}

export const currencies = {
    XTX: 'Transaction',
    USD: 'United States Dollar',
    EUR: 'Euro',
    AUD: 'Australian Dollar'
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
    if (!currencies[from] || !currencies[to]) throw textsCap.unsupportedCurrency
    if (from === to) return amount

    throw textsCap.notImplemented

    // return amount
}

// get/set default currency
//
// Params:
// @value   string: currency code/ticker
export const selected = value => rw(currencies[value] ? {selected: value} : undefined).selected || currencyDefault