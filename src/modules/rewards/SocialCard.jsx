import PropTypes from 'prop-types'
import React, { useState } from 'react'
import {
    Card,
    Icon,
    Step
} from 'semantic-ui-react'
import Text from '../../components/Text'
import { confirm } from '../../services/modal'
import { translated } from '../../utils/languageHelper'
import { useRxSubject } from '../../utils/reactjs'
import { className, isDefined } from '../../utils/utils'
import {
    MOBILE,
    rxLayout,
    useInverted
} from '../../utils/window'
import Currency from '../currency/Currency'
import { currencyDefault } from '../currency/currency'
import DiscordRewardWizard from './DiscordRewardWizard'
import TwitterRewardWizard from './TwitterRewardWizard'
import { markNewsleterDone, useRewards } from './rewards'
import NewsletteSignup from '../../forms/NewsletterSignup'
import Decoded2206Wizard from './Decoded2206Wizard'

const textsCap = translated({
    comingSoon: 'coming soon',
    desc: 'you can earn $TOTEM by following and sharing about Totem social media platforms. The steps below will guide you through the process.',
    header: 'social rewards',
    reward: 'reward',
    step1Title: 'Twitter',
    step2Title: 'Discord',
    step3Title: 'Telegram',
    step4Title: 'signup for announcements',
    totalEarned: 'total earned',
}, true)[1]

export default function SocialCard({ socialRewards = {} }) {
    const isMobile = useRxSubject(rxLayout, l => l === MOBILE)[0]
    const inverted = useInverted()
    let [activeStep, setActiveStep] = useState()

    const {
        decoded2206 = {},
        discord = {},
        newsletter = false,
        telegram = {},
        twitter = {},
    } = socialRewards
    const total = [decoded2206, discord, telegram, twitter]
        .reduce((sum, { amount = 0 }) => sum + amount, 0)
    const completed = [discord, telegram, twitter]
        .every(({ amount }) => !!amount)
    const steps = [
        {
            completed: twitter.amount > 0,
            content: <TwitterRewardWizard completed={twitter.amount > 0} />,
            title: textsCap.step1Title,
        },
        {
            completed: newsletter,
            content: (
                <NewsletteSignup {...{
                    onSubmit: ok => {
                        if (!ok) return
                        markNewsleterDone()
                        setActiveStep(activeStep + 1)
                    },
                    style: {
                        maxWidth: 450
                    },
                }} />
            ),
            title: textsCap.step4Title,
        },
        // {
        //     completed: discord.amount > 0,
        //     // content: !discordReward.amount && <DiscordRewardWizard />,
        //     title: textsCap.step2Title,
        // },
        // {
        //     completed: telegram.amount > 0,
        //     title: textsCap.step3Title,
        // },
        {
            completed: decoded2206.amount > 0,
            content: <Decoded2206Wizard completed={decoded2206.amount > 0} />,
            disabled: true,
            title: 'Polkadot Decoded 2022',
        },
    ]
    if (!isDefined(activeStep)) {
        activeStep = steps.findIndex(x => !x.completed)
    }

    const content = (
        <div>
            <p>{textsCap.desc}</p>
            <Step.Group fluid={isMobile}>
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
    socialRewards: PropTypes.object,
}


