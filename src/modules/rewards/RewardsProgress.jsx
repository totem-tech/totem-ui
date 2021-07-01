import React from 'react'
import PropTypes from 'prop-types'
import { Progress } from 'semantic-ui-react'

export default function RewardsProgress({ rewards = {} }) {
    const { referralRewards = [], signupReward = {}, socialRewards = {} } = rewards
    const socialKeys = Object.keys(socialRewards)
    const numSocialCompleted = socialKeys.map(key => (socialRewards[key] || {}).amount > 0)
        .filter(Boolean)
        .length
    const cards = [
        signupReward.amount > 0 ? 1 : 0,
        numSocialCompleted / socialKeys.length,
        referralRewards.length > 0 ? 1 : 0,
    ]
    const percent = cards
        .map(n => (n / cards.length) * 100)
        .reduce((sum, n) => sum + n, 0)
    console.log({ percentage: percent })
    return (
        <Progress {...{
            active: percent <= 99,
            percent,
            size: 'tiny',
            style: { margin: '-16px 0 0 0' }
        }} />
    )
}
RewardsProgress.propTypes = {
    rewards: PropTypes.object,
}