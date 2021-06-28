import React, { useState, useEffect } from 'react'
import { translated } from '../../services/language'
import { useRxSubject } from '../../services/react'
import client, { rxIsLoggedIn, rxIsRegistered } from '../chat/ChatClient'
import ReferralCard from './ReferralCard'
import { useRewards } from './rewards'
import SignupCard from './SignupCard'

let textsCap = translated({
    notRegistered: 'please complete registration in the getting started module',
    signupDesc: 'reward you received when you signed up',
    signupHeader: 'signup reward',
}, true)[1]

export default function RewardsView() {
    const [isRegistered] = useRxSubject(rxIsRegistered)
    const [rewards = {}, error] = useRewards()
    const { referralRewards, signupReward } = rewards

    if (error) return error

    return !isRegistered
        ? textsCap.notRegistered
        : (
            <div>
                <SignupCard {...{ signupReward }} />
                <ReferralCard {...{ referralRewards }} />
            </div>
        )
}