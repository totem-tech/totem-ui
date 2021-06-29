import { useEffect, useState } from "react"
import { BehaviorSubject } from 'rxjs'
import { generateHash } from "../../utils/utils"
import { subjectAsPromise, unsubscribe, useRxSubject } from "../../services/react"
import storage from "../../services/storage"
import client, { getUser, rxIsLoggedIn } from "../chat/ChatClient"
import { rxNewNotification } from "../notification/notification"

const moduleKey = 'rewards'
const notificationType = 'rewards'
const rxRewardsChanged = new BehaviorSubject(false)
const rwCache = (key, value) => storage.cache(moduleKey, key, value)

export const generateSignupTweet = (twitterHandle = '') => {
    twitterHandle = twitterHandle
        .split('@')
        .join('')
        .trim()
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
export const getRewards = async () => {
    // make sure user is logged in
    !rxIsLoggedIn.value && await subjectAsPromise(rxIsLoggedIn, true)
    try {
        const rewards = await client.rewardsGetData.promise()
        Object.keys(rewards)
            .forEach(key => rwCache(key, rewards[key]))
        rxRewardsChanged.next(rewards)
        return rewards
    } catch (err) {
        console.trace(err)
    }
}

export const useRewards = () => {
    const [rewards] = useRxSubject(rxRewardsChanged, _ => rwCache())

    useEffect(() => {
        // retrieve initial rewards lists from database
        if (!Object.keys(rewards).length) {
            getRewards()
        }
    }, [])

    return rewards
}

// automatically retrieve and store rewards data locally
rxNewNotification.subscribe(async ([_, { childType, data, type }]) => {
    const { status } = data || {}
    const updateRequired = type === notificationType
        && status === 'success'
        || type === 'chat'
        && ['signupReward', 'referralSuccess']
            .includes(childType)
    if (!updateRequired) return

    // retrieve updated rewards lists
    getRewards()
})