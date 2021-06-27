import React, { useState } from 'react'
import { Button, Step } from 'semantic-ui-react'
import { BehaviorSubject } from 'rxjs'
import FormBuilder from '../../components/FormBuilder'
import { translated } from '../../services/language'
import { closeModal, confirm, showForm } from '../../services/modal'
import client from '../chat/ChatClient'
import { generateSignupTweet } from './rewards'
import { TYPES, validate } from '../../utils/validator'
import { addToQueue, QUEUE_TYPES } from '../../services/queue'

const textsCap = translated({
    step1: 'follow Totem on Twitter',
    step1Desc: 'You will be redirected to Twitter.com. Click on the follow button and then return to this page.',

    step2: 'post a Tweet',
    step2Desc1: 'Let your friends know about Totem by posting a Tweet using our template that includes your referral link.',
    step2Desc2: 'Anyone who joins Totem by clicking on the link will automatically get you more rewards.',
    tweetConfirmText: 'You will now be taken to Twitter.com. Please click on the Tweet button and return to this page. To make sure your Tweet qualifies for reward, please do not change any of the texts.',
    tweetSubmitText: 'Tweet now',
    twHandleLabel: 'Twitter handle/username',
    twHandleLabelDetails: 'Please make sure that this is the same account you are logged in on Twitter.com',
    twHandlePlaceholder: 'enter your twitter handle',

    step3: 'claim reward',
    step3Desc: 'To qualify for this reward you must follow both of the above steps.',
    claimSubmitText: 'claim reward',
    tweetIdLabel: 'Tweet ID',
    tweetIdLabelDetails: 'Go to the Tweet you posted on the step 2. Copy ID or URL of the Tweet and paste it below.',
}, true)[1]

export default function TwitterRewardWizard(props) {
    const [activeStep, setActiveStep] = useState(0)
    const [twitterHandle, setTwitterHandle] = useState('')

    const steps = [
        {
            as: 'div',
            description: textsCap.step1Desc,
            onClick: () => {
                const url = 'https://twitter.com/intent/follow?screen_name=totem_live_'
                window.open(url, '_blank')
                setActiveStep(1)
            },
            title: textsCap.step1,
        },
        {
            description: (
                <div>
                    <p>{textsCap.step2Desc1}</p>
                    <p>{textsCap.step2Desc2}</p>
                </div>
            ),
            title: textsCap.step2,
            onClick: () => {
                const formProps = {
                    submitText: textsCap.tweetSubmitText,
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
                            value: twitterHandle,
                        }
                    ],
                    onSubmit: (_, { twHandle }) => {
                        confirm({
                            content: textsCap.tweetConfirmText,
                            size: 'mini',
                            onConfirm: () => {
                                closeModal(modalId)
                                const tweetText = encodeURIComponent(
                                    generateSignupTweet(twHandle)
                                )
                                const url = `https://twitter.com/intent/tweet?button_hashtag=share&text=${tweetText}`
                                window.open(url, '_blank')
                                setTwitterHandle(twHandle)
                                setActiveStep(2)
                            }
                        })
                    }
                }
                const modalId = showForm(FormBuilder, formProps)
            },
        },
        {
            description: textsCap.step3Desc,
            title: textsCap.step3,
            onClick: () => {
                const rxValue = new BehaviorSubject('')
                const formProps = {
                    submitText: textsCap.claimSubmitText,
                    inputs: [
                        {
                            icon: 'at',
                            iconPosition: 'left',
                            minLength: 3,
                            maxLength: 15,
                            name: 'twHandle',
                            label: textsCap.twHandleLabel,
                            placeholder: textsCap.twHandlePlaceholder,
                            required: true,
                            type: 'text',
                            value: twitterHandle,
                        },
                        {
                            name: 'tweetId',
                            label: textsCap.tweetIdLabel,
                            labelDetails: textsCap.tweetIdLabelDetails,
                            onPaste: e => setTimeout(() => {
                                const url = rxValue.value
                                if (!url) return

                                const err = validate(url, { type: TYPES.url })
                                if (err) return
                                const id = (url.split('/status/')[1]
                                    .match(/[0-9]/g) || [])
                                    .join('')
                                if (!id) return
                                rxValue.next(id)
                            }, 50),
                            placeholder: '12345',
                            required: true,
                            rxValue,
                            type: 'text',
                        }
                    ],
                    onSubmit: async (_, { tweetId, twHandle }) => {
                        // re-render modal form with loading spinner on the submit button
                        // formProps.submitInProgress = true
                        // formProps.message = null
                        // showForm(FormBuilder, formProps, modalId)

                        try {
                            const result = await client.rewardsClaim.promise(
                                'twitter',
                                twHandle,
                                tweetId,
                            )
                            console.log({ result })
                        } catch (err) {
                            formProps.submitInProgress = false
                            formProps.message = { content: `${err}` }
                            showForm(FormBuilder, formProps, modalId)
                        }
                    }
                }
                let modalId = showForm(FormBuilder, formProps)
            }
        },
    ]
    return (
        <Step.Group ordered vertical>
            {steps.map(({ description, disabled, onClick, title }, index) => (
                <Step {...{
                    active: activeStep === index,
                    completed: activeStep > index,
                    key: index,
                    onClick,
                }}>
                    <Step.Content>
                        <Step.Title>{title}</Step.Title>
                        {activeStep === index && (
                            <Step.Description>
                                {description}
                            </Step.Description>
                        )}
                    </Step.Content>
                </Step>
            )).filter(Boolean)}
        </Step.Group>
    )
}
