import React from 'react'
import PropTypes from 'prop-types'
import { Card, Icon } from 'semantic-ui-react'
import { className } from '../../utils/utils'
import Text from '../../components/Text'
import { translated } from '../../utils/languageHelper'
import { useInverted } from '../../services/window'
import Currency from '../currency/Currency'
import { currencyDefault } from '../currency/currency'

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
