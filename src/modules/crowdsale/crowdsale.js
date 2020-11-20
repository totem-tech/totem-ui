import { BehaviorSubject } from 'rxjs'
import { isValidNumber, objClean } from '../../utils/utils'
import { convertTo, currencyDefault, getCurrencies } from '../../services/currency'
import storage from '../../services/storage'

export const rxCrowdsaleData = new BehaviorSubject()
const MODULE_KEY = 'crowdsale'
export const BLOCKCHAINS = Object.freeze({
    BTC: 'Bitcoin',
    DOT: 'Polkadot',
    ETH: 'Ethereum',
})
// ToDo: add DOT to currencies module
export const RATIO2XTX = {
    DOT: 40327188,
}
export const LEVEL_MULTIPLIERS = [
    1.0000,
    3.0000,
    5.0000,
    7.0000,
    9.0000,
    11.0000,
    13.0000,
    15.0000,
    17.0000,
]
export const LEVEL_ENTRY_XTX = [
    0,
    9082700,
    181654000,
    454135000,
    908270000,
    1362405000,
    2270675000,
    4541350000,
    9082700000,
]
// start of level 9 (negotiable multiplier)
export const ENTRY_NEGOTIATE_XTX = 90827000000

const findLevel = (amtDepositedXTX = 0) => {
    let level = 0
    for (let i = 0; i < LEVEL_ENTRY_XTX.length; i++) {
        if (LEVEL_ENTRY_XTX[i] > amtDepositedXTX) return level
        level = i
    }
    return level
}
export const calculateAllocation = async (deposits = {}) => {
    deposits = objClean(deposits, Object.keys(BLOCKCHAINS))
    const currencies = await getCurrencies()
    let amtDepositedXTX = 0
    const keys = Object.keys(deposits)
    for (let i = 0; i < keys.length; i++) {
        const currency = keys[i]
        const isValidCurrency = !!currencies.find(({ ISO }) => ISO === currency)
        if (!isValidCurrency) continue 

        const amount = deposits[currency] || 0
        const [_, amountXTX] = await convertTo(amount, currency, currencyDefault)
        amtDepositedXTX += eval(amountXTX) || 0   
    }
    const level = findLevel(amtDepositedXTX)
    const multiplier = LEVEL_MULTIPLIERS[level]
    const amtMultipliedXTX = level && Math.ceil(multiplier * amtDepositedXTX)
    const amtToBeUnlockedXTX = level && Math.floor(LEVEL_MULTIPLIERS[1] * amtDepositedXTX)
    return [
        // total amount contributed in base level XTX
        amtDepositedXTX,
        // totam amount allocated in XTX after multiplier applied
        amtMultipliedXTX,
        // level index
        level,
        // level multiplier
        multiplier,
        // amount of XTX to be unlocked soon after the crowdsale
        amtToBeUnlockedXTX,
    ]
}

export const calculateToNextLevel = async (currency, amtDepositedXTX = 0, level = findLevel(amtDepositedXTX)) => {
    const nextLevel = level + 1
    const nextEntry = LEVEL_ENTRY_XTX[nextLevel]
    // last level reached!
    if (!isValidNumber(nextEntry)) return null
    
    const isValidCurrency = !!(await getCurrencies())
        .find(({ ISO }) => ISO === currency)
    const nextMultiplier = LEVEL_MULTIPLIERS[nextLevel]
    const amtXTXToNextEntry = nextEntry - amtDepositedXTX + 1
    let amtToNextEntry = 0
    let nextLevelAmt = 0
    if (isValidCurrency) {
        const amtToNextResult = await convertTo(amtXTXToNextEntry, currencyDefault, currency)
        const nextLevelResult = await convertTo(LEVEL_ENTRY_XTX[level], currencyDefault, currency)
        amtToNextEntry = eval(amtToNextResult[1])
        nextLevelAmt = eval(nextLevelResult[1])
    }
    
    return [
        // amount in XTX to reach next level
        amtXTXToNextEntry,
        // amount in @currency required to reach next level
        amtToNextEntry,
        // next level index
        nextLevel,
        // next level multiplier
        nextMultiplier,
        // next level amount in selected currency
        nextLevelAmt,
    ]
}

/**
 * @name    crowdsaleData
 * @summary get/set crowdsale data to localStorage
 * 
 * @param   {Object}    data (optional)
 * 
 * @returns {Object}    returns saved data
 */
export const crowdsaleData = data => {
    const saved = storage.settings.module(MODULE_KEY, data) || {}
    data && rxCrowdsaleData.next(saved)
    return saved
}

export const getCrowdsaleIdentity = () => crowdsaleData().identity

// placeholder
export const getDeposits = async () => ({
    BTC: 0.0144,
    DOT: 0,
    ETH: 0,
})

// set initial value
rxCrowdsaleData.next(crowdsaleData())