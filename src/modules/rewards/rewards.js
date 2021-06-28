import { useEffect, useState } from "react"
import { unsubscribe, useRxSubject } from "../../services/react"
import storage from "../../services/storage"
import { generateHash } from "../../utils/utils"
import client, { getUser, rxIsLoggedIn } from "../chat/ChatClient"
import { rxNewNotification } from "../notification/notification"

const moduleKey = 'rewards'
const notificationType = 'rewards'
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
    console.log({ userId, platform, handle })
    const code = generateHash(
        `${userId}:${platform}:${handle}`,
        'blake2',
        32,
    )
    return code.substr(2) // get rid of 0x prefix
}

export const useRewards = () => {
    const [isLoggedIn] = useRxSubject(rxIsLoggedIn)
    const [[rewards, error], setRewards] = useState(() => [rwCache()])

    useEffect(() => {
        if (!isLoggedIn) return () => { }
        let mounted = true
        const getRewards = () => client.rewardsGetData
            .promise()
            .then(rewards => {
                mounted && setRewards([rewards, null])
                Object.keys(rewards)
                    .forEach(key => rwCache(key, rewards[key]))
                console.log({ rewards })
            })
            .catch(error => setRewards([rewards, error]))
        const subscriptions = {
            notification: rxNewNotification.subscribe(([id, { childType, data, type }]) => {
                const { status } = data || {}
                const refresh = type === notificationType
                    && status === 'success'
                    || type === 'chat'
                    && ['signupReward', 'referralSuccess'].includes(childType)
                if (!refresh) return
                // retrieve updated rewards lists
                mounted && getRewards()
            })
        }
        if (!Object.keys(rewards).length) {
            // retrieve initial rewards lists from database
            getRewards()
        }


        return () => {
            mounted = false
            unsubscribe(subscriptions)
        }
    }, [isLoggedIn])

    return [rewards, error]
}