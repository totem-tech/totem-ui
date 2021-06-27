import React, { useState, useEffect } from 'react'
import { Icon } from 'semantic-ui-react'
import Text from '../../components/Text'
import { translated } from '../../services/language'
import { useRxSubject } from '../../services/react'
import client, { rxIsLoggedIn, rxIsRegistered } from '../chat/ChatClient'
import ReferralCard from './ReferralCard'
import SignupCard from './SignupCard'

let textsCap = translated({
    notRegistered: 'please complete registration in the getting started module',
    signupDesc: 'reward you received when you signed up',
    signupHeader: 'signup reward',
}, true)[1]

export default function RewardsView() {
    const [isRegistered] = useRxSubject(rxIsRegistered)
    const [isLoggedIn] = useRxSubject(rxIsLoggedIn)
    const [state, setState] = useState({})
    const { error, referralRewards, signupReward } = state

    useEffect(() => {
        let mounted = true
        !signupReward && client.rewardsGetData
            .promise()
            .then(result => mounted && setState(result || {}))
            .catch(error => setState({ error }))

        return () => mounted = false
    }, [isLoggedIn])

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