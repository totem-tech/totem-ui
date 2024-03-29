import PropTypes from 'prop-types'
import React from 'react'
import { Card, Icon } from 'semantic-ui-react'
import Text from '../../components/Text'
import { translated } from '../../utils/languageHelper'
import { className } from '../../utils/utils'
import { useInverted } from '../../utils/window'
import { currencyDefault } from '../currency/currency'
import Currency from '../currency/Currency'

const textsCap = translated({
    header: 'signup rewards',
    totalEarned: 'total earned',
}, true)[1]

export default function SignupCard({ signupReward }) {
    const inverted = useInverted()
    const { amount } = signupReward || {}
    if (!amount) return ''

    const header = (
        <Text className='header'>
            <Icon name={amount > 0 ? 'check' : 'play'} />
            {textsCap.header}
        </Text>
    )
    return (
        <Card {...{
            fluid: true,
            className: className({ inverted }),
        }}>
            <Card.Content {...{
                header,
                className: className({ inverted }),
            }} />
            <Card.Content extra>
                <Text>
                    <Icon name='money' />
                    <Currency {...{
                        key: amount,
                        title: textsCap.totalEarned,
                        unit: currencyDefault,
                        value: amount || 0,
                    }} />
                </Text>
            </Card.Content>
        </Card>
    )
}
