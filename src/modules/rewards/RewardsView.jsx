import React from 'react'
import { translated } from '../../services/language'
import { useRxSubject } from '../../services/react'
import { rxIsRegistered } from '../chat/ChatClient'
import ReferralCard from './ReferralCard'
import { useRewards } from './rewards'
import RewardsProgress from './RewardsProgress'
import SignupCard from './SignupCard'
import SocialCard from './SocialCard'

let textsCap = translated({
    notRegistered: 'please complete registration in the getting started module',
    signupDesc: 'reward you received when you signed up',
    signupHeader: 'signup reward',
}, true)[1]

export default function RewardsView() {
    const [isRegistered] = useRxSubject(rxIsRegistered)
    const rewards = useRewards()
    const { socialRewards, signupReward, referralRewards } = rewards

    return !isRegistered
        ? textsCap.notRegistered
        : (
            <div>
                <RewardsProgress {...{ rewards }} />
                <SignupCard {...{ signupReward }} />
                <SocialCard {...{ socialRewards }} />
                <ReferralCard {...{ referralRewards }} />
            </div>
        )
}