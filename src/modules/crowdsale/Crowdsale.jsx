import React, { useEffect } from 'react'
import { Button, Icon, Step } from 'semantic-ui-react'
import DataTable from '../../components/DataTable'
import Text from '../../components/Text'
import Message from '../../components/Message'
import { translated } from '../../services/language'
import { confirm, showForm } from '../../services/modal'
import { iUseReducer, reducer, subjectAsPromise, usePromise, useRxSubject } from '../../services/react'
import { MOBILE, rxLayout } from '../../services/window'
import client, { rxIsLoggedIn, rxIsRegistered } from '../chat/ChatClient'
import RegistrationForm from '../chat/RegistrationForm'
import {
    BLOCKCHAINS,
    calculateAllocation,
    calculateToNextLevel,
    crowdsaleData,
    ENTRY_NEGOTIATE_XTX,
    getDeposits,
    rxCrowdsaleData,
} from './crowdsale'
import DAAForm from './DAAForm'
import KYCForm from './KYCForm'
import KYCViewForm from './KYCViewForm'
import CalculatorForm from './CalculatorForm'
import { Currency } from '../../components/Currency'
import { currencyDefault } from '../../services/currency'
import LabelCopy from '../../components/LabelCopy'
import AddressList from './AddressList'
import { showFaqs } from './FAQ'

const textsCap = translated({
    achieved: 'achieved!',
    amountDeposited: 'amount deposited',
    blockchain: 'blockchain',
    calculator: 'calculator',
    checkDepositStatus: 'check deposit status',
    despositAddress: 'pay to address',
    level: 'level',
    loadingMsg: 'loading',
    loginRequired: 'you must be logged in and online to access this section',
    multiplierLevel: 'multiplier level',
    multiplierHighest: 'highest multiplier level',
    registrationRequired: 'please complete the getting started steps',
    requestBtnTxt: 'request address',
    stepMsgContributed: 'you contributed value equivalent to',
    stepMsgAllocation: 'your total crowdsale allocation will be',
    stepMsgLevel: 'Yeey! You have reached the last level. Contact us for a special bonus if you would like to invest more than',
    stepMsgToNextLevel: 'contribution required to reach next level',
    successMsg: `
        Fantastic! You have now been registered for the Totem Live Association crowdsale.
        You are now ready to deposit funds using any of your chosen Blockchains.
    `,
    successEndingMsg: 'Click close to view your pay to addresses.',
    successNote0: 'Here are answers to a few frequently asked questions:',
    successNote1: 'You can deposit as many times as you wish to any of your pay to addresses',
    successNote2: 'The number of tokens you receive on the MainNet will be based on the sum of all funds deposited across all supported Blockchains',
    successNote3: 'The more you depost the higher level of multiplier will be unlocked for you',
    successNote4: 'Each higher level of multiplier will get you more bonus tokens than the predecessors',
    successNote5: 'The tokens you recieve will be locked until the end of the crowdsale',
    successNote6: 'You will be able to unlock some of tokens soon after the crowdsale',
    successNote7: 'You will be able to unlocked your bonus tokens when the MainNet launches',
    successNote8: 'MOST IMPORTANTLY, remember to come back once you have made your deposits and the transaction received required confirmations for the respective Blockchain and check your deposit status to avoid delays',
    successNote9: 'If you are in doubt, feel free to contact us the support chat channel which can be found by clicking on the chat icon in the header bar (desktop) or footer bar (mobile)',
    viewCrowdsaleData: 'view crowdsale data',
    viewNotes: 'FAQs',
}, true)[1]

export default function () {
    // checks if user is registered
    const [isRegistered] = usePromise(async () => await subjectAsPromise(rxIsRegistered, true)[0])
    // waits until user is logged in for the first time after page load
    // will not update if user goes offline and messaging service disconnects
    const [isLoggedIn] = usePromise(async () => await subjectAsPromise(rxIsLoggedIn, true)[0])
    const [isMobile] = useRxSubject(rxLayout, l => l === MOBILE)
    const [state, setState] = iUseReducer(reducer, {
        kycDone: false,
        loading: true,
        steps: [],
    })

    useEffect(() => {        
        isLoggedIn && !state.kycDone && (async () => {
            let newState = {}
            try {
                // check if KYC done
                const kycDone = await client.crowdsaleKYC.promise(true)
                const deposits = await getDeposits()
                // retrieve any existing amounts deposited
                const steps = await getSteps(deposits, isMobile)
                newState = {
                    ...state,
                    deposits,
                    kycDone,
                    message: null, 
                    steps,
                }
            } catch (err) {
                console.trace(err)
                newState = {
                    message: {
                        content: `${err}`,
                        icon: true,
                        status: 'error',
                    }
                }
            }
            setState({ ...newState, loading: false })
        })()
        
    }, [isLoggedIn])

    if (!isRegistered) return getInlineForm(RegistrationForm, {})

    if (!isLoggedIn || state.loading) {
        const isLoading = state.loading || isLoggedIn === null
        return (
            <Message {...{
                header: isLoading
                    ? textsCap.loadingMsg
                    : textsCap.loginRequired,
                icon: true,
                status: isLoading
                    ? 'loading'
                    : 'error',
            }} />
        )
    }

    // show inline KYC form
    if (!state.kycDone) return getInlineForm(KYCForm, {
        onSubmit: kycDone => {
            if (!kycDone) return
            setState({ kycDone })
            showFaqs({ content: textsCap.successMsg })
        },
        style: { maxWidth: 400 },
    })
    
    return (
        <div>
            <Step.Group fluid stackable='tablet' items={state.steps}/>
            <AddressList />
        </div>
    )
}

const getInlineForm = (Form, props) => (
    <div>
        <h3>{Form.defaultProps.header}</h3>
        <h4 style={{ color: 'grey', marginTop: 0 }}>
            {Form.defaultProps.subheader}
        </h4>
        <Form {...props} />
    </div>
)

const getSteps = async (deposits = {}, isMobile = false) => {
    const lastLevel = 8
    const maxLevels = 3
    const [
        amtDepositedXTX = 0,
        amtMultipliedXTX = 0,
        currentLevel = 0,
        multiplier,
    ] = await calculateAllocation(deposits)
    const [amtXTXToNextLevel] = await calculateToNextLevel('XTX', amtDepositedXTX)
    let showIndicator = false
    let startLevel = currentLevel + maxLevels - 1 > lastLevel
        ? lastLevel - maxLevels + 1
        : currentLevel

    const indexes = new Array(maxLevels)
        .fill(0)
        .map((_, i) => i + startLevel)

    if (!indexes.includes(lastLevel)) {
        showIndicator = true
        indexes[indexes.length - 1] = lastLevel
    }

    return indexes.map(level => {
        const isCurrent = level === currentLevel
        const isLast = currentLevel === lastLevel && level === lastLevel
        const isLevel0 = level === 0

        return {
            active: level === currentLevel,
            disabled: !isCurrent,
            level,
            key: level,
            title: isCurrent && (
                <h1>
                    {isLast
                        ? textsCap.multiplierHighest
                        : `${textsCap.multiplierLevel} ${level}`
                    }
                    {level > 0 && ' ' + textsCap.achieved}
                </h1>
            ),
            description: (
                <div>
                    {!isCurrent && (
                        <h1 style={styles.stepIndex}>
                            {textsCap.level} {level}
                        </h1>
                    )}
                    {isCurrent && (
                        <div>
                            {!isLevel0 && (
                                <h4 style={styles.stepHeader4}>
                                    <Currency {...{
                                        prefix: `${textsCap.stepMsgContributed} `,
                                        value: amtDepositedXTX,
                                    }} />
                                </h4>
                            )}
                            {!isLevel0 && (
                                <Text {...{
                                    El: 'h3',
                                    style: styles.stepHeader3,
                                }}>
                                    <Currency {...{
                                        prefix: `${textsCap.stepMsgAllocation} `,
                                        value: amtMultipliedXTX,
                                    }} />
                                </Text>
                            )}
                            <h4 style={styles.stepHeader4}>
                                {isLast && (
                                    <Currency {...{
                                        prefix: `${textsCap.stepMsgLevel} `,
                                        value: ENTRY_NEGOTIATE_XTX,
                                    }} />
                                )}
                                {/* {isLast && `${textsCap.stepMsgLevel} ${ENTRY_NEGOTIATE_XTX} XTX!`} */}
                                <Currency {...{
                                    prefix: `${isLast ? textsCap.stepMsgLevel : textsCap.stepMsgToNextLevel}: `,
                                    unit: currencyDefault,
                                    value: isLast ? ENTRY_NEGOTIATE_XTX : amtXTXToNextLevel,
                                }} />
                            </h4>
                        </div>
                    )}
                    {showIndicator && level === lastLevel && (
                        <div style={{
                            ...styles.lastLevelIndicator,
                            // create styles.css
                            ...(isMobile ? styles.lastLevelIndicatorMobile : {})
                        }}>~</div>
                    )}
                </div>
            ),
        }
    })
}

const styles = {
    lastLevelIndicator: {
        position: 'absolute',
        left: -9,
        top: '43%',
        zIndex: 9999,
        fontSize: '200%',
    },
    lastLevelIndicatorMobile: {
        left: '48%',
        top: -9,
        transform: 'rotate(-90deg)',
    },
    stepHeader3: { margin: 0 },
    stepHeader4: { color: 'grey', margin: 0 },
    stepIndex: {
        fontSize: '300%',
        margin: 0,
    },
    stepTitle: {
        fontSize: '150%',
        textTransform: 'capitalize',
    },
}