import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Button, Card, Icon } from 'semantic-ui-react'
import { className, isDefined } from '../../utils/utils'
import LabelCopy from '../../components/LabelCopy'
import Text from '../../components/Text'
import { translated } from '../../services/language'
import { useInverted } from '../../services/window'
import Currency from '../currency/Currency'
import { currencyDefault } from '../currency/currency'
import TwitterRewardWizard from './TwitterRewardWizard'

const initialRewardAmount = 108154 // only used where amount has not been saved (initial drop)
const textsCap = translated({
    signupDesc: 'you can earn more coins by following and sharing about Totem on Twitter. The steps below will guide you through the process',
    signupHeader: 'signup reward',
    totalEarned: 'total earned',
}, true)[1]

export default function SignupCard({ signupReward = {} }) {
    const inverted = useInverted()
    const { amount = initialRewardAmount, twitterReward = {} } = signupReward
    const total = amount + (twitterReward.amount || 0)
    const header = (
        <Text className='header'>
            <Icon name={amount > 0 && twitterReward.amount > 0 ? 'check' : 'play'} />
            {textsCap.signupHeader}
        </Text>
    )
    const content = !!twitterReward.amount
        ? '' // user already received signup twitter reward
        : (
            <Text>
                {textsCap.signupDesc}
                <div>
                    <br />
                    <TwitterRewardWizard />
                </div>
            </Text>
        )
    return (
        <Card {...{
            fluid: true,
            className: className({ inverted }),
        }}>
            <Card.Content {...{
                header: header,
                className: className({ inverted }),
            }} />
            {content && <Card.Content description={content} />}
            <Card.Content extra>
                <Text>
                    <Icon name='money' />
                    <Currency {...{
                        title: textsCap.totalEarned,
                        unit: currencyDefault,
                        value: total,
                    }} />
                </Text>
            </Card.Content>
        </Card>
    )
}
SignupCard.propTypes = {
    signupRewards: PropTypes.object,
}
