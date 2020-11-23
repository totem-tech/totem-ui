import React from 'react'
import { Accordion, Button } from 'semantic-ui-react'
import { translated } from '../../services/language'
import { closeModal, confirm, showForm } from '../../services/modal'
import { isFn } from '../../utils/utils'
import { getInboxKey, rxOpenInboxKey, rxVisible, SUPPORT } from '../chat/chat'
import CalculatorForm from './CalculatorForm'

const textsCap = translated({
    calculator: 'calculator',
    contactSupport: 'contact support',
    faqs: 'Frequently asked questions',
}, true)[1]

//ToDo: translate
const questions = [
    {
        answer: 'You have already whitelisted or been assigned a deposit address for you chosen Blockchain. Simply, use your prefered wallet application for the Blockchain and transfer the amount you wish to contribute to the address assigned to you. To view the list of addresses you have been assigned and/or request for a new address on a different Blockchain please check out the address list in the crowdsale module.',
        question: 'How do I make a deposit?',
    },
    {
        answer: 'Once you have made a deposit, it needs to reach a minimum number of network confirmations before our system will accept this as a valid deposit. Please make sure to click on the check deposit status button to tell our system that your deposit transaction has the required number of confirmations. Only then you will receive the allocation for all your valid deposits. You will be able to view your processed deposited amounts in the crowdsale module.',
        question: 'I have already made a deposit. What to do next?',
    },
    {
        answer: 'Yes, absolutely! You can deposit as many times as you wish before the crowdsale period ends. The more you deposit the higher multiplier level you will achieve.',
        question: 'I have already made a deposit. Can I deposit again?',
    },
    {
        answer: 'Contributed values represents the total amount deposited across all Blockchains converted to base level without any multiplier in Transactions (XTX), the Totem native currency.',
        question: 'What does contributed value mean?',
    },
    {
        answer: 'The allocated value is the total amount in Transactions (XTX) after your multiplier number has been applied.',
        question: 'What does allocated value mean?',
    },
    {
        answer: 'Each multiplier level represents a number that will be used to multiply your contribution. The higher your contribution is, the higher multiplier level you will achieve. For example: if you deposit X amount and you achive a multiplier level with a multiplier number of Y, you will receive an allocation A = X * Y.',
        question: 'What does multiplier level mean?',
    },
    {
        answer: 'You will be given a multiplier level based on the total amount you have deposited across all supported Blockchains. The more you deposit the higher multiplier level you will achieve.',
        question: 'How to achieve a higher multiplier level?'
    },
    {
        answer: 'Sure! You can request for (or whitelist in case of Ethereum) a deposit address for each of the supported Blockchains.',
        question: 'Can I deposit from multiple Blockchains?'
    },
    {
        answer: 'Your multiplier will be based on the total amount you have deposited across all supported Blockchains. Use the calculator, to get an estimation on how much allocation you will receive for your desired deposit amount.',
        action: {
            icon: 'calculator',
            content: textsCap.calculator,
            onClick: () => showForm(CalculatorForm),
        },
        question: 'What happens when I deposit from multiple Blockchains?'
    },
    {
        answer: 'You can use our built-in support chat mechanism to get in touch with us. Leave us a message with your questions and someone will get back to you as soon as possible. Please note that, due to timezone differences it may take a few hours for us to respond to you. While we aim to get back to you within 24 hours or 48 hours at most, it may not always be possible. We appreciate your patience!',
        action: {
            as: 'div',
            content: textsCap.contactSupport,
            icon: 'heartbeat',
            key: 'button',
            onClick: () => {
                rxVisible.next(true)
                rxOpenInboxKey.next(getInboxKey([SUPPORT]))
            }
        },
        question: 'How do I contact support?',
    },
]


export const showFaqs = (props) => {
    const modalId = confirm(
        {
            cancelButton: null,
            confirmButton: null,
            ...props,
            header: props.header || textsCap.faqs,
            content: (
                <div>
                    {props.content}
                    <Accordion {...{
                        fluid: true,
                        panels: questions
                            .map(({ action, answer,  question }, i) => ({
                                key: `panel-${i}`,
                                title: question,
                                content: [
                                    <div key='answer'>{answer}</div>,
                                    action && (
                                        <Button {...{
                                            ...action,
                                            key: 'action',
                                            onClick: (...args) => {
                                                isFn(action.onClick) && action.onClick(...args)
                                                closeModal(modalId)
                                            }
                                        }} />
                                    ),
                                ].filter(Boolean),
                            })),
                        styled: true,
                    }} />
                </div>
            ),
        },
        null,
        { style: { padding: 0 } }
    )
}