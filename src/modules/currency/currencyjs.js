import { BehaviorSubject, Subject } from 'rxjs'
import client from '../../utils/chatClient'
import { translated } from '../../utils/languageHelper'
import PromisE from '../../utils/PromisE'
import storage from '../../utils/storageHelper'
import {
    arrSort,
    arrUnique,
    generateHash,
    isArr,
    isValidDate,
    isValidNumber,
} from '../../utils/utils'
import defaultCurrencies from './fallbackCurrencies';

const [texts, textsCap] = translated({
    invalidCurency: 'invalid or unsupported currency supplied',
    datePriceNotAvailable: 'price is not available for selected date'
}, true)
const MODULE_KEY = 'currency'
// read or write to currency settings storage
const rw = value => storage.settings.module(MODULE_KEY, value) || {}
// read or write to cache storage
const rwCache = (key, value) => storage.cache(MODULE_KEY, key, value) || {}
let lastUpdated = null
const updateFrequencyMs = 24 * 60 * 60 * 1000
// default currency
export const networkCurrency = 'TOTEM'
export const currencyDefault = 'CREDITS' //'≜USD'// 
// RxJS Subject to keep track of selected currencly changes
export const rxSelected = new BehaviorSubject(getSelected())
// Only triggered when currency list is updated
export const rxCurrencies = new Subject()

/**
 * @name    convertTo
 * @summary convert to display currency and limit to decimal places
 * 
 * @param   {Number} amount     amount to convert
 * @param   {String} from       source currency ID
 * @param   {String} to         target currency ID
 * @param   {Number} decimals   (optional) number of decimal places to use. 
 *                               Default: decimals defined in `to` currency
 * @param   {String|Number} dateOrROE  (optional) Ratio of Exchange or date (to retrieve exchange rate)
 * 
 * @returns {Array} [
 *                      @convertedAmount Number,
 *                      @rounded         String,
 *                      @decimals        Number,
 *                      @fromCurrency    Object,
 *                      @toCurrency      Object
 *                  ]
 */
export const convertTo = async (
    amount = 0,
    from,
    to,
    decimals,
    dateOrROE,
    decimalOverhead = 2
) => {
    // from = from === networkCurrency
    //     ? currencyDefault
    //     : from
    // to = to === networkCurrency
    //     ? currencyDefault
    //     : to
    const currencies = await getCurrencies()
    const USD = 'USD'
    let fromCurrency, toCurrency, usdEntry
    currencies.forEach(c => {
        if ([c.currency, c._id].includes(from)) fromCurrency = c
        if ([c.currency, c._id].includes(to)) toCurrency = c
        if (c.type === 'fiat' && c.ticker === USD) usdEntry = c
    })

    if (!fromCurrency || !toCurrency || !usdEntry) {
        const invalidTicker = !fromCurrency
            ? from
            : !toCurrency
                ? to
                : USD
        throw new Error(`${textsCap.invalidCurency}: ${invalidTicker}`)
    }
    let { ratioOfExchange: fromROE } = fromCurrency
    let { ratioOfExchange: toROE } = toCurrency
    // retrieve price of a specific date
    if (isValidDate(dateOrROE)) {
        const result = await client.currencyPricesByDate(
            dateOrROE,
            arrUnique([
                fromCurrency._id,
                toCurrency._id,
            ]),
        )
        const fromEntry = result.find(x => x.currencyId === fromCurrency._id)
        if (!fromEntry) throw new Error(`${fromCurrency.name} ${texts.datePriceNotAvailable} ${dateOrROE}`)
        fromROE = fromEntry.ratioOfExchange

        let toEntry = result.find(x => x.currencyId === toCurrency._id)
        // fall back to USD, if target currency price for supplied date is not availabe.
        if (!toEntry) toCurrency = usdEntry
        toROE = (toEntry || toCurrency).ratioOfExchange
    } else if (
        isArr(dateOrROE)
        && dateOrROE.length === 2
        && dateOrROE.every(x => isValidNumber(parseInt(x)))
    ) {
        fromROE = dateOrROE[0]
        toROE = dateOrROE[1]
    }

    const convertedAmount = (fromROE / toROE) * amount
    if (!isValidNumber(decimals)) {
        decimals = parseInt(toCurrency.decimals) || 0
    }
    const rounded = convertedAmount.toFixed(decimals + decimalOverhead)

    return [
        convertedAmount,
        rounded.substr(0, rounded.length - decimalOverhead - (!decimals ? 1 : 0)),
        decimals,
        fromCurrency,
        toCurrency,
    ]
}

/**
 * Fetches the list of currencies.
 * 
 * This function attempts to fetch the latest list of currencies from the server.
 * If the cache contains values, it generates a hash of the cached data and uses it
 * to request the latest currency list from the server. If the server returns a new list,
 * it sorts the list by ticker, updates the cache, and returns the sorted list.
 * If the cache is empty or the server returns no new currencies, it falls back to using
 * a default list of currencies, updates the cache with the default list, and returns it.
 * 
 * @param {Array} cached - The cached list of currencies. Defaults to the result of rwCache().currencies.
 * @returns {Array} - The list of currencies.
 */
const fetchCurrencies = async (cached = rwCache().currencies) => {
    // Check if the cache has values
    if (!cached || cached.length === 0) {
        // fallback to default currencies.
    } else {
        // Generate a hash of the currency data held in cache
        const hash = generateHash(cached);
        console.log('default', hash);
        // The hash is then used to get the latest currency list from the server
        const currencies = await client.currencyList(hash);
        // No currencies are returned if the hash is the same, therefore use cached values.
        if (currencies && currencies.length > 0) {
            // Sort new list by ticker
            const sortedCurrencies = arrSort(currencies, 'ticker');
            // Save to cache storage
            rwCache('currencies', sortedCurrencies);
            console.log('Currency list updated', sortedCurrencies);
            rxCurrencies.next(sortedCurrencies);
            return sortedCurrencies;
        }
    }
    // If cache is empty or no new currencies were fetched, use defaultCurrencies
    rxCurrencies.next(defaultCurrencies);
    return defaultCurrencies;
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

/**
 * @name    setSelected
 * @summary set display currency
 * 
 * @param   {String} currency 
 * @returns {String}
 */
export const setSelected = async (currency) => {
    const currencies = await getCurrencies()
    const exists = currencies.find(x => x.currency === currency)
    const newValue = exists
        ? { selected: currency }
        : undefined
    newValue && rxSelected.next(currency)
    const { selected } = rw(newValue)
    return selected || currencyDefault
}

export const updateCurrencies = async () => {
    try {
        const { updatePromise } = updateCurrencies
        const skip = lastUpdated && new Date() - lastUpdated < updateFrequencyMs
        if (skip) return
        // prevents making multiple requests
        if (updatePromise) return await updatePromise

        const cached = rwCache().currencies
        const p = fetchCurrencies(cached)
        // only use timeout if there is cached data available.
        // First time load must retrieve full list of currencies.
        const tp = cached?.length && PromisE
            .timeout(p, 3000)
            // if request fails resolve with cached value
            .catch(() => cached)
        updateCurrencies.updatePromise = p

        const result = await (tp || p)
        return result
    } catch (err) {
        console.trace('Failed to retrieve currencies:', err)
    }
}

// if selected currency is not available in the currencies list, set to default currency
(async () => {
    const currencies = await getCurrencies()
    const selected = currencies.find(x => x.currency === rxSelected.value)
    if (!selected) {
        const { currency } = currencies
            .find(x => x.ticker === currencyDefault) || {}
        currency && setSelected(currency)
    }
})()
export default {
    currencyDefault,
    rxSelected,
    convertTo,
    getSelected,
    getCurrencies,
    setSelected,
    updateCurrencies,
}