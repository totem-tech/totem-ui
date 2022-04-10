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
    step3Desc: 'vote for Totem\'s Polkadot Decoded tech talk by the founder',
    step4: 'claim reward',
    step4Desc: 'to qualify for this reward you must complete all of the steps above',
    step4Confirm1: 'you will be taken to',
    step4Confirm2: 'wait for the page to load completely',
    step4Confirm3: 'select the talk titled',
    step4Confirm4: 'vote now',
    step4Confirm5: 'i have voted',
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
                confirmButton: textsCap.step4Confirm4,
                content: (
                    <div>
                        {textsCap.step4Confirm1} decoded.polkadot.network

                        <ol>
                            <li>{textsCap.step4Confirm2}</li>
                            <li>{textsCap.step4Confirm3} <b>"Get Your Parachain Production Ready"</b></li>
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
                        !linkOpened && 'https://decoded.polkadot.network/vote/?search=Chris%20DCosta%20Get%20Your%20Parachain%20Production%20Ready'
                    )()
                    if (!linkOpened) {
                        linkOpened = true
                        confirmProps.confirmButton = textsCap.step4Confirm5
                        confirm(confirmProps, modalId)
                    }
                }
            }
            
            confirm(confirmProps, modalId)
        },
        () => {
            let modalId
            const formProps = {
                header: textsCap.step4,
                subheader: textsCap.step4Desc,
                submitText: textsCap.step4,
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
            disabled: completed,
            description: textsCap.step4Desc,
            title: textsCap.step4,
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

