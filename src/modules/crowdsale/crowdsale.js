import { BehaviorSubject } from 'rxjs'
import { isValidNumber, objClean } from '../../utils/utils'
import storage from '../../services/storage'

export const rxCrowdsaleData = new BehaviorSubject()
const MODULE_KEY = 'crowdsale'
export const BLOCKCHAINS = Object.freeze({
    BTC: 'Bitcoin',
    DOT: 'Polkadot',
    ETH: 'Ethereum',
})
// ToDo: Change values
export const RATIO2XTX = {
    BTC: 1442914053,
    DOT: 40327188,
    ETH: 396006,
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
export const calculateAllocation = async (chainAmounts = {}) => {
    chainAmounts = objClean(chainAmounts, Object.keys(BLOCKCHAINS))
    const amtDepositedXTX = Object.keys(chainAmounts)
        .reduce((sum, chain) => {
            const amount = chainAmounts[chain]
            const amountXTX = amount * RATIO2XTX[chain]
            return sum + amountXTX
        }, 0)
    const level = findLevel(amtDepositedXTX)
    const isLevel0 = level === 0
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
    const ratio = RATIO2XTX[currency] ||  1 // assume XTX for display purposes
    // last level reached!
    if (!isValidNumber(nextEntry)) return null

    const nextMultiplier = LEVEL_MULTIPLIERS[nextLevel]
    const amtXTXToNextEntry = nextEntry - amtDepositedXTX + 1
    const amtToNextEntry = amtXTXToNextEntry / ratio
    
    return [
        // amount in XTX to reach next level
        amtXTXToNextEntry,
        // amount in @currency required to reach next level
        amtToNextEntry,
        // next level index
        nextLevel,
        // next level multiplier
        nextMultiplier,
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
    BTC: 0.01,
    DOT: 0,
    ETH: 0,
})

// set initial value
rxCrowdsaleData.next(crowdsaleData())