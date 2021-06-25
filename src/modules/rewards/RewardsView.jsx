import React, { useState, useEffect } from 'react'
import { Card, Icon } from 'semantic-ui-react'
import { translated } from '../../services/language'
import { useInverted } from '../../services/window'
import { className } from '../../utils/utils'
import client from '../chat/ChatClient'
import ReferralList from './ReferralList'

let textsCap = translated({
    referralDesc: `Each time you refer a friend who joins Totem you receive rewards.
    If your friend follows and Tweets about Totem, you both receive more rewards!`,
    referralHeader: 'referral Reward',
    signupDesc: 'reward you received when you signed up',
    signupHeader: 'signup reward',
}, true)[1]

export default function RewardsView() {
    const inverted = useInverted()
    const [state, setState] = useState({})
    const referralContent = (
        <div>
            {textsCap.referralDesc}
            <div style={{ marginTop: 15 }}>
                {state.referralRewards && <ReferralList referralRewards={state.referralRewards} />}
            </div>

        </div>
    )

    const signupHeader = (
        <span className='header'>
            <Icon name='check' />{textsCap.signupHeader}
        </span>
    )

    useEffect(() => {
        let mounted = true
        client.rewardsGetData.promise()
            .then(result => {
                setState(result)
            })
            .catch(console.log)

        return () => mounted = false
    }, [])

    return (
        <div>
            <Card {...{ fluid: true, className: className({ inverted }) }}>
                <Card.Content {...{ header: signupHeader, className: className({ inverted }) }} />
                <Card.Content description={textsCap.signupDesc} />
                <Card.Content extra>
                    <Icon name='money' /> 1000000 TOTEM
                </Card.Content>
            </Card>
            <Card {...{ fluid: true, className: className({ inverted }) }}>
                <Card.Content header={textsCap.referralHeader} />
                <Card.Content description={referralContent} />
                <Card.Content extra>
                    <Icon name='money' />1000000 TOTEM
                </Card.Content>
            </Card>
        </div>
    )
}