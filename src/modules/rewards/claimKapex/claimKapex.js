import storage from '../../../utils/storageHelper'
import { isObj, objClean } from '../../../utils/utils'

export const generateTweet = () => {
    const { endDate } = statusCached()
    const diffMs = new Date(endDate || undefined) - new Date()
    let count = Math.floor(diffMs / 1000 / 60 / 60 / 24)
    let title = 'days'
    if (count < 1) {
        title = 'hours'
        count = Math.floor(diffMs / 1000 / 60 / 60)
    }
    const { host, protocol } = window.location
    const tweet = encodeURIComponent(
        `Only ${count} ${title} left to claim $KAPEX for your $TOTEM (@totem_live_) rewards!`
        + '\n\nIf you have participated in the Totem rewards campaign you must complete the claim process to be '
        + 'eligible to migrate reward tokens.'
        + `\n\nSubmit your claim now!\n${protocol}//${host}?module=claim-kapex`
    )
    return `https://twitter.com/intent/tweet?button_hashtag=share&text=${tweet}`
}

// export const getRewardIdentity = () => {
//     const {
//         user: {
//             address
//         } = {},
//     } = storage.settings.module('messaging') || {}
//     return address
// }

// invoke with status object to save to storage
export const statusCached = status => storage.cache(
    'rewards',
    'KAPEXClaimStatus',
    isObj(status)
        ? objClean(status, [ // only store these values in the localStorage
            'eligible',
            'endDate',
            'startDate',
            'submitted',
        ])
        : undefined,
) || {}