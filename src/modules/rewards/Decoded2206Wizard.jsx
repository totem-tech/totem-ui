// Follow founders and vote Polkadot Decoded talk: 
import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { Step } from 'semantic-ui-react'
import { BehaviorSubject } from 'rxjs'
import { TYPES, validate } from '../../utils/validator'
import FormBuilder from '../../components/FormBuilder'
import { translated } from '../../services/language'
import { closeModal, confirm, showForm } from '../../services/modal'
import client from '../chat/ChatClient'
import { generateSignupTweet, getRewards } from './rewards'
import { isFn } from '../../utils/utils'

const [texts, textsCap] = translated({
    button: 'button',
    press: 'click on',
    step1: 'follow founder',
    step1Desc: 'follow Chris D\'Costa on Twitter',
    step1Confirm: 'You will be taken to Twitter.com. Click on the follow button and then return to this page.',
    step2: 'follow co-founder',
    step2Desc: 'follow Toufiqur R Chowdhury on Twitter',
    step3: 'vote for Polkadot Decoded talk',
    step3Desc: 'vote for Totem\'s Polkadot Decoded tech talk (under workshop category) by the founder',
    step4: 'post a Tweet',
    step4Desc: 'speard the word',
    step5: 'claim reward',
    step5Desc: 'this reward is no longer available',
    step5Confirm1: 'you will be taken to',
    step5Confirm2: 'wait for the page to load completely',
    step5Confirm3: 'select the talk titled',
    step5Confirm4: 'vote now',
    step5Confirm5: 'i have voted',
    successMsgHeader: 'request submitted',
    successMsgContent: 'your request will be validated and rewards will be processed in the coming weeks',
    twHandleLabel: 'Twitter handle/username',
    twHandleLabelDetails: 'Please make sure that this is the same account you are logged in on Twitter.com',
    twHandlePlaceholder: 'enter your twitter handle',
}, true)

export default function Decoded2206Wizard(props) {
    const { completed } = props
    const [activeStep, setActiveStep] = useState(0)
    const setStepCb = (stepIndex, url) => () => {
        setActiveStep(stepIndex)
        const handler = onClickHandlers[stepIndex]
        isFn(handler) && handler()
        url && window.open(url, '_blank')
    }
    const urlVote = 'https://decoded.polkadot.network/vote/?search=Chris%20DCosta'
    const tweetText = encodeURIComponent(
        'Less than 48 hours left to vote for talks and topics submitted for #PolkadotDecoded 2022 and help decide the final program of the biggest Polkadot event of the year.'
        + '\n\nSupport your favorite speakers by voting now: \n'
        + urlVote
        + '\n\n $totem #polkadot #dotsama @totem_live_'
    )
    const tweetUrl = `https://twitter.com/intent/tweet?button_hashtag=share&text=${tweetText}`
    const onClickHandlers = [
        () => confirm({
            header: textsCap.step1,
            content: textsCap.step1Confirm,
            size: 'mini',
            onConfirm: setStepCb(1, 'https://twitter.com/intent/follow?screen_name=cjdcosta'),
        }),
        () => confirm({
            header: textsCap.step2,
            content: textsCap.step1Confirm,
            size: 'mini',
            onConfirm: setStepCb(2, 'https://twitter.com/intent/follow?screen_name=toufiq_dev')
        }),
        () => {
            let modalId = 'confirm-vote'
            let linkOpened = false
            const confirmProps = {
                confirmButton: textsCap.step5Confirm4,
                content: (
                    <div>
                        {textsCap.step5Confirm1} decoded.polkadot.network

                        <ol>
                            <li>{textsCap.step5Confirm2}</li>
                            <li>{textsCap.step5Confirm3} <b>"Get Your Parachain Production Ready"</b></li>
                            <li>{textsCap.press} <b>"Finalize vote"</b> {texts.button}</li>
                            <li>{textsCap.press} <b>"Vote now"</b> {texts.button}</li>
                            <li>{textsCap.press} <b>"Submit"</b> {texts.button}</li>
                        </ol>
                    </div>
                ),
                header: textsCap.step3,
                size: 'mini',
                onConfirm: () => {
                    setStepCb(
                        !linkOpened ? 2 : 3,
                        !linkOpened && urlVote
                    )()
                    if (!linkOpened) {
                        linkOpened = true
                        confirmProps.confirmButton = textsCap.step5Confirm5
                        // reopen modal with updated props
                        setTimeout(() => confirm(confirmProps, modalId))
                    }
                }
            }
            
            confirm(confirmProps, modalId)
        },
        setStepCb(4, tweetUrl),
        () => {
            let modalId
            const formProps = {
                header: textsCap.step5,
                subheader: textsCap.step5Desc,
                submitText: textsCap.step5,
                inputs: [
                    {
                        icon: 'at',
                        iconPosition: 'left',
                        minLength: 3,
                        maxLength: 15,
                        name: 'twHandle',
                        label: textsCap.twHandleLabel,
                        labelDetails: textsCap.twHandleLabelDetails,
                        placeholder: textsCap.twHandlePlaceholder,
                        required: true,
                        type: 'text',
                        validate: (_, { value }) => value && value.includes('@')
                    }
                ],
                onSubmit: async (_, { twHandle }) => {
                    // set loading
                    updateForm(true, false, null)

                    const err = await client
                        .rewardsClaim
                        .promise('polkadot-decoded', twHandle, 'decoded2206-dummyId')
                        .catch(err => err)
                    
                    // set success or error message
                    updateForm(false, !err, {
                        content: err || textsCap.successMsgContent,
                        header: !err && textsCap.successMsgHeader,
                        icon: true,
                        status: err ? 'error': 'success',
                    })
                    !err && getRewards()
                }
            }
            const updateForm = (inprogress = false, success, message) => {
                formProps.submitInProgress = inprogress
                formProps.success = success
                formProps.message = message
                modalId = showForm(FormBuilder, formProps, modalId)
            }
            updateForm()
        },
    ]

    const steps = [
        {
            completed,
            description: textsCap.step1Desc,
            title: textsCap.step1,
        },
        {
            completed,
            description: textsCap.step2Desc,
            title: textsCap.step2,
        },
        {
            completed,
            disabled: completed,
            description: `${textsCap.step3Desc} Chris D'Costa`,
            title: textsCap.step3,
        },
        {
            completed,
            disabled: true,
            description: textsCap.step4Desc,
            title: textsCap.step4,
        },
        {
            completed,
            disabled: true,
            description: <b style={{ color: 'red' }}>{textsCap.step5Desc}</b>,
            title: textsCap.step5,
        },
    ]
    return (
        <Step.Group ordered vertical>
            {steps.map(({ completed, description, disabled, title }, index) => (
                <Step {...{
                    active: activeStep === index,
                    completed: completed || activeStep > index,
                    disabled,
                    key: index,
                    onClick: onClickHandlers[index],
                }}>
                    <Step.Content>
                        <Step.Title>{title}</Step.Title>
                        {/* {activeStep === index && ( */}
                        <Step.Description>
                            {description}
                        </Step.Description>
                        {/* )} */}
                    </Step.Content>
                </Step>
            )).filter(Boolean)}
        </Step.Group>
    )
}
Decoded2206Wizard.propTypes = {
    completed: PropTypes.bool,
}

