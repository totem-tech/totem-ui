import { BehaviorSubject } from 'rxjs'
import { generateHash, arrSort, isValidNumber } from '../../utils/utils'
import PromisE from '../../utils/PromisE'
import client, { rxIsConnected } from '../chat/ChatClient'
import { translated } from '../../services/language'
import storage from '../../services/storage'
import { subjectAsPromise } from '../../services/react'

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
export const currencyDefault = 'TOTEM'
// RxJS Subject to keep track of selected currencly changes
export const rxSelected = new BehaviorSubject(getSelected())

/**
 * @name    convertTo
 * @summary convert to display currency and limit to decimal places
 * 
 * @param   {Number} amount     amount to convert
 * @param   {String} from       source currency ID
 * @param   {String} to         target currency ID
 * @param   {Number} decimals   (optional) number of decimal places to use. 
 *                               Default: decimals defined in `to` currency
 * 
 * @returns {Array} [@convertedAmount Number, @rounded String]
 */
export const convertTo = async (amount = 0, from, to, decimals) => {
    const currencies = await getCurrencies()
    const fromCurrency = currencies.find(({ currency }) => currency === from)
    const toCurrency = currencies.find(({ currency }) => currency === to)

    if (!fromCurrency || !toCurrency) throw new Error(textsCap.invalidCurency)

    const convertedAmount = (fromCurrency.ratioOfExchange / toCurrency.ratioOfExchange) * amount
    if (!isValidNumber(decimals)) {
        decimals = parseInt(toCurrency.decimals) || 0
    }
    const rounded = convertedAmount.toFixed(decimals + 2)

    return [
        convertedAmount,
        rounded.substr(0, rounded.length - (!decimals ? 3 : 2)),
        decimals,
        fromCurrency,
        toCurrency,
    ]
}

const fetchCurrencies = async (cached = rwCache().currencies) => {
    const hash = generateHash(cached)
    let currencies = await client.currencyList.promise(hash)
    // currencies list is the same as in the server => use cached
    if (currencies.length === 0) return cached

    // sort by ticker
    currencies = arrSort(currencies, 'ticker')

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

        const p = fetchCurrencies(cached)
        // only use timeout if there is cached data available.
        // First time load must retrieve full list of currencies.
        const tp = cached && PromisE.timeout(p, 3000)
        updateCurrencies.updatePromise = p

        return await (tp || p)
    } catch (err) {
        console.trace('Failed to retrieve currencies:', err)
    }
}

// if selected currency is not available in the currencies list, set to default currency
(async () => {
    const currencies = await getCurrencies()
    if (!currencies.find(x => x.currency === rxSelected.value)) {
        setSelected(
            currencies
                .find(x => x.ticker === currencyDefault)
                .currency
        )
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