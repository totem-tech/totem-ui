import { generateHash } from "../../utils/utils"
import { getUser } from "../chat/ChatClient"

export const generateSignupTweet = twitterHandle => {
    const { id } = getUser() || {}
    if (!id) return

    const code = generateVerificationCode(id, 'twitter', twitterHandle)

    return 'I just signed up to @totem_live_, the world\'s first true peer-to-peer accounting protocol on Polkadot.'
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