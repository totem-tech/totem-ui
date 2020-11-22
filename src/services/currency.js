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
    from = from.toUpperCase()
    to = to.toUpperCase()
    const ft = [from, to]
    // await client.currencyConvert.promise(from, to, amount)
    // wait up to 10 seconds if messaging service is not connected yet
    if (!rxIsConnected.value) await subjectAsPromise(rxIsConnected, true, 10000)[0]
    const currencies = await getCurrencies()
    const fromTo = currencies.filter(({ ISO }) => ft.includes(ISO))
    if (!ft.every(x => fromTo.find(c => c.ISO === x))) throw new Error(textsCap.invalidCurency)
    
    const fromCurrency = fromTo.find(({ ISO }) => ISO === from)
    const toCurrency = currencies.find(({ ISO }) => ISO === to)
    const convertedAmount = (fromCurrency.ratioOfExchange / toCurrency.ratioOfExchange) * amount
    
    if (!isValidNumber(decimals)) {
        decimals = parseInt(toCurrency.decimals)
    }
    const rounded = convertedAmount.toFixed(decimals)
    return [convertedAmount, rounded, decimals]
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

        const sortedArr = rwCache().currencies
        // messaging service is not connected
        if (!rxIsConnected.value) {
            // return existing list if available
            if (!sortedArr.length) return sortedArr

            // wait till connected
            await subjectAsPromise(rxIsConnected, true)[0]
        }

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