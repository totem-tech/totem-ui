import { useEffect, useState } from 'react'
import { BehaviorSubject } from 'rxjs'
import storage from '../../utils/storageHelper'
import { generateHash, isArr, isDefined } from '../../utils/utils'
import { subjectAsPromise, unsubscribe, useRxSubject } from '../../utils/reactjs'
import client, { getUser, rxIsLoggedIn } from '../../utils/chatClient'
import { rxNewNotification } from '../notification/notification'

const moduleKey = 'rewards'
const notificationType = 'rewards'
const rxRewardsChanged = new BehaviorSubject(0)
const initialRewardAmount = 108154 // only used where amount has not been saved (initial drop)
const rwCache = (key, value) => storage.cache(moduleKey, key, value)
export const rewardTypes = {
    decoded2206: 'decoded2206',
    referral: 'referral-reward',
    referralTwitter: 'referral-twitter-reward',
    signup: 'signup-reward',
    signupDiscord: 'signup-discord',
    signupTelegram: 'signup-telegram',
    signupTwitter: 'signup-twitter-reward',
}

export const generateCrowdloanTweet = () => {
    const { id } = getUser() || {}

    return '@Totem_Live_, is building the world\'s first peer-to-peer accounting consensus protocol. It\’s not just a first in the blockchain space – it\’s a first in the accounting world too.'
        + '\n\nSignup and check out the testnet DApp here:'
        + `\n\nhttps://totem.live?ref=${id}`
}

export const generateSignupTweet = (twitterHandle = '') => {
    twitterHandle = twitterHandle
        .split('@')
        .join('')
        .trim()
        .toLowerCase()
    const { id } = getUser() || {}
    if (!id || !twitterHandle) return

    const code = generateVerificationCode(id, 'twitter', twitterHandle)

    return 'I just signed up to @Totem_Live_, the world\'s first true peer-to-peer accounting protocol on Polkadot.'
        + '\n\nBe an early adopter, signup now & refer friends to receive your $TOTEM bonus: '
        + `https://totem.live?ref=${twitterHandle}@twitter`
        + `\n\n#TotemLive #Airdrop #Polkadot #Kusama ${code}`
}

/**
 * @name    generateVerificationCode
 * @summary generates user's social media handle verification code
 * 
 * @param   {String} userId 
 * @param   {String} platform 
 * @param   {String} handle 
 * 
 * @returns {String} hex string
 */
export const generateVerificationCode = (userId, platform, handle) => {
    const code = generateHash(
        `${userId}:${platform}:${handle}`,
        'blake2',
        32,
    )
    return code.substr(2) // get rid of 0x prefix
}

/**
 * @name    getRewards
 * @summary retrieve user's rewards history
 * 
 * @returns {Object}
 */
export const getRewards = async () => {
    try {
        // make sure user is logged in
        !rxIsLoggedIn.value && await subjectAsPromise(rxIsLoggedIn, true)[0]
        const rewards = await client.rewardsGetData.promise()
        const result = {
            // include referral twitter rewards as well
            referralRewards: rewards
                .filter(x => x.type === rewardTypes.referral)
                .map(entry => ({
                    ...entry,
                    twitterReward: rewards.find(x => x.type === rewardTypes.referralTwitter)
                })),
            signupReward: rewards.find(x => x.type === rewardTypes.signup),
            socialRewards: {
                decoded2206: rewards.find(x => x.type === rewardTypes.decoded2206) || {},
                discord: rewards.find(x => x.type === rewardTypes.signupDiscord) || {},
                newsletter: (rwCache().socialRewards || {}).newsletter || false,
                telegram: rewards.find(x => x.type === rewardTypes.signupTelegram) || {},
                twitter: rewards.find(x => x.type === rewardTypes.signupTwitter) || {},
            }
        }
        Object.keys(result)
            .forEach(key =>
                rwCache(key, result[key])
            )

        rxRewardsChanged.next(rxRewardsChanged.value + 1)
        return result
    } catch (err) {
        console.log(err)
    }
}

export const markNewsleterDone = () => {
    rwCache('socialRewards', { newsletter: true })
    rxRewardsChanged.next(rxRewardsChanged.value + 1)
}

export const useRewards = () => {
    const [rewards] = useRxSubject(rxRewardsChanged, _ => rwCache())

    useEffect(() => {
        // retrieve initial rewards lists from database
        if (!useRewards.loaded) {
            getRewards()
            useRewards.loaded = true
        }
    }, [])

    return rewards
}

// automatically retrieve and store rewards data locally
rxNewNotification.subscribe(x => {
    if (!isArr(x)) return
    const [_, { data, type }] = x
    const { status } = data || {}
    const updateRequired = type === notificationType
        && status === 'success'
    if (!updateRequired) return

    // retrieve updated rewards lists
    getRewards()
})