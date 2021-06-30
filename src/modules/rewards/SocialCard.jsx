import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { Card, Icon, Step } from 'semantic-ui-react'
import Text from '../../components/Text'
import { className, isDefined } from '../../utils/utils'
import { translated } from '../../services/language'
import { confirm } from '../../services/modal'
import { useRxSubject } from '../../services/react'
import { MOBILE, rxLayout, useInverted } from '../../services/window'
import Currency, { currencyDefault } from '../currency/Currency'
import DiscordRewardWizard from './DiscordRewardWizard'
import TwitterRewardWizard from './TwitterRewardWizard'

const textsCap = translated({
    comingSoon: 'coming soon',
    desc: 'you can earn $TOTEM by following and sharing about Totem social media platforms. The steps below will guide you through the process.',
    header: 'social rewards',
    reward: 'reward',
    step1Title: 'Twitter',
    step2Title: 'Discord',
    step3Title: 'Telegram',
    totalEarned: 'total earned',
}, true)[1]

export default function SocialCard({ signupReward = {} }) {
    const isMobile = useRxSubject(rxLayout, l => l === MOBILE)[0]
    const inverted = useInverted()
    let [activeStep, setActiveStep] = useState()

    const { discordReward = {}, telegramReward = {}, twitterReward = {} } = signupReward
    const total = [discordReward, telegramReward, twitterReward]
        .reduce((sum, { amount = 0 }) => sum + amount, 0)
    const completed = [discordReward, telegramReward, twitterReward]
        .every(({ amount }) => !!amount)

    const steps = [
        {
            completed: twitterReward.amount > 0,
            content: <TwitterRewardWizard completed={twitterReward.amount > 0} />,
            title: textsCap.step1Title,
        },
        {
            completed: discordReward.amount > 0,
            // content: !discordReward.amount && <DiscordRewardWizard />,
            title: textsCap.step2Title,
        },
        {
            completed: telegramReward.amount > 0,
            title: textsCap.step3Title,
        },
    ]
    if (!isDefined(activeStep)) {
        activeStep = steps.findIndex(x => !x.completed)
    }

    const content = (
        <div>
            <p>{textsCap.desc}</p>
            <Step.Group fluid={isMobile} style={{ width: !isMobile ? 493 : '' }}>
                {steps.map(({ completed, content, description, disabled, title }, index) => (
                    <Step {...{
                        active: !completed && activeStep === index,
                        completed,
                        disabled: disabled || completed,
                        key: index,
                        onClick: () => {
                            !content && confirm({
                                cancelButton: null,
                                content: textsCap.comingSoon,
                                header: `${title} ${textsCap.reward}`,
                                size: 'mini',
                            })
                            !completed && setActiveStep(index)
                        },
                    }}>
                        <Step.Content>
                            <Step.Title>
                                {completed && (
                                    <Icon {...{
                                        className: 'no-margin',
                                        color: 'green',
                                        name: 'check',
                                        size: 'large'
                                    }} />
                                )}
                                {title}
                            </Step.Title>
                            {description && (
                                <Step.Description>
                                    {description}
                                </Step.Description>
                            )}
                        </Step.Content>
                    </Step>
                )).filter(Boolean)}
            </Step.Group>
            <div>{(steps[activeStep] || {}).content}</div>
        </div >
    )
    return (
        <Card {...{
            fluid: true,
            className: className({ inverted }),
        }}>
            <Card.Content {...{
                header: (
                    <Text className='header'>
                        <Icon name={
                            completed
                                ? 'check'
                                : total > 0
                                    ? 'play'
                                    : 'hand point right'} />
                        {textsCap.header}
                    </Text>
                ),
                className: className({ inverted }),
            }} />
            <Card.Content description={content} />
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
SocialCard.propTypes = {
    signupRewards: PropTypes.object,
}
