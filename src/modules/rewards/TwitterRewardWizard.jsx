import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { Step } from 'semantic-ui-react'
import { BehaviorSubject } from 'rxjs'
import { TYPES, validate } from '../../utils/validator'
import FormBuilder from '../../components/FormBuilder'
import { translated } from '../../utils/languageHelper'
import { closeModal, confirm, showForm } from '../../services/modal'
import client from '../../utils/chatClient'
import { generateCrowdloanTweet } from './rewards'

const textsCap = translated({
    step1: 'follow Totem on Twitter',
    step1Desc: `follow Totem's official account on Twitter`,
    step1Confirm: 'You will be taken to Twitter.com. Click on the follow button and then return to this page.',

    step2: 'post a Tweet',
    step2Confirm: 'you will be taken to',
    step2ConfirmP1: 'Press Tweet!',
    step2ConfirmP2: 'Copy the Tweet link.',
    step2ConfirmP3: 'Return to this page and paste the link in the "Tweet ID/Link field"',
    step2ConfirmWarn: 'To qualify for the reward, we recommend not changing the text.',
    step2Desc: 'help spread the word about Totem',
    tweetSubmitText: 'Tweet now',
    twHandleLabel: 'Twitter handle/username',
    twHandleLabelDetails: 'Please make sure that this is the same account you are logged in on Twitter.com',
    twHandlePlaceholder: 'enter your twitter handle',

    step3: 'claim reward',
    step3Desc: 'this reward is no longer available', //'to qualify for this reward you must complete both of the steps above',
    step3DescAlt: 'You will not receive any rewards for this Tweet.',
    claimSubmitText: 'claim reward',
    requestReceived: 'You request has been received. You will receive a notification from @rewards once your request has been processed.',
    tweetIdLabel: 'Tweet ID/Link',
    tweetIdPlaceholder: 'Paste your Tweet link/ID here',
    tweetIdLabelDetails: 'Go to the Tweet you posted on the step 2. Copy ID or URL of the Tweet and paste it below.',
}, true)[1]

export default function TwitterRewardWizard(props) {
    const { completed } = props
    const [activeStep, setActiveStep] = useState(0)
    const [rxTwitterHandle] = useState(() => new BehaviorSubject(''))
    const handleFollow = twitterHandle => () => {
        const url = `https://twitter.com/intent/follow?screen_name=${twitterHandle}`
        window.open(url, '_blank')
        setActiveStep(1)
        // onClickHandlers[1]()
    }
    const onClickHandlers = [
        () => {
            const formProps = {
                header: textsCap.step2,
                subheader: textsCap.step2Desc,
                submitText: textsCap.tweetSubmitText,
                inputs: [
                    // {
                    //     icon: 'at',
                    //     iconPosition: 'left',
                    //     minLength: 3,
                    //     maxLength: 15,
                    //     name: 'twHandle',
                    //     label: textsCap.twHandleLabel,
                    //     labelDetails: textsCap.twHandleLabelDetails,
                    //     placeholder: textsCap.twHandlePlaceholder,
                    //     required: true,
                    //     rxValue: rxTwitterHandle,
                    //     type: 'text',
                    //     validate: (_, { value }) => value && value.includes('@')
                    // }
                    {
                        content: (
                            <div>
                                <b style={{ color: 'red' }}>{textsCap.step3DescAlt}</b>
                            </div>
                        ),
                        name: 'html',
                        type: 'html',
                    }
                ],
                onSubmit: (_, { twHandle }) => {
                    closeModal(modalId)
                    const tweetText = encodeURIComponent(
                        generateCrowdloanTweet()
                    )
                    const url = `https://twitter.com/intent/tweet?button_hashtag=share&text=${tweetText}`
                    window.open(url, '_blank')
                    rxTwitterHandle.next(twHandle)
                    // setActiveStep(2)
                    // onClickHandlers[2]()

                    // confirm({
                    //     content: (
                    //         <div>
                    //             {textsCap.step2Confirm} Twitter.com
                    //             <ul>
                    //                 <li>
                    //                     {textsCap.step2ConfirmP1}
                    //                     <b style={{ color: 'red' }}> {textsCap.step2ConfirmWarn}</b>
                    //                 </li>
                    //                 <li>{textsCap.step2ConfirmP2}</li>
                    //                 <li>{textsCap.step2ConfirmP3}</li>
                    //             </ul>
                    //         </div>
                    //     ),
                    //     size: 'tiny',
                    //     onConfirm: onConfirm
                    // })
                }
            }
            const modalId = showForm(FormBuilder, formProps)
        },
        handleFollow('totem_live_'),
        // () => confirm({
        //     header: textsCap.step1,
        //     content: textsCap.step1Confirm,
        //     size: 'mini',
        //     onConfirm: () => {
        //         const url = 'https://twitter.com/intent/follow?screen_name=totem_live_'
        //         window.open(url, '_blank')
        //         setActiveStep(1)
        //         onClickHandlers[1]()
        //     }
        // }),
        () => {
            // const rxValue = new BehaviorSubject('')
            // const formProps = {
            //     header: textsCap.step3,
            //     subheader: textsCap.step3Desc,
            //     submitText: textsCap.claimSubmitText,
            //     inputs: [
            //         {
            //             customMessages: { regex: '' }, // mark as invalid but don't show the default error message
            //             name: 'tweetId',
            //             label: textsCap.tweetIdLabel,
            //             labelDetails: textsCap.tweetIdLabelDetails,
            //             // if link pasted, only keep the tweet id
            //             onPaste: e => setTimeout(() => {
            //                 const { value = '' } = rxValue
            //                 const isValidUrl = !validate(value, { type: TYPES.url })
            //                 if (!isValidUrl) return

            //                 const [_, twitterHandle, _2, tweetId] = new URL(value)
            //                     .pathname
            //                     .split('/')

            //                 !rxTwitterHandle.value && rxTwitterHandle.next(twitterHandle)
            //                 rxValue.next(tweetId || '')
            //             }, 50),
            //             placeholder: textsCap.tweetIdPlaceholder,
            //             regex: /^[0-9]{19}$/,
            //             required: true,
            //             rxValue,
            //             type: 'text',
            //         },
            //         {
            //             icon: 'at',
            //             iconPosition: 'left',
            //             minLength: 3,
            //             maxLength: 15,
            //             name: 'twHandle',
            //             label: textsCap.twHandleLabel,
            //             placeholder: textsCap.twHandlePlaceholder,
            //             required: true,
            //             rxValue: rxTwitterHandle,
            //             type: 'text',
            //             validate: (_, { value }) => value && value.includes('@')
            //         },
            //     ],
            //     onSubmit: async (_, { tweetId, twHandle }) => {
            //         // re-render modal form with loading spinner on the submit button
            //         formProps.submitInProgress = true
            //         formProps.message = null
            //         showForm(FormBuilder, formProps, modalId)

            //         try {
            //             await client.rewardsClaim(
            //                 'twitter',
            //                 twHandle
            //                     .split('@')
            //                     .join('')
            //                     .trim()
            //                     .toLowerCase(),
            //                 tweetId,
            //             )
            //             formProps.success = true
            //             formProps.message = {
            //                 content: textsCap.requestReceived,
            //                 status: 'warning',
            //             }
            //             setActiveStep(3)
            //         } catch (err) {
            //             formProps.message = {
            //                 content: `${err}`,
            //                 status: 'error',
            //             }
            //         } finally {
            //             formProps.submitInProgress = false
            //             showForm(FormBuilder, formProps, modalId)
            //         }
            //     }
            // }
            // let modalId = showForm(FormBuilder, formProps)
        }
    ]

    const steps = [
        {
            completed,
            description: textsCap.step2Desc,
            title: textsCap.step2,
        },
        {
            completed,
            description: textsCap.step1Desc,
            title: textsCap.step1,
        },
        {
            completed,
            disabled: true,
            description: <b style={{ color: 'red' }}>{textsCap.step3Desc}</b>,
            title: textsCap.step3,
        },
    ]
    return (
        <Step.Group ordered vertical
            style={{ textAlign: 'center' }}>
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
TwitterRewardWizard.propTypes = {
    completed: PropTypes.bool,
}
