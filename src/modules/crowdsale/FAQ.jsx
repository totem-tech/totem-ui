import React from 'react'
import { Accordion, Button } from 'semantic-ui-react'
import Text from '../../components/Text'
import { translated } from '../../services/language'
import { closeModal, confirm, showForm } from '../../services/modal'
import { isArr, isFn, isObj, isStr } from '../../utils/utils'
import { getInboxKey, rxOpenInboxKey, rxVisible, SUPPORT } from '../chat/chat'
import CalculatorForm from './CalculatorForm'

const textsCap = translated({
    calculator: 'calculator',
    contactSupport: 'contact support',
    faqs: 'Frequently asked questions',
}, true)[1]

// Translation of `answer` and `question` properties have been done using translateFAQs() resursively
const calculatorBtn = {
    icon: 'calculator',
    content: textsCap.calculator,
    onClick: () => showForm(CalculatorForm),
}
const questions = [
    {
        active: true,
        question: 'Making deposits',
        children: [
            {
                question: 'How do I make a deposit?',
                answer: `
                    You have already whitelisted or been assigned a deposit address for you chosen Blockchain. Simply, use your prefered wallet application for the Blockchain and transfer the amount you wish to contribute to the address assigned to you. To view the list of addresses you have been assigned and/or request for a new address on a different Blockchain please check out the address list in the crowdsale module.
                `,
            },
            {
                question: 'How many confirmations?',
                answer: {
                    line1: `
                        With any cryptocurrency payment, there are factors that can mean that your funds are not immediately allocated, perhaps because the funds were not included in a block in a timely manner.
                    `,
                    line2: `
                        In our registration form you will be required to click to confirm that funds have been sent and from that point on we will monitor the blockchains for your funds. This is an automated process and your funds should be credited within 24 hours following at least 12 confirmations on any network.
                    `,
                    line3: `
                        If your funds are not credited after 24 hours, you can trigger a further manual status check in the registration form.
                    `,
                },
                render: (answer) => (
                    <div>
                        <div>{answer.line1}</div>
                        <br />
                        <div>{answer.line2}</div>
                        <br />
                        <div>{answer.line3}</div>
                    </div>
                )
            },
            {
                question: 'I have already made a deposit. What to do next?',
                answer: `
                    Once you have made a deposit, it needs to reach a minimum number of network confirmations before our system will accept this as a valid deposit. Please make sure to click on the check deposit status button to tell our system that your deposit transaction has the required number of confirmations. Only then you will receive the allocation for all your valid deposits. You will be able to view your processed deposited amounts in the crowdsale module.
                `,
            },
            {
                question: 'I have already made a deposit. Can I deposit again?',
                answer: `
                    Yes, absolutely! You can deposit as many times as you wish before the crowdsale period ends. The more you deposit the higher multiplier level you will achieve.
                `,
            },
            {
                question: 'I have not received allocation for my deposit! What do I do?',
                answer: 'First of make sure that your deposit transaction has the minimum number of required confirmations. Once you have the confirmations required, go to the crowdsale module and click on the "check deposit status" button.',
            },
            {
                question: 'What does contributed value mean?',
                answer: `
                    Contributed values represents the total amount deposited across all Blockchains converted to base level without any multiplier in Transactions (XTX), the Totem native currency.
                `,
            },
            {
                question: 'What does allocated value mean?',
                answer: `
                    The allocated value is the total amount in Transactions (XTX) after your multiplier number has been applied.
                `,
            },
            {
                question: 'What does multiplier level mean?',
                answer: `
                    Each multiplier level represents a number that will be used to multiply your contribution. The higher your contribution is, the higher multiplier level you will achieve. For example: if you deposit X amount and you achive a multiplier level with a multiplier number of Y, you will receive an allocation A = X * Y.
                `,
            },
            {
                question: 'How to achieve a higher multiplier level?',
                answer: `
                    You will be given a multiplier level based on the total amount you have deposited across all supported Blockchains. The more you deposit the higher multiplier level you will achieve.
                `,
            },
            {
                question: 'Can I deposit from multiple Blockchains?',
                answer: `
                    Sure! You can request for (or whitelist in case of Ethereum) a deposit address for each of the supported Blockchains.
                `,
            },
            {
                question: 'What happens when I deposit from multiple Blockchains?',
                answer:
                    `Your multiplier will be based on the total amount you have deposited across all supported Blockchains.Use the calculator, to get an estimation on how much allocation you will receive for your desired deposit amount.
                `,
                action: calculatorBtn,
            },
            {
                question: 'When will my total allocations be calculated?',
                answer: 'Soon after our system detects your confirmed deposit, you will recieve your allocation which will be locked until after the Crowdsale is finished. At the end of the Crowdsale we will do a final calculation to make sure all your deposits are accounted for.',
            },
            {
                question: 'How do I calculate how much allocation I will receive?',
                answer: 'User our calculator to find out an estimate of how much you will receive. The calculator will account for the confirmed deposits you have already made and the new amount you wish to deposit.',
                action: calculatorBtn,
            },
        ],
    },
    {
        question: 'Post-Crowdsale FAQs',
        children: [
            {
                question: 'What happens if I pay after the Crowdsale is closed?',
                answer: `
                    You contributions will be counted, but you will not achieve multiplier levels, no matter how much you have contributed. It will be allocated at the base allocation level for the cryptocurrrency you paid with.
                `,
            },
            {
                question: 'Can I sell XTX after the Crowdsale?',
                answer: {
                    line1: 'Yes.',
                    line2: `
                        You will be able to sell up to 162% of your contribution value after the Crowdsale. Depending on which level you acheived some of your allocation maybe be locked until MainNet Launch. See the Schedules for details.
                    `,
                    line3: `
                        We already have the basis for a cross-chain OTC Marketplace available in Totem Live, and we hope it will be completed shortly after the Crowdsale. This will allow you to exchange XTX for Bitcoin, Ethereum and Dots and possibly other cryptocurrencies.
                    `,
                    line4: 'It does not preclude exchanges from listing XTX.',
                },
                render: answer => (
                    <div>
                        <p><b>{answer.line1}</b></p>
                        <p>{answer.line2}</p>
                        <p>{answer.line3}</p>
                        <p>{answer.line4}</p>                        
                    </div>
                )
            },
            {
                question: 'Are HODLers penalised?',
                answer: {
                    line1: 'Yes, no, it is contingent.',
                    line2: 'We want to encourage people to use Totem because it helps us define what the market wants. So we have a couple of rules that determine how your funds migrate to MainNet:',
                    list1: 'If you receive funds from Crowdsale, and actually use Totem, then this will cause your balance to be reduced. To make up for this you will be recompensated in MainNet with an additional bonus based on the amount of usage on top of your original allocation. This is to be decided.',
                    list1a: 'A cut-off period will come into play to determine the account activity and the amount of XTX that will be allocated on MainNet. This will be notified in advance.',
                    list2 : 'If you receive funds from Crowdsale, and do nothing, you will be allocated the same quantity of XTX on MainNet.',
                    list3: 'If you receive funds from Crowdsale, and sell some, but do no other activity in Totem you will be allocated the remaining quantity of XTX on MainNet.'
                },
                render: answer => (
                    <div>
                        <p><b>{answer.line1}</b></p>
                        <p>{answer.line2}</p>
                        <ul>
                            <li>
                                {answer.list1}
                                <ul>
                                    <li>{answer.list1a}</li>
                                </ul>
                            </li>
                            <li>{answer.list2}</li>
                            <li>{answer.list3}</li>
                        </ul>
                    </div>
                )
            },
            {
                question: 'Is this an Initial Parachain Offering?',
                answer: {
                    line1: `
                        Although Totem is part of the Polkadot Ecosystem, a so-called Initial Parachain Offering is designed to lock funds for the contributors and not the developers. This is a funding round is designed to grow the team and accelerate development towards MainNet.
                    `,
                    line2: `
                        Having said that, we will be encouraging the Polkadot Community to appraise the project against other projects in the space and invest in our parachain auction slot when the time is right. This will only be after Totem Live Accounting's MainNet launch.
                    `,
                },
                render: answer => (
                    <div>
                        <p>{answer.line1}</p>
                        <p>{answer.line2}</p>
                    </div>
                )
            },
        ],
    },
    {
        question: 'General questons',
        children: [
            {
                question: 'Can I get free tokens?',
                answer: {
                    line1: 'Yes.',
                    line2: 'A limited supply of free tokens is available from our faucet before the Crowdsale starts. There are several ways to obtain them:',
                },
                children: [
                    {
                        answer: 'If your friend signs up they will automatically receive the standard sign-up allocation plus a small bonus. You will also receive a bonus for referring.',
                        question: 'Refer a friend',
                    },
                    {
                        answer: 'Totem is designed to be used. If you use Totem for tasks, activities and timekeeping as well as payments, your account will receive an additional bonus allocation of XTX on MainNet. The more you use Totem the greater the allocation on MainNet. Remember the Developers will not be holding XTX and the idea is that the majority of XTX must be distributed to the community. So get to work!',
                        question: 'Using Totem',
                    },
                ],
                render: answer => (
                    <div>
                        <p><b>{answer.line1}</b></p>
                        <p>{answer.line2}</p>
                    </div>
                )
            },
            {
                question: 'Can I pay with Fiat?',
                answer: 'No. Only the follow cryptocurrencies are accepted:',
                render: answer => (
                    <div>
                        {answer}
                        <ul>
                            <li>Bitcoin (BTC)</li>
                            <li>Polkadot (DOT)</li>
                            <li>Ethereum (ETH)</li>
                        </ul>
                    </div>
                )
            },
            {
                question: 'Is there a maximum contribution?',
                answer: {
                    line1: 'Yes',
                    line2: 'the maximum contribution is determined by the maximum number of XTX that is available for allocation. This is known as the Crowdsale Cap.',
                    line3: 'How much is the Crowdsale Cap?',
                    line4: 'The Crowdsale Cap is equivalent to US$100M in XTX',
                },
                render: answer => (
                    <div>
                        <p><b>{answer.line1}</b></p>
                        <p>{answer.line2}</p>

                        <div>
                            <h3>{answer.line3}</h3>
                            <Text {...{
                                children: answer.line4,
                                El: 'pre',
                                invertedColor: 'black',
                                style: { background: '#f2f0f0', margin: 0, padding: 15 },
                            }} />
                        </div>
                    </div>
                )
            },
            {
                question: 'Are there any hidden benefits?',
                answer: {
                    line1: 'If you receive funds from the faucet and use these funds to work with Totem, then you will receive an allocated on MainNet and an automatic Level 8 Multiplier.',
                    line2: 'If you receive funds from the faucet and do nothing, then no matter how large your balance, no funds will be allocated on MainNet. HODLing serves no purpose in Totem as the price is deterministic.',
                    line3: 'If you receive funds from the faucet and attempt "simulate usage" for example by only transfering funds between identities you will receive zero allocations of XTX on MainNet.',
                },
                render: answer => (
                    <div>
                        <ul>
                            <li>{answer.line1}</li>
                            <li>{answer.line2}</li>
                            <li>{answer.line3}</li>
                        </ul>
                    </div>
                )
            },
            {
                question: 'Can I invest more than the Level 8 Multiplier?',
                answer: {
                    line1: 'Yes',
                    line2: 'Contact us to discuss.',
                },
                render: answer => (
                    <div>
                        <p><b>{answer.line1}</b></p>
                        <p>{answer.line2}</p>
                    </div>
                )
            },
        ],
    },
    {
        question: 'How do I contact you?',
        answer: {
            line1: 'We have a dedicated support channel already built into Totem Live.',
            line2: 'Ping us and we should respond.',
            line3A: 'Please note:',
            line3B: 'We are a small team, and we do sleep from time-to-time but you will receive a response.Keep checking back.',
        },
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
        render: answer => {
            console.log({ renderAnswer: answer })
            return (
                <div>
                    <div>{answer.line1}</div>
                    <br />
                    <div>{answer.line2}</div>
                    <br />
                    <div><b>{answer.line3A}</b> {answer.line3B}</div>
                </div>
            )
        }
    },
]

export const showFaqs = (props) => {
    const modalId = 'crowdsale-faqs'
    confirm(
        {
            cancelButton: null,
            confirmButton: null,
            ...props,
            header: props.header || textsCap.faqs,
            content: (
                <div>
                    {props.content}
                    <Accordion {...{
                        defaultActiveIndex: [questions.findIndex(({ active }) => !!active) || 0],
                        exclusive: false,
                        fluid: true,
                        panels: getPanels(questions, modalId),
                        styled: true,
                    }} />
                </div>
            ),
        },
        modalId,
        { style: { padding: 0 } },
    )
    return modalId
}
const getPanels = (questions, modalId) => questions
    .map(({ action, answer, children = [], question, render }, i) => ({
        key: `panel-${i}`,
        title: [<Text {...{
            children: question,
            color: null,
            invertedColor: 'white',
            key: 'children',
        }} />],
        content: [
            <div key='answer'>
                {isFn(render) && render(answer) || answer}
                {children.length > 0 && (
                    <Accordion.Accordion {...{
                        defaultActiveIndex: children.findIndex(({active}) => !!active) || 0,
                        panels: getPanels(children, modalId),
                        style: { margin: 0 },
                    }} />
                )}
            </div>,
            action && (
                <Button {...{
                    ...action,
                    key: 'action',
                    onClick: (...args) => {
                        isFn(action.onClick) && action.onClick(...args)
                        closeModal(modalId)
                    },
                    style: { marginTop: 15 },
                }} />
            ),
        ].filter(Boolean),
    }))



setTimeout(() => {
    // recursively translate question and answer properties
    const translateFAQs = (questions = []) => questions.forEach(entry => {
        const { answer, children = [], question } = entry
        entry.question =  translated({ question })[0].question
        if (isObj(answer)) {
            entry.answer = translated(answer)[0]
        } else {
            entry.answer = translated({ answer })[0].answer
        }
        children.length && translateFAQs(children)
    })
    translateFAQs(questions)
})
