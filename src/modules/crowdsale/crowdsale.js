// import { BehaviorSubject } from 'rxjs'
// // utils
// import { isObj, isValidNumber, objClean } from '../../utils/utils'
// import PromisE from '../../utils/PromisE'
// // services
// import { subjectAsPromise } from '../../services/react'
// import storage from '../../services/storage'
// // modules
// import client, { rxIsLoggedIn } from '../chat/ChatClient'
// import { convertTo, currencyDefault, getCurrencies } from '../currency/currency'

// const MODULE_KEY = 'crowdsale'
// export const rxCrowdsaleData = new BehaviorSubject(crowdsaleData() || {})
// export const BLOCKCHAINS = Object.freeze({
//     BTC: 'Bitcoin',
//     DOT: 'Polkadot',
//     ETH: 'Ethereum',
// })
// // ToDo: add DOT to currencies module
// let LEVEL_MULTIPLIERS
// // for reference only. value will change before Crowdsale commencement.
// // [
// //     1.0000,
// //     3.0000,
// //     5.0000,
// //     7.0000,
// //     9.0000,
// //     11.0000,
// //     13.0000,
// //     15.0000,
// //     17.0000,
// // ]
// let LEVEL_ENTRY_XTX
// // for reference only. value will change before Crowdsale commencement.
// // [
// //     0,
// //     9082652,
// //     181653043,
// //     454132607,
// //     908265213,
// //     1362397820,
// //     2270663034,
// //     4541326067,
// //     9082652134,
// // ]
// // start of level 9 (negotiable multiplier) //18165304269
// export let Level_NEGOTIATE_Entry_XTX

// const findLevel = async (amtDepositedXTX = 0) => {
//     await fetchConstants()
//     let level = 0
//     for (let i = 0; i < LEVEL_ENTRY_XTX.length; i++) {
//         if (LEVEL_ENTRY_XTX[i] > amtDepositedXTX) return level
//         level = i
//     }
//     return level
// }
// export const calculateAllocation = async (deposits = {}) => {
//     await fetchConstants()
//     deposits = objClean(deposits, Object.keys(BLOCKCHAINS))
//     const currencies = await getCurrencies()
//     let amtDepositedXTX = 0
//     const keys = Object.keys(deposits)
//     for (let i = 0; i < keys.length; i++) {
//         const currency = keys[i]
//         const isValidCurrency = !!currencies.find(({ ticker }) => ticker === currency)
//         if (!isValidCurrency) continue

//         const amount = deposits[currency] || 0
//         const [_, amountXTX] = await convertTo(amount, currency, currencyDefault)
//         amtDepositedXTX += eval(amountXTX) || 0
//     }
//     const level = await findLevel(amtDepositedXTX)
//     const multiplier = LEVEL_MULTIPLIERS[level]
//     const amtMultipliedXTX = level && Math.ceil(multiplier * amtDepositedXTX)
//     const amtToBeUnlockedXTX = level && Math.floor(LEVEL_MULTIPLIERS[1] * amtDepositedXTX)
//     return [
//         // total amount contributed in base level XTX
//         amtDepositedXTX,
//         // totam amount allocated in XTX after multiplier applied
//         amtMultipliedXTX,
//         // level index
//         level,
//         // level multiplier
//         multiplier,
//         // amount of XTX to be unlocked soon after the crowdsale
//         amtToBeUnlockedXTX,
//     ]
// }

// export const calculateToNextLevel = async (currency, amtDepositedXTX = 0, level) => {
//     await fetchConstants()
//     if (!isValidNumber(level)) {
//         level = await findLevel(amtDepositedXTX)
//     }
//     const nextLevel = level + 1
//     const nextEntry = LEVEL_ENTRY_XTX[nextLevel]
//     const lastLevel = LEVEL_MULTIPLIERS.length - 1
//     const negotiable = nextLevel >= lastLevel && amtDepositedXTX >= Level_NEGOTIATE_Entry_XTX
//     // last level reached!
//     // if (!isValidNumber(nextEntry)) return null

//     const isValidCurrency = !!currency && !!(await getCurrencies())
//         .find(({ ticker }) => ticker === currency)
//     const nextMultiplier = LEVEL_MULTIPLIERS[nextLevel]
//     const amtXTXToNextEntry = nextEntry - amtDepositedXTX + 1
//     let amtToNextEntry = 0
//     let nextLevelAmt = 0
//     if (isValidCurrency) {
//         const amtToNextResult = await convertTo(amtXTXToNextEntry, currencyDefault, currency)
//         const nextLevelResult = await convertTo(LEVEL_ENTRY_XTX[level], currencyDefault, currency)
//         amtToNextEntry = eval(amtToNextResult[1])
//         nextLevelAmt = eval(nextLevelResult[1])
//     }


//     return [
//         // amount in XTX to reach next level
//         amtXTXToNextEntry,
//         // amount in @currency required to reach next level
//         amtToNextEntry,
//         // next level index
//         nextLevel,
//         // next level multiplier
//         nextMultiplier,
//         // next level amount in selected currency
//         nextLevelAmt,
//         // user can negotiate for a discount
//         negotiable,
//     ]
// }

// /**
//  * @name    crowdsaleData
//  * @summary get/set crowdsale data to localStorage
//  * 
//  * @param   {Object}    data (optional)
//  * 
//  * @returns {Object}    returns saved data
//  */
// export function crowdsaleData(data) {
//     const saved = storage.settings.module(
//         MODULE_KEY,
//         isObj(data)
//             ? data      // write
//             : undefined // read
//     ) || {}
//     data && rxCrowdsaleData.next(saved)
//     return saved
// }

// export const fetchConstants = async () => {
//     if (LEVEL_MULTIPLIERS) return
//     // if a request is already in-progress, wait for it to resolve and use the result
//     if (fetchConstants.promise && fetchConstants.promise.pending) {
//         return await fetchConstants.promise
//     }

//     fetchConstants.promise = PromisE(async () => {
//         // wait until user is logged in
//         await subjectAsPromise(rxIsLoggedIn, true)
//         return await client.crowdsaleConstants.promise()
//     })
//     const result = await fetchConstants.promise
//     LEVEL_MULTIPLIERS = result.LEVEL_MULTIPLIERS

//     // convert USD to XTX
//     Level_NEGOTIATE_Entry_XTX = eval(
//         (await convertTo(
//             result.Level_NEGOTIATE_Entry_USD,
//             'USD',
//             currencyDefault,
//         ))[1]
//     )
//     // convert USD to XTX
//     LEVEL_ENTRY_XTX = []
//     for (let i = 0; i < result.LEVEL_ENTRY_USD.length; i++) {
//         const [_, rounded] = await convertTo(
//             result.LEVEL_ENTRY_USD[i],
//             'USD',
//             currencyDefault,
//         )
//         LEVEL_ENTRY_XTX[i] = eval(rounded)
//     }
// }

// export const getCrowdsaleIdentity = () => crowdsaleData().identity

// // placeholder
// export const getDeposits = async (cached = true) => {
//     const result = await client.crowdsaleCheckDeposits.promise(cached)
//     return result
// }