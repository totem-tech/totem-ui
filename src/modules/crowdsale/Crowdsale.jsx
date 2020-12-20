import React, { useEffect } from 'react'
import { Button, Progress, Step } from 'semantic-ui-react'
import { isBool } from '../../utils/utils'
import Message from '../../components/Message'
import { translated } from '../../services/language'
import { showForm } from '../../services/modal'
import { iUseReducer, reducer, subjectAsPromise, usePromise, useRxSubject } from '../../services/react'
import { MOBILE, rxLayout } from '../../services/window'
import client, { rxIsLoggedIn, rxIsRegistered } from '../chat/ChatClient'
import RegistrationForm from '../chat/RegistrationForm'
import { getDeposits } from './crowdsale'
import AddressList from './AddressList'
import DepositStats from './DepositStats'
import KYCForm from './KYCForm'
import { showFaqs } from './FAQ'
import TimeSince from '../../components/TimeSince'

const START_BLOCK = 1787748
const END_BLOCK = 9999
const textsCap = translated({
    crowdsaleFAQ: 'crowdsale FAQ',
    loading: 'loading',
    loginRequired: 'you must be logged in and online to access this section',
    stepAccountDesc: 'create an account so that you can continue with the crowdsale registration',
    stepAccountTitle: 'create account',
    stepDepositDesc: 'contibute to the crowdsale by depositing funds using one or more of your chosen Blockchains',
    stepDepositTitle: 'deposit funds',
    stepKYCTitle: 'register for crowdsale',
    stepUnlockDesc: 'you will be able to unlock equivalent to three times the total contribution amount as soon as crowdsale ends',
    stepUnlockTitle: 'withdraw',
}, true)[1]

export default function () {
    // checks if user is registered
    const [isRegistered] = usePromise(async () => await subjectAsPromise(rxIsRegistered, true)[0])
    // waits until user is logged in for the first time after page load
    // will not update if user goes offline and messaging service disconnects
    const [isLoggedIn] = usePromise(async () => await subjectAsPromise(rxIsLoggedIn, true)[0])
    const [isMobile] = useRxSubject(rxLayout, l => l === MOBILE)
    // whether crowdsale is currently active
    const [isActive, isDone] = [false, false] // use block number to determine active
    const [state, setState] = iUseReducer(reducer, {
        kycDone: false,
        loading: true,
        totalRaisedUSD: 0,
        softCapUSD: 2500000, // 2.5 mil
        targetCapUSD: 10000000, // 10 mil
    })

    // on load check if KYC is done and if yes retrieve deposits/balances
    useEffect(() => {        
        isLoggedIn && !state.kycDone && (async () => {
            let newState = {}
            try {
                // check if KYC done
                const kycDone = await client.crowdsaleKYC.promise(true)
                // retrieve any existing amounts deposited
                const { deposits = {}, lastChecked } = (kycDone && await getDeposits()) || {}
                newState = {
                    ...state,
                    deposits,
                    kycDone,
                    lastChecked,
                    message: null, 
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
            newState.loading = false
            setState(newState)
        })()
        
    }, [isLoggedIn])

    const targetCapReached = state.targetCapUSD <= state.totalRaisedUSD
    const softCapReached = state.softCapUSD <= state.totalRaisedUSD
    let stepContent = ''
    const activeIndex = !isRegistered
        ? 0
        : !isLoggedIn || state.loading || !!state.message
            ? -1
            : !state.kycDone
                ? 1
                : !isDone
                    ? 2
                    : 3
    const showProgress = activeIndex >= 0
    const progressSteps = showProgress && [
        {
            title: textsCap.stepAccountTitle,
            description: textsCap.stepAccountDesc,
        },
        {
            description: '',
            title: textsCap.stepKYCTitle,
        },
        {
            description: textsCap.stepDepositDesc,
            title: textsCap.stepDepositTitle,
        },
        {
            description: textsCap.stepUnlockDesc,
            title: textsCap.stepUnlockTitle,
        },
    ].map((x, i) => ({
        active: activeIndex === i, 
        completed: i < activeIndex,
        description: null,
        disabled: activeIndex !== i,
        key: i,
        style: { maxWidth: isMobile ? null : 450 },
        title: (
            <div className='title' style={{ textTransform: 'capitalize' }}>
                {x.title}
            </div>
        )
    }))

    switch (activeIndex) {
        case -1:
            const isLoading = state.loading || isLoggedIn === null
            const msgProps = state.message || {
                header: isLoading
                    ? textsCap.loading
                    : textsCap.loginRequired,
                icon: true,
                status: isLoading
                    ? 'loading'
                    : 'error',
            }
            stepContent = <Message {...msgProps} />
            break
        case 0: 
            stepContent = getInlineForm(RegistrationForm)
            break
        case 1: 
            stepContent = getInlineForm(KYCForm, {
                onSubmit: kycDone => kycDone && setState({ kycDone }),
                style: { maxWidth: 400 },
            })
            break
        case 2:
        case 3:
            stepContent = <AddressList />
            break
    }
        
    return (
        <div>
            {!isDone && (
                <div style={{ width: '100%', textAlign: 'center' }}>
                    <h1>
                        {isDone
                            ? 'Crowdsale is now over!'
                            : !isActive
                                ? 'Crowdsale starts in'
                                : 'Crowdsale ends in'}
                    </h1>
                    <TimeSince {...{
                        asDuration: true,
                        date: new Date('2021-01-20T00:00:00'),
                        durationConfig: {
                            fill: false, // fills with 0 if length is less that 2
                            statisticProps: {
                                color: isActive
                                    ? 'yellow'
                                    : 'green',
                            },
                            withSeconds: !isMobile,
                        },
                    }} />

                    {isActive && !!state.totalRaisedUSD && (
                        <Progress {...{
                            color: targetCapReached
                                ? 'green'
                                : softCapReached
                                    ? 'teal'
                                    : undefined,
                            label: `US$${state.totalRaisedUSD} raised`
                                + (
                                    targetCapReached 
                                        ? ' | Target cap reached!'
                                        : softCapReached
                                            ? ' | Soft cap reached!'
                                            : ''
                                ),
                            progress: 'percent',
                            total: state.targetCapUSD,
                            value: state.totalRaisedUSD,
                        }} />
                    )}
                </div>
            )}
            {state.kycDone && (
                <Button {...{
                    content: textsCap.crowdsaleFAQ,
                    fluid: isMobile,
                    icon: 'question',
                    onClick: () => showFaqs(),
                }} />
            )}
            {showProgress && (
                <Step.Group {...{
                    items: progressSteps,
                    fluid: true,
                    ordered: true,
                    stackable: 'tablet',
                    style: {
                        maxWidth: '100%',
                        overflowX: 'auto',
                    },
                }} />
            )}

            {state.kycDone && <DepositStats />}
            {stepContent}
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