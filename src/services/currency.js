import { BehaviorSubject } from 'rxjs'
import { generateHash, arrSort, isArr, isValidNumber } from '../utils/utils'
import PromisE from '../utils/PromisE'
import client, { rxIsConnected } from '../modules/chat/ChatClient'
import { translated } from './language'
import storage from './storage'
import { subjectAsPromise } from './react'

const textsCap = translated({
    invalidCurency: 'invalid currency supplied',
}, true)[1]
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
export const rxSelected = new BehaviorSubject(getSelected())

/**
 * @name    convertTo
 * @summary convert to display currency and limit to decimal places
 * 
 * @param   {Number} amount     amount to convert
 * @param   {String} from       currency ticker to convert from
 * @param   {String} to         currency ticker to convert to
 * @param   {Number} decimals   (optional) number of decimal places to use. 
 *                               Default: decimals defined in `to` currency
 * 
 * @returns {Array} [@convertedAmount Number, @rounded String]
 */
export const convertTo = async (amount = 0, from, to, decimals) => {
    // from = from.toUpperCase()
    // to = to.toUpperCase()
    const ft = [from, to]
    // await client.currencyConvert.promise(from, to, amount)
    // wait up to 10 seconds if messaging service is not connected yet
    if (!rxIsConnected.value) await subjectAsPromise(rxIsConnected, true, 10000)[0]
    const currencies = await getCurrencies()
    const fromTo = currencies.filter(({ ISO }) => ft.includes(ISO))
    const gotBoth = ft.every(x => fromTo.find(c => c.ISO === x))
    if (!gotBoth) throw new Error(textsCap.invalidCurency)
    
    const fromCurrency = fromTo.find(({ ISO }) => ISO === from)
    const toCurrency = currencies.find(({ ISO }) => ISO === to)
    const convertedAmount = (fromCurrency.ratioOfExchange / toCurrency.ratioOfExchange) * amount
    
    if (!isValidNumber(decimals)) {
        decimals = parseInt(toCurrency.decimals)
    }
    const rounded = convertedAmount.toFixed(decimals)
    return [convertedAmount, rounded, decimals]
}

const fetchCurrencies = async (cached = rwCache().currencies) => {
    const hash = generateHash(cached)
    let currencies = await client.currencyList.promise(hash)
    // currencies list is the same as in the server => use cached
    if (currencies.length === 0) return cached

    // sort by ISO and  makes sure there is a name and ISO
    currencies = arrSort(currencies.map(c => {
        c.nameInLanguage = c.nameInLanguage || c.currency
        c.ISO = c.ISO || c.currency
        return c
    }), 'ISO')

    rwCache('currencies', currencies)
    lastUpdated = new Date()
    console.log('Currency list updated', currencies)
    return currencies
}

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

        const cached = rwCache().currencies
        // messaging service is not connected
        if (!rxIsConnected.value) {
            // return existing list if available
            if (cached && cached.length) return cached

            // wait till connected
            await subjectAsPromise(rxIsConnected, true)[0]
        }

        updateCurrencies.updatePromise = PromisE.timeout(fetchCurrencies(cached), 3000)

        return await updateCurrencies.updatePromise
    } catch (err) {
        console.trace('Failed to retrieve currencies:', err)
    }
}

export default {
    currencyDefault,
    rxSelected,
    convertTo,
    getSelected,
    getCurrencies,
    setSelected,
    updateCurrencies,
}